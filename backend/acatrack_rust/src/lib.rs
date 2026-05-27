use once_cell::sync::Lazy;
use pdfsink_rs::{PdfDocument, TableSettings, TableStrategy};
use pyo3::prelude::*;
use rayon::prelude::*;
use regex::Regex;
use std::collections::HashMap;

// ── Compiled regexes ──────────────────────────────────────────────────────────

static RE_USN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)(?:University Seat Number\s*:|USN\s*:)\s*(\S+)").unwrap()
});
static RE_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)Student Name\s*:\s*(.+)").unwrap()
});
static RE_SEM: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)Semester\s*:\s*(\S+)").unwrap()
});
// VTU subject code pattern — covers all schemes (2018, 2021, 2022, 2024+)
static RE_VTU_CODE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"^(?:[0-9]{2}[A-Z]{2,4}[0-9]{2,3}[A-Z]?|B[A-Z]{2,5}[0-9]{3}[A-Z]?)$").unwrap()
});

// ── Internal record type ──────────────────────────────────────────────────────

#[derive(Debug, Default)]
struct StudentRecord {
    usn: Option<String>,
    name: Option<String>,
    semester: Option<String>,
    /// subject_code -> (internal_marks, external_marks)
    marks: HashMap<String, (u32, u32)>,
    logs: Vec<String>,
}

/// If a table cell has multiple lines separated by '\n', this means the table extractor
/// has merged visually stacked rows into a single logical row.
/// This splits such a stacked row into a vector of aligned "virtual" rows.
fn split_stacked_row(row: &[Option<String>]) -> Vec<Vec<Option<String>>> {
    // 1. Split each cell by '\n' into a list of lines
    let cell_lines: Vec<Vec<String>> = row.iter()
        .map(|cell| {
            match cell.as_deref() {
                Some(s) => s.lines().map(|line| line.trim().to_string()).collect(),
                None => Vec::new(),
            }
        })
        .collect();

    // 2. Find the maximum number of lines in any cell
    let max_lines = cell_lines.iter().map(|lines| lines.len()).max().unwrap_or(0);
    if max_lines <= 1 {
        // Not a stacked row, return the row unchanged (wrapped in a vector)
        return vec![row.to_vec()];
    }

    // 3. Reconstruct virtual rows by taking the i-th line from each cell
    let mut virtual_rows = Vec::new();
    for line_idx in 0..max_lines {
        let mut virtual_row = Vec::new();
        for lines in &cell_lines {
            if line_idx < lines.len() {
                let val = lines[line_idx].clone();
                if val.is_empty() {
                    virtual_row.push(None);
                } else {
                    virtual_row.push(Some(val));
                }
            } else {
                virtual_row.push(None);
            }
        }
        virtual_rows.push(virtual_row);
    }

    virtual_rows
}

// ── Core parser — uses pdfsink-rs table extraction ───────────────────────────

fn parse_pdf_to_record(pdf_path: &str, subject_codes: &[String]) -> StudentRecord {
    let mut record = StudentRecord::default();

    let pdf = match PdfDocument::open(pdf_path) {
        Ok(p) => p,
        Err(e) => {
            record.logs.push(format!("Failed to open PDF at {}: {:?}", pdf_path, e));
            return record;
        }
    };
    record.logs.push(format!("Successfully opened PDF at {}", pdf_path));

    // Build a fast lookup set of uppercase codes
    let code_set: std::collections::HashSet<String> =
        subject_codes.iter().map(|s| s.to_uppercase()).collect();

    // ── Extract header fields from full-document text ──────────────────────
    // Use document-level extract_text for USN / Name / Semester (in header).
    let full_text = pdf.extract_text();
    record.logs.push(format!("Extracted full document text length: {} chars", full_text.len()));

    if let Some(cap) = RE_USN.captures(&full_text) {
        let usn = cap[1].trim().to_string();
        record.logs.push(format!("Regex detected USN: {}", usn));
        record.usn = Some(usn);
    } else {
        record.logs.push("Regex FAILED to detect USN".to_string());
    }

    if let Some(cap) = RE_NAME.captures(&full_text) {
        let name = cap[1].trim().to_string();
        record.logs.push(format!("Regex detected Name: {}", name));
        record.name = Some(name);
    } else {
        record.logs.push("Regex FAILED to detect Name".to_string());
    }

    if let Some(cap) = RE_SEM.captures(&full_text) {
        let sem = cap[1].trim().to_string();
        record.logs.push(format!("Regex detected Semester: {}", sem));
        record.semester = Some(sem);
    } else {
        record.logs.push("Regex FAILED to detect Semester".to_string());
    }

    // ── Extract marks via table extraction across all pages ────────────────
    // Try "text" strategy first (alignment-based, same as pdfplumber default).
    // Fall back to "lines" strategy (border-based), then plain text line parsing.
    let text_settings = TableSettings {
        vertical_strategy: TableStrategy::Text,
        horizontal_strategy: TableStrategy::Text,
        ..TableSettings::default()
    };
    let lines_settings = TableSettings {
        vertical_strategy: TableStrategy::Lines,
        horizontal_strategy: TableStrategy::Lines,
        ..TableSettings::default()
    };

    for (page_idx, page) in pdf.pages.iter().enumerate() {
        // Try "text" strategy (pdfplumber default — alignment based)
        let table = page.extract_table(text_settings.clone())
            .ok()
            .flatten()
            .or_else(|| {
                // Fall back to "lines" strategy (drawn borders)
                page.extract_table(lines_settings.clone()).ok().flatten()
            });

        match &table {
            Some(t) => {
                let msg = format!(
                    "Page {} — table found: {} rows × {} cols",
                    page_idx + 1, t.len(),
                    t.first().map(|r| r.len()).unwrap_or(0)
                );
                eprintln!("[pdfsink DEBUG] {}", msg);
                record.logs.push(msg);
            }
            None => {
                let msg = format!("Page {} — no table, falling back to text lines", page_idx + 1);
                eprintln!("[pdfsink DEBUG] {}", msg);
                record.logs.push(msg);
            }
        }

        let table = match table {
            Some(t) => t,
            None => {
                parse_text_lines(&page.extract_text(), &code_set, &mut record);
                continue;
            }
        };

        for row in &table {
            let row_cells: Vec<String> = row.iter()
                .map(|c| c.as_deref().unwrap_or("").to_string())
                .collect();
            record.logs.push(format!("Processing logical row cells: {:?}", row_cells));

            let virtual_rows = split_stacked_row(row);
            if virtual_rows.len() > 1 {
                record.logs.push(format!("Split stacked row into {} virtual rows", virtual_rows.len()));
            }

            for v_row in &virtual_rows {
                let v_row_cells: Vec<String> = v_row.iter()
                    .map(|c| c.as_deref().unwrap_or("").to_string())
                    .collect();
                record.logs.push(format!("  Virtual row cells: {:?}", v_row_cells));

                let row_str = v_row.iter()
                    .map(|c| c.as_deref().unwrap_or(""))
                    .collect::<Vec<&str>>()
                    .join(" ")
                    .to_uppercase();

                // Count how many target codes are in this row string
                let mut row_codes = Vec::new();
                for code in &code_set {
                    if row_str.contains(code.as_str()) {
                        row_codes.push(code);
                    }
                }

                if row_codes.is_empty() {
                    record.logs.push(format!("  Skipping virtual row (no target subject codes in: {})", row_str));
                    continue;
                }

                record.logs.push(format!("  Target subject codes found in row: {:?}", row_codes));

                if row_codes.len() == 1 {
                    // Exactly one target code in the row — try clean column approach first
                    let target_code = row_codes[0];
                    let mut found_idx = None;
                    for (idx, cell) in v_row.iter().enumerate() {
                        if let Some(cell_text) = cell.as_deref() {
                            if cell_text.to_uppercase().contains(target_code.as_str()) {
                                found_idx = Some(idx);
                                break;
                            }
                        }
                    }

                    let mut nums = Vec::new();
                    if let Some(code_idx) = found_idx {
                        for cell in &v_row[code_idx + 1..] {
                            let s = match cell.as_deref() {
                                Some(s) => s.trim().to_uppercase(),
                                None => continue,
                            };
                            if let Ok(n) = s.parse::<u32>() {
                                nums.push(n);
                            } else if s == "AB" || s == "ABS" || s == "ABSENT" {
                                nums.push(0);
                            }
                        }
                    }

                    if nums.len() >= 2 {
                        let msg = format!("  [row-clean SUCCESS] {} → IA={} SEE={}", target_code, nums[0], nums[1]);
                        eprintln!("[pdfsink DEBUG] {}", msg);
                        record.logs.push(msg);
                        record.marks.insert(target_code.to_string(), (nums[0], nums[1]));
                        continue; // successfully processed this virtual row using column approach
                    } else {
                        record.logs.push(format!("  [row-clean FAILED] Clean column scan failed for {} (found index {:?}, parsed numbers: {:?})", target_code, found_idx, nums));
                    }
                }

                // Fallback or multi-code row: use the flat token scanner on the joined row text
                record.logs.push(format!("  [row-scan FALLBACK] Running token scanner on row text: '{}'", row_str));
                parse_text_lines(&row_str, &code_set, &mut record);
            }
        }
    }

    record
}

/// Global token scan: tokenize the ENTIRE text as one flat stream.
/// When a VTU code is found, grab numbers that follow before the next code.
/// This bypasses all PDF text-layout reconstruction issues — no line boundaries needed.
fn parse_text_lines(
    text: &str,
    code_set: &std::collections::HashSet<String>,
    record: &mut StudentRecord,
) {
    let tokens: Vec<&str> = text.split_whitespace().collect();
    let n = tokens.len();
    let mut i = 0;

    while i < n {
        // Strip punctuation wrappers (e.g. "(BMATS101)" → "BMATS101")
        let raw = tokens[i].trim_matches(|c: char| !c.is_alphanumeric());
        let upper = raw.to_uppercase();

        if code_set.contains(&upper) {
            // Found a subject code — collect numbers that follow
            let code = upper.clone();
            let mut nums: Vec<u32> = Vec::new();
            let mut skip_words = 0;
            let mut j = i + 1;

            while j < n && nums.len() < 3 {
                let t = tokens[j].trim_matches(|c: char| !c.is_alphanumeric()).to_uppercase();

                if let Ok(v) = t.parse::<u32>() {
                    nums.push(v);
                    skip_words = 0; // reset word skip counter on each number found
                } else if t == "AB" || t == "ABS" || t == "ABSENT" {
                    nums.push(0);
                    skip_words = 0;
                } else if code_set.contains(&t) || RE_VTU_CODE.is_match(&t) {
                    // Hit the NEXT subject code — stop looking for this code's marks
                    break;
                } else {
                    skip_words += 1;
                    if skip_words > 25 {
                        // Too many non-numeric tokens → likely no marks found, give up
                        break;
                    }
                }
                j += 1;
            }

            if nums.len() >= 2 {
                let msg = format!("    [text-scan SUCCESS] {} → IA={} SEE={}", code, nums[0], nums[1]);
                eprintln!("[pdfsink DEBUG] {}", msg);
                record.logs.push(msg);
                record.marks.insert(code, (nums[0], nums[1]));
            } else {
                let msg = format!("    [text-scan FAILED] {} failed to parse at least 2 numbers (parsed: {:?})", code, nums);
                eprintln!("[pdfsink DEBUG] {}", msg);
                record.logs.push(msg);
            }

            i = j; // jump past what we consumed
        } else {
            i += 1;
        }
    }
}

// ── PyO3 module ───────────────────────────────────────────────────────────────

/// High-performance PDF parser for AcaTrack, compiled from Rust.
/// Uses pdfsink-rs table extraction + Rayon parallel processing.
#[pymodule]
mod acatrack_rust {
    use super::*;

    /// Parse a single VTU result PDF via table extraction.
    /// Returns None if the file cannot be read or contains no USN.
    #[pyfunction]
    pub fn parse_single_pdf(
        pdf_path: String,
        subject_codes: Vec<String>,
    ) -> Option<HashMap<String, Py<PyAny>>> {
        Python::attach(|py| {
            let record = parse_pdf_to_record(&pdf_path, &subject_codes);
            record_to_pydict(py, record, &subject_codes)
        })
    }

    /// Parse every PDF path in parallel using Rayon.
    /// GIL is released for the full parallel phase.
    #[pyfunction]
    pub fn parse_pdfs_parallel(
        py: Python<'_>,
        pdf_paths: Vec<String>,
        subject_codes: Vec<String>,
    ) -> Vec<Option<HashMap<String, Py<PyAny>>>> {
        let records: Vec<StudentRecord> = py.detach(|| {
            pdf_paths
                .par_iter()
                .map(|path| parse_pdf_to_record(path, &subject_codes))
                .collect()
        });

        records
            .into_iter()
            .map(|rec| Python::attach(|py| record_to_pydict(py, rec, &subject_codes)))
            .collect()
    }

    // Keep the text-based API for compatibility (used by scan/debug paths)
    #[pyfunction]
    pub fn parse_texts_parallel(
        py: Python<'_>,
        texts: Vec<String>,
        subject_codes: Vec<String>,
    ) -> Vec<Option<HashMap<String, Py<PyAny>>>> {
        let code_set: std::collections::HashSet<String> =
            subject_codes.iter().map(|s| s.to_uppercase()).collect();

        let records: Vec<StudentRecord> = py.detach(|| {
            texts
                .par_iter()
                .map(|text| {
                    let mut rec = StudentRecord::default();
                    if let Some(cap) = RE_USN.captures(text) {
                        rec.usn = Some(cap[1].trim().to_string());
                    }
                    if let Some(cap) = RE_NAME.captures(text) {
                        rec.name = Some(cap[1].trim().to_string());
                    }
                    if let Some(cap) = RE_SEM.captures(text) {
                        rec.semester = Some(cap[1].trim().to_string());
                    }
                    parse_text_lines(text, &code_set, &mut rec);
                    rec
                })
                .collect()
        });

        records
            .into_iter()
            .map(|rec| Python::attach(|py| record_to_pydict(py, rec, &subject_codes)))
            .collect()
    }
}

// ── Helper: Rust record → Python dict ────────────────────────────────────────

fn record_to_pydict(
    py: Python<'_>,
    record: StudentRecord,
    subject_codes: &[String],
) -> Option<HashMap<String, Py<PyAny>>> {
    record.usn.as_ref()?;

    let mut map: HashMap<String, Py<PyAny>> = HashMap::new();
    map.insert("student_usn".into(), record.usn.into_pyobject(py).unwrap().into_any().unbind());
    map.insert("student_name".into(), record.name.into_pyobject(py).unwrap().into_any().unbind());
    map.insert("SEMESTER".into(), record.semester.into_pyobject(py).unwrap().into_any().unbind());

    for code in subject_codes {
        if let Some((ia, ext)) = record.marks.get(code) {
            map.insert(format!("{}_INTERNALS", code), ia.into_pyobject(py).unwrap().into_any().unbind());
            map.insert(format!("{}_EXTERNALS", code), ext.into_pyobject(py).unwrap().into_any().unbind());
        } else {
            map.insert(format!("{}_INTERNALS", code), py.None());
            map.insert(format!("{}_EXTERNALS", code), py.None());
        }
    }

    map.insert("logs".into(), record.logs.into_pyobject(py).unwrap().into_any().unbind());

    Some(map)
}
