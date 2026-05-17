/**
 * useAcademicWorkspace
 *
 * Centralizes all Academic Engine state for a given batch year.
 * Uses the Hey API generated SDK exclusively — no raw fetch calls.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getBatchStatusAdminBatchStatusGet,
  listSectionsAdminListSectionsGet,
  listSubjectsAdminListSubjectsGet,
  listStaffAdminListStaffGet,
} from "../client/sdk.gen";
import type {
  GetBatchStatusAdminBatchStatusGetResponses,
  ListSectionsAdminListSectionsGetResponses,
  ListSubjectsAdminListSubjectsGetResponses,
  ListStaffAdminListStaffGetResponses,
} from "../client/types.gen";

// ─── Domain Types ──────────────────────────────────────────────────────────────

export type BatchStatus = "IN_SETUP" | "READY" | "ACTIVE" | "ARCHIVED";

export interface BatchLifecycle {
  batch_year: number;
  status: BatchStatus;
  section_count: number;
  subject_count: number;
  student_count: number;
  assignment_count: number;
  updated_at: string | null;
}

export interface SectionItem {
  id: number;
  name: string;
  batch_year: number;
}

export interface SubjectItem {
  subject_code: string;
  subject_name: string;
  semester: string;
  credits: number;
}

export interface StaffItem {
  username: string;
  name: string;
  email: string;
}

export interface WorkspaceState {
  lifecycle: BatchLifecycle | null;
  sections: SectionItem[];
  subjects: SubjectItem[];
  staff: StaffItem[];
  isLoading: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAcademicWorkspace(batchYear: number | null, secret: string) {
  const [state, setState] = useState<WorkspaceState>({
    lifecycle: null,
    sections: [],
    subjects: [],
    staff: [],
    isLoading: false,
    error: null,
  });

  const headers = { "X-Admin-Secret": secret };

  const refresh = useCallback(async () => {
    if (!batchYear || !secret) {
      setState((s) => ({ ...s, lifecycle: null, sections: [], isLoading: false }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    const [lifecycleRes, sectionsRes, subjectsRes, staffRes] =
      await Promise.allSettled([
        getBatchStatusAdminBatchStatusGet({
          headers,
          query: { batch_year: batchYear },
        }),
        listSectionsAdminListSectionsGet({
          headers,
          query: { batch_year: batchYear },
        }),
        listSubjectsAdminListSubjectsGet({ headers }),
        listStaffAdminListStaffGet({ headers }),
      ]);

    setState({
      lifecycle:
        lifecycleRes.status === "fulfilled" && lifecycleRes.value.data
          ? (lifecycleRes.value.data as unknown as BatchLifecycle)
          : null,
      sections:
        sectionsRes.status === "fulfilled" && sectionsRes.value.data
          ? (sectionsRes.value.data as unknown as SectionItem[])
          : [],
      subjects:
        subjectsRes.status === "fulfilled" && subjectsRes.value.data
          ? (subjectsRes.value.data as unknown as SubjectItem[])
          : [],
      staff:
        staffRes.status === "fulfilled" && staffRes.value.data
          ? (staffRes.value.data as unknown as StaffItem[])
          : [],
      isLoading: false,
      error: null,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchYear, secret]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { state, refresh };
}

// ─── Step Lock Helpers ─────────────────────────────────────────────────────────

export function getStepLocks(lifecycle: BatchLifecycle | null) {
  const sectionCount = lifecycle?.section_count ?? 0;
  const studentCount = lifecycle?.student_count ?? 0;

  return {
    infrastructure: false,           // always unlocked
    catalog:    sectionCount === 0,  // need sections first
    enrollment: sectionCount === 0,  // need sections first
    allocation: studentCount === 0,  // need students first
  };
}

export type StepKey = "infrastructure" | "catalog" | "enrollment" | "allocation";

export function getStepStatus(
  step: StepKey,
  lifecycle: BatchLifecycle | null
): "complete" | "active" | "locked" | "idle" {
  if (!lifecycle) return "idle";
  const locks = getStepLocks(lifecycle);
  if (locks[step]) return "locked";

  const { section_count, subject_count, student_count, assignment_count } = lifecycle;
  switch (step) {
    case "infrastructure": return section_count > 0 ? "complete" : "active";
    case "catalog":        return subject_count > 0 ? "complete" : "active";
    case "enrollment":     return student_count > 0 ? "complete" : "active";
    case "allocation":     return assignment_count > 0 ? "complete" : "active";
  }
}

// ─── Status Badge Helpers ──────────────────────────────────────────────────────

export const STATUS_META: Record<
  BatchStatus,
  { label: string; color: string; dot: string }
> = {
  IN_SETUP: {
    label: "In Setup",
    color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  READY: {
    label: "Ready",
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  ACTIVE: {
    label: "Active",
    color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400",
    dot: "bg-blue-500 animate-pulse",
  },
  ARCHIVED: {
    label: "Archived",
    color: "text-slate-500 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};
