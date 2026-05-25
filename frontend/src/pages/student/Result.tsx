import { useEffect, useState, useCallback } from "react";
import { getStudentInfoAuthStudentResultGet } from "../../client/sdk.gen";
import type { StudentResultResponse as StudentResult } from "../../client/types.gen";
import type { Semester } from "../../types";
import StudentAIInsights from "./StudentAIInsights";
import { parseApiError } from "../../utils/errorHandler";
import { Download, Award, BookOpen, Hash, Loader2, FileText } from "lucide-react";

interface ResultProps {
    usn: string;
    semester: Semester;
    view: "table" | "cards" | "ai";
}

export default function Result({ usn, semester, view }: ResultProps) {
    const [data, setData] = useState<StudentResult | null>(null);
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    const fetchStudent = useCallback(async () => {
        if (!usn || !semester) return;
        setLoading(true);
        setError("");
        try {
            const { data: resultData } = await getStudentInfoAuthStudentResultGet({ query: { usn, semester } });
            if (resultData) { setData(resultData as StudentResult); setError(""); }
        } catch (err: unknown) {
            setError(parseApiError(err));
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [usn, semester]);

    useEffect(() => { void fetchStudent(); }, [fetchStudent]);

    if (view === "ai" && data && !loading) {
        return <StudentAIInsights usn={data.usn} semester={semester} />;
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-3 text-blue-500">
                    <Loader2 size={22} className="animate-spin" />
                    <span className="text-base font-semibold">Loading results…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-base font-semibold text-red-500">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const subjects = Array.isArray(data.subjects) ? data.subjects : [];
    const passCount = subjects.filter(s => s.status === "Pass").length;
    const failCount = subjects.length - passCount;
    const isPass = data.status === "Pass";

    return (
        <div className="flex flex-col gap-4 h-full animate-in fade-in duration-300">

            {/* ── Row 1: Identity + Key Scores ─────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Name + USN — spans 2 cols on large */}
                <div className="col-span-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-5 py-4 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shrink-0">
                        {(data.name ?? "?")[0]}
                    </div>
                    <div className="min-w-0">
                        <p className="text-lg font-black text-gray-900 dark:text-white truncate">{data.name}</p>
                        <p className="text-sm font-semibold text-gray-400 mt-0.5">{data.usn}</p>
                    </div>
                </div>

                {/* SGPA */}
                <ScoreCard label="SGPA" value={data.sgpa?.toFixed(2) ?? "—"} sub="Semester GPA" accent="blue" />
                {/* CGPA */}
                <ScoreCard label="CGPA" value={data.cgpa?.toFixed(2) ?? "—"} sub="Cumulative GPA" accent="indigo" />
            </div>

            {/* ── Row 2: Secondary stats ───────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniStat icon={<FileText size={16} />} label="Percentage" value={`${data.percentage?.toFixed(1) ?? 0}%`} />
                <MiniStat icon={<Award size={16} />} label="Total Marks" value={data.total_marks ?? "—"} />
                <MiniStat icon={<BookOpen size={16} className="text-emerald-500" />} label="Passed" value={`${passCount} / ${subjects.length}`} color="emerald" />
                <MiniStat
                    icon={<Hash size={16} className={failCount > 0 ? "text-rose-500" : "text-gray-400"} />}
                    label={failCount > 0 ? "Backlogs" : "Status"}
                    value={failCount > 0 ? failCount : (data.status ?? "—")}
                    color={failCount > 0 ? "rose" : isPass ? "emerald" : "rose"}
                />
            </div>

            {/* ── Subjects table ───────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm flex flex-col overflow-hidden">
                {/* Column headers */}
                <div className="grid grid-cols-[2rem_1fr_6rem_3.5rem_3.5rem_4rem_5rem] items-center gap-3 px-6 py-3.5 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 text-center">#</span>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400">Subject</span>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 text-center hidden sm:block">Code</span>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 text-center">IA</span>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 text-center">SEE</span>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 text-center">Total</span>
                    <span className="text-xs font-black uppercase tracking-widest text-gray-400 text-center">Status</span>
                </div>

                {/* Rows */}
                {subjects.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
                        No subjects found for this semester.
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/60">
                        {subjects.map((sub, idx) => {
                            const isSubPass = sub.status === "Pass";
                            return (
                                <div
                                    key={idx}
                                    className="grid grid-cols-[2rem_1fr_6rem_3.5rem_3.5rem_4rem_5rem] items-center gap-3 px-6 py-4 hover:bg-gray-50/70 dark:hover:bg-gray-800/30 transition-colors group"
                                >
                                    <span className="text-sm text-gray-400 font-bold text-center">{idx + 1}</span>

                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors leading-snug">
                                            {sub.subject_name}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5 sm:hidden">{sub.code} · {sub.credit} cr</p>
                                    </div>

                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-center hidden sm:block">
                                        {sub.code}
                                    </span>

                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 text-center">{sub.ia}</span>
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 text-center">{sub.see}</span>
                                    <span className="text-base font-black text-gray-900 dark:text-white text-center">{sub.total}</span>

                                    <div className="flex justify-center">
                                        <span className={`text-xs font-black uppercase tracking-wide px-3 py-1 rounded-full ${
                                            isSubPass
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                                : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                                        }`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Footer ───────────────────────────────────────────────────── */}
            <div className="flex justify-end shrink-0">
                {data.pdf_url ? (
                    <a
                        href={data.pdf_url}
                        download
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                        <Download size={16} />
                        Download Scorecard
                    </a>
                ) : (
                    <span className="text-sm text-gray-400">No downloadable report available</span>
                )}
            </div>
        </div>
    );
}

// ── Micro-components ───────────────────────────────────────────────────────────

function ScoreCard({ label, value, sub, accent }: {
    label: string;
    value: string;
    sub: string;
    accent: "blue" | "indigo";
}) {
    const color = accent === "blue"
        ? "text-blue-600 dark:text-blue-400"
        : "text-indigo-600 dark:text-indigo-400";
    return (
        <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-5 py-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
            <p className={`text-3xl font-black leading-none ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
        </div>
    );
}

function MiniStat({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color?: "emerald" | "rose";
}) {
    const iconColor = color === "emerald" ? "text-emerald-500" : color === "rose" ? "text-rose-500" : "text-gray-400";
    const valColor = color === "emerald" ? "text-emerald-600 dark:text-emerald-400" : color === "rose" ? "text-rose-600 dark:text-rose-400" : "text-gray-900 dark:text-white";
    return (
        <div className="flex items-center gap-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3.5 shadow-sm">
            <span className={iconColor}>{icon}</span>
            <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 leading-none">{label}</p>
                <p className={`text-base font-black leading-tight mt-1 ${valColor}`}>{value}</p>
            </div>
        </div>
    );
}
