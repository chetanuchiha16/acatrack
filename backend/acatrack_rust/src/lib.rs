use once_cell::sync::Lazy;
use pyo3::prelude::*;
use rayon::prelude::*;
use regex::Regex;
use std::collections::HashMap;

// ── Compiled regexes (compiled once at startup, shared across all threads) ────

static RE_USN: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)(?:University Seat Number\s*:|USN\s*:)\s*(\S+)").unwrap()
});
static RE_NAME: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)Student Name\s*:\s*(.+)").unwrap()
});
static RE_SEM: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?i)Semester\s*:\s*(\S+)").unwrap()
});

// ── Internal data type returned from each worker thread ───────────────────────

#[derive(Debug, Default)]
struct StudentRecord {
    usn: Option<String>,
    name: Option<String>,
    semester: Option<String>,
    /// subject_code -> (internal_marks, external_marks)
    marks: HashMap<String, (u32, u32)>,
}

// ── Core single-file parsing (pure Rust, no GIL required) ─────────────────────

fn parse_pdf_to_record(pdf_path: &str, subject_codes: &[String]) -> StudentRecord {
    let mut record = StudentRecord::default();

    // pdf-extract returns a Result<String>; silently skip corrupt files
    let text = match pdf_extract::extract_text(pdf_path) {
        Ok(t) => t,
        Err(_) => return record,
    };

    // --- header fields ---
    if let Some(cap) = RE_USN.captures(&text) {
        record.usn = Some(cap[1].trim().to_string());
    }
    if let Some(cap) = RE_NAME.captures(&text) {
        record.name = Some(cap[1].trim().to_string());
    }
    if let Some(cap) = RE_SEM.captures(&text) {
        record.semester = Some(cap[1].trim().to_string());
    }

    // --- per-subject mark lines ---
    // Expected line format (space-separated):
    //   <CODE>  <internal>  <external>  <total>  [<grade>  <result>  ...]
    for line in text.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 4 {
            continue;
        }
        let code = parts[0];
        if !subject_codes.iter().any(|c| c == code) {
            continue;
        }

        let numbers: Vec<u32> = parts[1..]
            .iter()
            .filter_map(|p| p.parse::<u32>().ok())
            .collect();

        if numbers.len() >= 2 {
            // numbers[0] = internal, numbers[1] = external
            record.marks.insert(code.to_string(), (numbers[0], numbers[1]));
        }
    }

    record
}

// ── PyO3 module (modern declarative block — no manual m.add_function calls) ───

/// High-performance PDF parser for AcaTrack, compiled from Rust.
/// Uses Rayon for true OS-thread parallelism after releasing the Python GIL.
#[pymodule]
mod acatrack_rust {
    use super::*;

    /// Parse a single VTU result PDF and return a dict of student data.
    ///
    /// Returns ``None`` if the file cannot be read or contains no USN.
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

    /// Parse every PDF path in **parallel** using Rayon and return a list of dicts.
    ///
    /// The Python GIL is released for the entire parallel phase so that other
    /// Python threads (e.g. FastAPI's event loop) remain completely unblocked.
    /// Each ``None`` entry in the result means that PDF failed or had no USN.
    #[pyfunction]
    pub fn parse_pdfs_parallel(
        py: Python<'_>,
        pdf_paths: Vec<String>,
        subject_codes: Vec<String>,
    ) -> Vec<Option<HashMap<String, Py<PyAny>>>> {
        // Release the GIL — pure Rust + Rayon runs here, no Python objects touched
        let records: Vec<StudentRecord> = py.detach(|| {
            pdf_paths
                .par_iter()
                .map(|path| parse_pdf_to_record(path, &subject_codes))
                .collect()
        });

        // Re-acquire the GIL to convert Rust structs → Python dicts
        records
            .into_iter()
            .map(|rec| {
                Python::attach(|py| record_to_pydict(py, rec, &subject_codes))
            })
            .collect()
    }
}

// ── Helper: convert a StudentRecord into a Python-compatible HashMap ──────────

fn record_to_pydict(
    py: Python<'_>,
    record: StudentRecord,
    subject_codes: &[String],
) -> Option<HashMap<String, Py<PyAny>>> {
    // Skip records with no USN — they are unidentifiable
    record.usn.as_ref()?;

    let mut map: HashMap<String, Py<PyAny>> = HashMap::new();

    map.insert("student_usn".into(), record.usn.into_pyobject(py).unwrap().into_any().unbind());
    map.insert("student_name".into(), record.name.into_pyobject(py).unwrap().into_any().unbind());
    map.insert("SEMESTER".into(), record.semester.into_pyobject(py).unwrap().into_any().unbind());

    for code in subject_codes {
        if let Some((internal, external)) = record.marks.get(code) {
            map.insert(
                format!("{}_INTERNALS", code),
                internal.into_pyobject(py).unwrap().into_any().unbind(),
            );
            map.insert(
                format!("{}_EXTERNALS", code),
                external.into_pyobject(py).unwrap().into_any().unbind(),
            );
        } else {
            map.insert(format!("{}_INTERNALS", code), py.None());
            map.insert(format!("{}_EXTERNALS", code), py.None());
        }
    }

    Some(map)
}
