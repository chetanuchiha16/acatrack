import React, { useState, useEffect } from "react";
import {
  Database, BookOpen, UserCheck, Link, CheckCircle,
  Lock, Loader2, RefreshCw, Users, FileText, ChevronRight, AlertCircle, XCircle,
} from "lucide-react";
import {
  initBatchAdminInitBatchPost,
  assignSubjectsAdminAssignSubjectsPost,
} from "../../client/sdk.gen";
import {
  useAcademicWorkspace, getStepLocks, getStepStatus,
  STATUS_META, type StepKey, type BatchLifecycle, type SubjectItem,
} from "../../hooks/useAcademicWorkspace";
import { useStudentDryRun, useSubjectDryRun } from "../../hooks/useDryRunUpload";
import { StudentDryRunPanel, SubjectDryRunPanel } from "../../components/wizard/DryRunPanel";

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props { secret: string; batchYear: number | null; onBatchCreated?: () => void; }

// ─── Step config ───────────────────────────────────────────────────────────────
const STEPS: { id: StepKey; label: string; icon: React.ElementType; accent: string }[] = [
  { id: "infrastructure", label: "Infrastructure",  icon: Database,   accent: "indigo" },
  { id: "catalog",        label: "Catalog",         icon: BookOpen,   accent: "teal"   },
  { id: "enrollment",     label: "Enrollment",      icon: UserCheck,  accent: "blue"   },
  { id: "allocation",     label: "Allocation",      icon: Link,       accent: "purple" },
];

// ─── Reusable premium alert notification banner ──────────────────────────────
const AlertNotification: React.FC<{
  type: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
}> = ({ type, message, onDismiss }) => {
  const bg = {
    success: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-400",
    error: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-400",
    info: "bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-400",
  }[type];

  const Icon = {
    success: CheckCircle,
    error: XCircle,
    info: Loader2,
  }[type];

  return (
    <div className={`p-4 rounded-2xl border flex items-start gap-3 text-sm font-semibold shadow-sm transition-all duration-300 animate-fadeIn ${bg}`}>
      <span className="mt-0.5 shrink-0">
        <Icon size={18} className={type === "info" ? "animate-spin text-indigo-500" : ""} />
      </span>
      <div className="flex-1">{message}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="text-current opacity-60 hover:opacity-100 font-bold text-xs shrink-0 select-none ml-2">
          ✕
        </button>
      )}
    </div>
  );
};

// ─── Batch Dashboard Header ────────────────────────────────────────────────────
const BatchDashboard: React.FC<{ lifecycle: BatchLifecycle | null; isLoading: boolean; onRefresh: () => void }> = ({
  lifecycle, isLoading, onRefresh,
}) => {
  const meta = lifecycle ? STATUS_META[lifecycle.status] : null;
  return (
    <div className="mb-8 p-6 rounded-[2rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-6">
        {meta && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest ${meta.color}`}>
            <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
            {meta.label}
          </div>
        )}
        {lifecycle ? (
          <div className="flex flex-wrap gap-6 text-sm">
            {[
              { label: "Sections",    val: lifecycle.section_count    },
              { label: "Subjects",    val: lifecycle.subject_count    },
              { label: "Students",    val: lifecycle.student_count    },
              { label: "Assignments", val: lifecycle.assignment_count },
            ].map(({ label, val }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-black text-slate-800 dark:text-white">{val}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 font-medium">Select a batch to view status.</p>
        )}
      </div>
      <button onClick={onRefresh} disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-500 dark:text-slate-300 hover:border-slate-400 transition-all disabled:opacity-50">
        <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        Refresh
      </button>
    </div>
  );
};

// ─── Stepper Header ────────────────────────────────────────────────────────────
const StepperHeader: React.FC<{
  activeStep: StepKey;
  lifecycle: BatchLifecycle | null;
  onSelect: (s: StepKey) => void;
}> = ({ activeStep, lifecycle, onSelect }) => {
  const locks = getStepLocks(lifecycle);
  return (
    <div className="flex items-center gap-0 mb-8 overflow-x-auto">
      {STEPS.map((step, idx) => {
        const status = getStepStatus(step.id, lifecycle);
        const locked = locks[step.id];
        const active = activeStep === step.id;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => !locked && onSelect(step.id)}
              disabled={locked}
              className={`
                flex items-center gap-2.5 px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap
                ${active
                  ? `bg-${step.accent}-600 text-white shadow-lg shadow-${step.accent}-600/20`
                  : locked
                    ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }
              `}
            >
              {status === "complete" && !active
                ? <CheckCircle size={16} className="text-emerald-500" />
                : locked
                  ? <Lock size={16} />
                  : <Icon size={16} />
              }
              <span>{idx + 1}. {step.label}</span>
              {status === "complete" && !active && (
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-black">✓</span>
              )}
            </button>
            {idx < STEPS.length - 1 && (
              <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 mx-1 shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ─── Locked Gate ───────────────────────────────────────────────────────────────
const LockedGate: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
      <Lock size={24} className="text-slate-400" />
    </div>
    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-xs">{message}</p>
  </div>
);

// ─── Field helpers ─────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    {children}
  </div>
);

const inputCls = (focus = "indigo") =>
  `w-full px-5 py-3.5 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-${focus}-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200`;

const primaryBtn = (color: string, disabled = false) =>
  `flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${disabled ? "opacity-40 cursor-not-allowed" : ""} bg-${color}-600 shadow-${color}-600/20`;

// ─── Steps ────────────────────────────────────────────────────────────────────

const InfrastructureStep: React.FC<{ secret: string; onDone: () => void; onBatchCreated?: () => void }> = ({ secret, onDone, onBatchCreated }) => {
  const [batch, setBatch] = useState("");
  const [sections, setSections] = useState("A, B, C");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handle = async () => {
    if (!batch || !sections) return;
    setLoading(true); setMsg(null);
    try {
      await initBatchAdminInitBatchPost({
        headers: { "X-Admin-Secret": secret },
        query: {
          batch_year: parseInt(batch, 10),
          sections: sections.split(",").map(s => s.trim()).filter(Boolean),
        },
      });
      setMsg({ ok: true, text: `Batch ${batch} initialized with sections: ${sections}` });
      onBatchCreated?.();  // refresh sidebar dropdown
      onDone();
    } catch (err: any) {
      setMsg({ ok: false, text: err.body?.error || err.message || "Failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl animate-fadeIn">
      <div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">1. Initialize Section Foundation</h3>
        <p className="text-sm text-slate-500">Define the batch year and create sections (A, B, C…). This unlocks all subsequent steps.</p>
      </div>

      {msg && (
        <AlertNotification
          type={msg.ok ? "success" : "error"}
          message={msg.text}
          onDismiss={() => setMsg(null)}
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Batch Year">
          <input type="number" value={batch} onChange={e => setBatch(e.target.value)} placeholder="e.g. 2023" className={inputCls("indigo")} />
        </Field>
        <Field label="Sections (comma-separated)">
          <input type="text" value={sections} onChange={e => setSections(e.target.value)} placeholder="A, B, C" className={inputCls("indigo")} />
        </Field>
      </div>
      <button onClick={handle} disabled={loading || !batch} className={primaryBtn("indigo", loading || !batch)}>
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
        Initialize Infrastructure
      </button>
    </div>
  );
};

const CatalogStep: React.FC<{ secret: string; onDone: () => void }> = ({ secret, onDone }) => {
  const [semester, setSemester] = useState("sem1");
  const [file, setFile] = useState<File | null>(null);
  const dryRun = useSubjectDryRun(secret);

  const handleValidate = () => { if (file) void dryRun.validate(file); };
  const handleCommit = () => { if (file) void dryRun.commit(file, semester).then(onDone); };

  return (
    <div className="space-y-6 max-w-xl animate-fadeIn">
      <div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">2. Register Academic Subjects</h3>
        <p className="text-sm text-slate-500">Upload subjects via Excel. File is validated first — you review before committing.</p>
      </div>
      <Field label="Target Semester">
        <select value={semester} onChange={e => setSemester(e.target.value)} className={inputCls("teal")}>
          {Array.from({ length: 8 }, (_, i) => (
            <option key={i} value={`sem${i + 1}`}>Semester {i + 1}</option>
          ))}
        </select>
      </Field>
      <Field label="Subject Registry Excel (.xlsx)">
        <div className="space-y-2">
          <input type="file" accept=".xlsx" onChange={e => { setFile(e.target.files?.[0] ?? null); dryRun.reset(); }}
            className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer" />
          <p className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-2 rounded-lg font-medium">
            <span className="text-teal-500 font-bold">REQUIRED HEADERS:</span> code, name, credits
          </p>
        </div>
      </Field>
      {dryRun.phase === "idle" && (
        <button onClick={handleValidate} disabled={!file} className={primaryBtn("teal", !file)}>
          <FileText size={18} /> Validate File
        </button>
      )}
      <SubjectDryRunPanel
        phase={dryRun.phase} preview={dryRun.preview} result={dryRun.result}
        errorMsg={dryRun.errorMsg} onConfirm={handleCommit} onCancel={dryRun.reset}
      />
    </div>
  );
};

const EnrollmentStep: React.FC<{ secret: string; batchYear: number; sections: { id: number; name: string }[]; onDone: () => void }> = ({
  secret, batchYear, sections, onDone,
}) => {
  const [sectionName, setSectionName] = useState(sections[0]?.name ?? "");
  const [file, setFile] = useState<File | null>(null);
  const dryRun = useStudentDryRun(secret);

  const handleValidate = () => { if (file) void dryRun.validate(file, batchYear); };
  const handleCommit = () => { if (file) void dryRun.commit(file, batchYear, sectionName).then(onDone); };

  return (
    <div className="space-y-6 max-w-xl animate-fadeIn">
      <div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">3. Student Enrollment</h3>
        <p className="text-sm text-slate-500">Upload students via Excel. The dry-run preview shows duplicates and errors before any data is written.</p>
      </div>
      <Field label="Target Section">
        <select value={sectionName} onChange={e => setSectionName(e.target.value)} className={inputCls("blue")}>
          {sections.map(s => <option key={s.id} value={s.name}>Section {s.name}</option>)}
        </select>
      </Field>
      <Field label="Student Data Excel (.xlsx)">
        <div className="space-y-2">
          <input type="file" accept=".xlsx" onChange={e => { setFile(e.target.files?.[0] ?? null); dryRun.reset(); }}
            className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
          <p className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-2 rounded-lg font-medium">
            <span className="text-blue-500 font-bold">REQUIRED HEADERS:</span> usn, name, email, phone
          </p>
        </div>
      </Field>
      {dryRun.phase === "idle" && (
        <button onClick={handleValidate} disabled={!file} className={primaryBtn("blue", !file)}>
          <UserCheck size={18} /> Validate File
        </button>
      )}
      <StudentDryRunPanel
        phase={dryRun.phase} preview={dryRun.preview} result={dryRun.result}
        errorMsg={dryRun.errorMsg} onConfirm={handleCommit} onCancel={dryRun.reset}
      />
    </div>
  );
};

const AllocationStep: React.FC<{
  secret: string; batchYear: number;
  staff: { username: string; name: string }[];
  subjects: SubjectItem[];
  sections: { id: number; name: string }[];
  onDone: () => void;
}> = ({ secret, batchYear, staff, subjects, sections, onDone }) => {
  const [teacher, setTeacher] = useState("");
  const [subject, setSubject] = useState("");
  const [section, setSection] = useState("");
  const [semester, setSemester] = useState("sem1");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Sync subject list based on selected semester
  const filteredSubjects = subjects.filter(s => s.semester === semester);

  // Reset selected subject if it's no longer in the filtered list
  useEffect(() => {
    if (subject && !filteredSubjects.some(s => s.subject_code === subject)) {
      setSubject("");
    }
  }, [semester, filteredSubjects, subject]);

  const handle = async () => {
    if (!teacher || !subject || !section) return;
    setLoading(true); setMsg(null);
    try {
      await assignSubjectsAdminAssignSubjectsPost({
        headers: { "X-Admin-Secret": secret },
        query: { teacher_username: teacher, subject_code: subject, section_id: parseInt(section, 10), semester, batch_year: batchYear },
      });
      setMsg({ ok: true, text: "Subject assigned successfully." });
      onDone();
    } catch (err: any) {
      setMsg({ ok: false, text: err.body?.error || err.message || "Failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl animate-fadeIn">
      <div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">4. Faculty–Subject Allocation</h3>
        <p className="text-sm text-slate-500">Map a registered staff member to a subject, section, and semester.</p>
      </div>

      {msg && (
        <AlertNotification
          type={msg.ok ? "success" : "error"}
          message={msg.text}
          onDismiss={() => setMsg(null)}
        />
      )}

      <Field label="Staff Member">
        <select value={teacher} onChange={e => setTeacher(e.target.value)} className={inputCls("purple")}>
          <option value="">— Select Staff —</option>
          {staff.map(s => <option key={s.username} value={s.username}>{s.name} ({s.username})</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Semester">
          <select value={semester} onChange={e => setSemester(e.target.value)} className={inputCls("purple")}>
            {Array.from({ length: 8 }, (_, i) => <option key={i} value={`sem${i + 1}`}>Sem {i + 1}</option>)}
          </select>
        </Field>
        <Field label="Subject">
          <select value={subject} onChange={e => setSubject(e.target.value)} className={inputCls("purple")}>
            <option value="">— Select Subject —</option>
            {filteredSubjects.map(s => <option key={s.subject_code} value={s.subject_code}>{s.subject_name} ({s.subject_code})</option>)}
          </select>
        </Field>
        <Field label="Section">
          <select value={section} onChange={e => setSection(e.target.value)} className={inputCls("purple")}>
            <option value="">— Section —</option>
            {sections.map(s => <option key={s.id} value={s.id}>Section {s.name}</option>)}
          </select>
        </Field>
      </div>
      <button onClick={handle} disabled={loading || !teacher || !subject || !section}
        className={primaryBtn("purple", loading || !teacher || !subject || !section)}>
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Link size={18} />}
        Finalize Mapping
      </button>
    </div>
  );
};

// ─── Main Wizard Component ────────────────────────────────────────────────────
const AcademicSetup: React.FC<Props> = ({ secret, batchYear, onBatchCreated }) => {
  const [activeStep, setActiveStep] = useState<StepKey>("infrastructure");
  const { state, refresh } = useAcademicWorkspace(batchYear, secret);
  const { lifecycle, sections, subjects, staff, isLoading } = state;
  const locks = getStepLocks(lifecycle);

  const LOCK_MESSAGES: Record<StepKey, string> = {
    infrastructure: "",
    catalog:    "Initialize batch sections first (Step 1) to unlock the Subject Catalog.",
    enrollment: "Initialize batch sections first (Step 1) to unlock Student Enrollment.",
    allocation: "Enroll students first (Step 3) to unlock Staff Allocation.",
  };

  return (
    <div className="flex flex-col">
      <BatchDashboard lifecycle={lifecycle} isLoading={isLoading} onRefresh={refresh} />
      <StepperHeader activeStep={activeStep} lifecycle={lifecycle} onSelect={setActiveStep} />

      <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
        {locks[activeStep] ? (
          <LockedGate message={LOCK_MESSAGES[activeStep]} />
        ) : (
          <>
            {activeStep === "infrastructure" && (
              <InfrastructureStep secret={secret} onDone={refresh} onBatchCreated={onBatchCreated} />
            )}
            {activeStep === "catalog" && (
              <CatalogStep secret={secret} onDone={refresh} />
            )}
            {activeStep === "enrollment" && batchYear && (
              <EnrollmentStep secret={secret} batchYear={batchYear} sections={sections} onDone={refresh} />
            )}
            {activeStep === "allocation" && batchYear && (
              <AllocationStep secret={secret} batchYear={batchYear} staff={staff} subjects={subjects} sections={sections} onDone={refresh} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AcademicSetup;
