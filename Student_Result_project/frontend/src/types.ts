/**
 * types.ts
 *
 * Canonical domain types for the AcaTrack frontend.
 * Inferred from actual backend responses (Flask/SQLAlchemy API).
 * Import from this file instead of using `any` or inline ad-hoc shapes.
 */

// ─── Primitives ──────────────────────────────────────────────────────────────

/** All valid semester slugs as returned by the backend */
export type Semester =
  | "sem1"
  | "sem2"
  | "sem3"
  | "sem4"
  | "sem5"
  | "sem6"
  | "sem7"
  | "sem8";

/** User role as set by the backend auth system */
export type UserRole = "Student" | "Parent" | "Staff" | "Admin";

/** Result status for a subject or overall semester */
export type PassFail = "Pass" | "Fail" | "No Credits";

// ─── Auth & User ─────────────────────────────────────────────────────────────

/**
 * JWT payload decoded from the `jwt_token` stored in sessionStorage.
 * The backend uses Flask-JWT or similar.
 */
export interface JwtPayload {
  sub: string;       // user identifier (USN, email, etc.)
  exp: number;       // unix timestamp expiry
  iat: number;       // issued-at
  who: UserRole;     // role discriminator
  [key: string]: unknown;
}

/**
 * Shape returned by GET /auth/status
 * Also stored in `useAuthStore`.
 */
export interface AuthStatusResponse {
  logged_in: boolean;
  who: UserRole;
  id?: string;
  name?: string;
  mentor_id?: string;
  [key: string]: unknown;
}

// ─── Student / Result ─────────────────────────────────────────────────────────

/**
 * A single subject row inside a student result.
 * Returned as part of the `subjects` array from GET /auth/Student/result.
 */
export interface SubjectResult {
  code: string;
  subject_name: string;
  ia: number | string;
  see: number | string;
  total: number | string;
  credit: number;
  status: PassFail;
}

/**
 * Full response shape from GET /auth/Student/result.
 * Used in Result.tsx, ResultCardView.tsx, SemesterResults.tsx, etc.
 */
export interface StudentResult {
  usn: string;
  name: string;
  sgpa: number;
  cgpa: number;
  percentage: number;
  total_marks: number | string;
  credits: number | string;
  status: PassFail;
  subjects: SubjectResult[];
  pdf_url?: string | null;
  semester?: Semester;
}

// ─── Student Info (from /parent/student-details) ─────────────────────────────

export interface StudentInfo {
  usn: string;
  name: string;
  [key: string]: unknown;
}

export interface MentorInfo {
  name: string;
  email: string;
  phone: string;
  [key: string]: unknown;
}

export interface StudentData {
  student: StudentInfo;
  mentor: MentorInfo | null;
  [key: string]: unknown;
}

// ─── Mentor / Staff ───────────────────────────────────────────────────────────

export interface MenteeInfo {
  usn: string;
  name: string;
  email?: string;
  semester?: Semester;
  [key: string]: unknown;
}

export interface MeetingRecord {
  id: string | number;
  date: string;
  notes: string;
  student_usn: string;
  [key: string]: unknown;
}

// ─── API Error ────────────────────────────────────────────────────────────────

/**
 * Standard backend error JSON: `{ "error": "message" }`
 */
export interface ApiErrorResponse {
  error: string;
  status?: number;
  details?: string;
}

// ─── Async State ─────────────────────────────────────────────────────────────

/**
 * Generic shape returned by the `useAsync` hook.
 */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";
