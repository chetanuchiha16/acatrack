// nlp.ts
// NLP logic using regex for the student chatbot

/**
 * All recognized chatbot intent identifiers.
 */
export type Intent =
  | "list_students"
  | "fetch_report"
  | "check_backlogs"
  | "download_pdf"
  | "ai_summary"
  | "unknown";

/**
 * Intent patterns map — each entry matches one or more regex patterns.
 * Kept internal; consumers use `detectIntent()` instead.
 */
const intentPatterns: Record<Intent, RegExp> = {
  list_students:  /\b(list|show all|students|show)\b/i,
  fetch_report:   /\b(report|show|get|reports)\b/i,
  check_backlogs: /\b(backlog|pending|failed subjects|backlog reports?)\b/i,
  download_pdf:   /\b(download|pdf|export)\b/i,
  ai_summary:     /\b(ai summary|summary|overview|profile)\b/i,
  unknown:        /(?!)/,   // never matches — serves as an exhaustive fallback
};

/**
 * Detect the primary intent from user input.
 * Uses explicit keyword checks first (fast path), then falls back
 * to the regex map for more flexible matching.
 *
 * @example detectIntent("list all students") → "list_students"
 * @example detectIntent("download my pdf") → "download_pdf"
 * @example detectIntent("hello!") → "unknown"
 */
export function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();

  if (lower.includes("list"))                          return "list_students";
  if (lower.includes("backlog") || lower.includes("arrear")) return "check_backlogs";
  if (lower.includes("ai summary") || lower.includes("insight")) return "ai_summary";
  if (lower.includes("download"))                      return "download_pdf";

  // Regex fallback
  for (const [intent, pattern] of Object.entries(intentPatterns) as [Intent, RegExp][]) {
    if (intent !== "unknown" && pattern.test(lower)) return intent;
  }

  return "unknown";
}

/**
 * Extract a student name from user input by stripping known intent keywords.
 * Returns null if nothing meaningful remains.
 *
 * @example extractStudentName("show report for john doe") → "John Doe"
 */
export function extractStudentName(input: string): string | null {
  let cleaned = input.toLowerCase();

  // Strip all intent keywords
  for (const [intent, pattern] of Object.entries(intentPatterns) as [Intent, RegExp][]) {
    if (intent !== "unknown") cleaned = cleaned.replace(pattern, "");
  }

  const name = cleaned
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return name || null;
}

/**
 * Extract a semester tag from user input.
 * Matches "sem3", "semester 3", "sem 5", etc.
 *
 * @example extractSemester("sem3 results") → "sem3"
 * @example extractSemester("no semester here") → null
 */
export function extractSemester(input: string): string | null {
  const semMatch = input.match(/\bsem(?:ester)?\s*(\d+)\b/i);
  return semMatch ? `sem${semMatch[1]}` : null;
}

/**
 * Returns true if the input is a backlog/pending/failed subject query.
 */
export function isBacklogRequest(input: string): boolean {
  return intentPatterns.check_backlogs.test(input);
}

/**
 * Returns true if the input requests an AI summary or profile.
 */
export function isAiSummaryRequest(input: string): boolean {
  return intentPatterns.ai_summary.test(input);
}
