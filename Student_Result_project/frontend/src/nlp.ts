// nlp.ts
// NLP logic using regex for the student chatbot

/**
 * Define intents and associated regex patterns
 */
const intentPatterns: Record<string, RegExp> = {
  list_students: /\b(list|show all|students|show)\b/i,
  fetch_report: /\b(report|show|get|reports)\b/i,
  check_backlogs: /\b(backlog|pending|failed subjects|backlog report|backlog reports)\b/i,
  download_pdf: /\b(download|pdf|export|download report|download report)\b/i,
  ai_summary: /\b(ai summary|summary|overview|profile)\b/i,
};

/**
 * Detect intent from user input
 */
export function detectIntent(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes("list")) return "list_students";
    if (lower.includes("backlog") || lower.includes("arrear")) return "check_backlogs";
    if (lower.includes("ai summary") || lower.includes("insight")) return "ai_summary";
    if (lower.includes("download")) return "download_pdf";
    return "unknown";
}

/**
 * Extract student name from user input
 */
export function extractStudentName(input: string): string | null {
  let cleaned = input.toLowerCase();
  Object.values(intentPatterns).forEach(pattern => {
    cleaned = cleaned.replace(pattern, "");
  });

  const name = cleaned
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return name || null;
}

/**
 * Helper: check if input mentions a semester
 */
export function extractSemester(input: string): string | null {
  const semMatch = input.match(/\bsem(?:ester)?\s*(\d+)\b/i);
  return semMatch ? `sem${semMatch[1]}` : null;
}

/**
 * Helper: check if input mentions backlog report
 */
export function isBacklogRequest(input: string): boolean {
  return /\b(backlog|pending|failed)\b/i.test(input);
}

/**
 * Helper: check if input mentions AI summary/profile
 */
export function isAiSummaryRequest(input: string): boolean {
  return intentPatterns.ai_summary.test(input);
}
