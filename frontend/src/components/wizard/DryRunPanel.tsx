import React from "react";
import { CheckCircle, AlertCircle, XCircle, Loader2 } from "lucide-react";

import type { DryRunPhase, StudentDryRunPreview, SubjectDryRunPreview, CommitResult } from "../../hooks/useDryRunUpload";

interface StudentPanelProps {
  phase: DryRunPhase;
  preview: StudentDryRunPreview | null;
  result: CommitResult | null;
  errorMsg: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const StudentDryRunPanel: React.FC<StudentPanelProps> = ({
  phase, preview, result, errorMsg, onConfirm, onCancel,
}) => {
  if (phase === "idle") return null;

  if (phase === "validating") return (
    <div className="mt-4 flex items-center gap-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <Loader2 size={18} className="animate-spin text-indigo-500" />
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Validating file…</p>
    </div>
  );

  if (phase === "committing") return (
    <div className="mt-4 flex items-center gap-3 p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
      <Loader2 size={18} className="animate-spin text-indigo-500" />
      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Committing to database…</p>
    </div>
  );

  if (phase === "error") return (
    <div className="mt-4 flex items-center gap-3 p-5 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900">
      <XCircle size={18} className="text-rose-500 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{errorMsg}</p>
      </div>
      <button onClick={onCancel} className="text-xs text-rose-500 hover:underline font-semibold">Dismiss</button>
    </div>
  );

  if (phase === "done" && result) return (
    <div className="mt-4 flex items-center gap-3 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900">
      <CheckCircle size={18} className="text-emerald-500 shrink-0" />
      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
        Enrolled successfully — {result.inserted} new, {result.updated} updated.
      </p>
    </div>
  );

  if (phase === "preview" && preview) return (
    <div className="mt-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
      <div className="bg-indigo-50 dark:bg-indigo-900/20 px-5 py-3 flex items-center gap-2">
        <AlertCircle size={16} className="text-indigo-500" />
        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Validation Preview</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-600">{preview.will_insert}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-1">New Students</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-amber-600">{preview.will_update}</p>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mt-1">Will Update</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-rose-600">{preview.will_skip}</p>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-1">Skipped</p>
          </div>
        </div>
        {preview.errors.length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl p-3">
            <p className="text-xs font-bold text-rose-600 mb-1">Data Errors:</p>
            <ul className="space-y-1">
              {preview.errors.slice(0, 5).map((e, i) => (
                <li key={i} className="text-xs text-rose-500 font-medium">{e}</li>
              ))}
              {preview.errors.length > 5 && (
                <li className="text-xs text-rose-400">…and {preview.errors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
        {preview.duplicates.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3">
            <p className="text-xs font-bold text-amber-600 mb-1">Duplicates ({preview.duplicates.length}):</p>
            <ul className="space-y-1">
              {preview.duplicates.slice(0, 3).map((d, i) => (
                <li key={i} className="text-xs text-amber-600 font-medium">{d.usn} — {d.reason}</li>
              ))}
              {preview.duplicates.length > 3 && (
                <li className="text-xs text-amber-400">…and {preview.duplicates.length - 3} more</li>
              )}
            </ul>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={preview.will_insert === 0 && preview.will_update === 0}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            <CheckCircle size={16} />
            Confirm & Enroll →
          </button>
        </div>
      </div>
    </div>
  );

  return null;
};


interface SubjectPanelProps {
  phase: DryRunPhase;
  preview: SubjectDryRunPreview | null;
  result: CommitResult | null;
  errorMsg: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SubjectDryRunPanel: React.FC<SubjectPanelProps> = ({
  phase, preview, result, errorMsg, onConfirm, onCancel,
}) => {
  if (phase === "idle") return null;

  if (phase === "validating" || phase === "committing") return (
    <div className="mt-4 flex items-center gap-3 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <Loader2 size={18} className="animate-spin text-teal-500" />
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
        {phase === "validating" ? "Validating subjects…" : "Registering subjects…"}
      </p>
    </div>
  );

  if (phase === "error") return (
    <div className="mt-4 flex items-center gap-3 p-5 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200">
      <XCircle size={18} className="text-rose-500 shrink-0" />
      <p className="text-sm font-bold text-rose-600 flex-1">{errorMsg}</p>
      <button onClick={onCancel} className="text-xs text-rose-500 hover:underline font-semibold">Dismiss</button>
    </div>
  );

  if (phase === "done" && result) return (
    <div className="mt-4 flex items-center gap-3 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200">
      <CheckCircle size={18} className="text-emerald-500 shrink-0" />
      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
        Subjects registered — {result.inserted} new, {result.updated} updated.
      </p>
    </div>
  );

  if (phase === "preview" && preview) return (
    <div className="mt-4 rounded-2xl border border-teal-200 dark:border-teal-800 overflow-hidden">
      <div className="bg-teal-50 dark:bg-teal-900/20 px-5 py-3 flex items-center gap-2">
        <AlertCircle size={16} className="text-teal-500" />
        <span className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">Validation Preview</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-emerald-600">{preview.will_upsert}</p>
            <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mt-1">Valid Subjects</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-rose-600">{preview.errors.length}</p>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mt-1">Errors</p>
          </div>
        </div>
        {preview.errors.length > 0 && (
          <div className="bg-rose-50 dark:bg-rose-900/10 rounded-xl p-3">
            <ul className="space-y-1">
              {preview.errors.slice(0, 5).map((e, i) => (
                <li key={i} className="text-xs text-rose-500 font-medium">{e}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={preview.will_upsert === 0}
            className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold shadow-lg shadow-teal-500/20 hover:bg-teal-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            <CheckCircle size={16} />
            Confirm & Register →
          </button>
        </div>
      </div>
    </div>
  );

  return null;
};
