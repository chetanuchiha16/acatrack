/**
 * useDryRunUpload
 *
 * Manages the two-phase commit (Validate → Preview → Commit) flow
 * for Excel uploads. Uses Hey API SDK for all network calls.
 */

import { useState, useCallback } from "react";
import {
  validateStudentsExcelAdminValidateStudentsExcelPost,
  commitStudentsExcelAdminCommitStudentsExcelPost,
  validateSubjectsExcelAdminValidateSubjectsExcelPost,
  commitSubjectsExcelAdminCommitSubjectsExcelPost,
} from "../client/sdk.gen";

// ─── Preview Types ─────────────────────────────────────────────────────────────

export interface StudentPreviewRow {
  usn: string;
  name: string;
  reason?: string;
}

export interface StudentDryRunPreview {
  valid: StudentPreviewRow[];
  duplicates: StudentPreviewRow[];
  errors: string[];
  total_in_file: number;
  will_insert: number;
  will_update: number;
  will_skip: number;
}

export interface SubjectPreviewRow {
  code: string;
  name: string;
  credits: number;
}

export interface SubjectDryRunPreview {
  valid: SubjectPreviewRow[];
  errors: string[];
  total_in_file: number;
  will_upsert: number;
}

export interface CommitResult {
  inserted: number;
  updated: number;
}

// ─── Phase State Machine ────────────────────────────────────────────────────────

export type DryRunPhase =
  | "idle"
  | "validating"
  | "preview"
  | "committing"
  | "done"
  | "error";

// ─── Student Enrollment Hook ───────────────────────────────────────────────────

export function useStudentDryRun(secret: string) {
  const [phase, setPhase] = useState<DryRunPhase>("idle");
  const [preview, setPreview] = useState<StudentDryRunPreview | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validate = useCallback(
    async (file: File, batchYear: number) => {
      setPhase("validating");
      setPreview(null);
      setResult(null);
      setErrorMsg(null);
      try {
        const res = await validateStudentsExcelAdminValidateStudentsExcelPost({
          headers: { "X-Admin-Secret": secret },
          query: { batch_year: batchYear },
          body: { file },
        });
        if (res.error) {
          const msg = (res.error as { error?: string }).error ?? "Validation failed";
          setErrorMsg(msg);
          setPhase("error");
          return;
        }
        setPreview(res.data as unknown as StudentDryRunPreview);
        setPhase("preview");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
        setPhase("error");
      }
    },
    [secret]
  );

  const commit = useCallback(
    async (file: File, batchYear: number, sectionName: string) => {
      setPhase("committing");
      try {
        const res = await commitStudentsExcelAdminCommitStudentsExcelPost({
          headers: { "X-Admin-Secret": secret },
          query: { batch_year: batchYear, section_name: sectionName },
          body: { file },
        });
        if (res.error) {
          const msg = (res.error as { error?: string }).error ?? "Commit failed";
          setErrorMsg(msg);
          setPhase("error");
          return;
        }
        setResult(res.data as unknown as CommitResult);
        setPhase("done");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
        setPhase("error");
      }
    },
    [secret]
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setPreview(null);
    setResult(null);
    setErrorMsg(null);
  }, []);

  return { phase, preview, result, errorMsg, validate, commit, reset };
}

// ─── Subject Catalog Hook ──────────────────────────────────────────────────────

export function useSubjectDryRun(secret: string) {
  const [phase, setPhase] = useState<DryRunPhase>("idle");
  const [preview, setPreview] = useState<SubjectDryRunPreview | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const validate = useCallback(
    async (file: File) => {
      setPhase("validating");
      setPreview(null);
      setResult(null);
      setErrorMsg(null);
      try {
        const res = await validateSubjectsExcelAdminValidateSubjectsExcelPost({
          headers: { "X-Admin-Secret": secret },
          body: { file },
        });
        if (res.error) {
          const msg = (res.error as { error?: string }).error ?? "Validation failed";
          setErrorMsg(msg);
          setPhase("error");
          return;
        }
        setPreview(res.data as unknown as SubjectDryRunPreview);
        setPhase("preview");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
        setPhase("error");
      }
    },
    [secret]
  );

  const commit = useCallback(
    async (file: File, semester: string) => {
      setPhase("committing");
      try {
        const res = await commitSubjectsExcelAdminCommitSubjectsExcelPost({
          headers: { "X-Admin-Secret": secret },
          query: { semester },
          body: { file },
        });
        if (res.error) {
          const msg = (res.error as { error?: string }).error ?? "Commit failed";
          setErrorMsg(msg);
          setPhase("error");
          return;
        }
        setResult(res.data as unknown as CommitResult);
        setPhase("done");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
        setPhase("error");
      }
    },
    [secret]
  );

  const reset = useCallback(() => {
    setPhase("idle");
    setPreview(null);
    setResult(null);
    setErrorMsg(null);
  }, []);

  return { phase, preview, result, errorMsg, validate, commit, reset };
}
