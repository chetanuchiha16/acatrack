import { useEffect, useState, useCallback } from "react";
import { getStudentInfoAuthStudentResultGet } from "../../client/sdk.gen";
import type { StudentResultResponse as StudentResult } from "../../client/types.gen";
import type { Semester } from "../../types";
import StudentAIInsights from "./StudentAIInsights";
import { parseApiError } from "../../utils/errorHandler";
import { Download, Sparkles, FileText, TrendingUp, Award, BookOpen, Hash, Loader2 } from "lucide-react";

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
            <div className="flex-1 flex items-center justify-center py-20">
                <div className="flex items-center gap-3 text-blue-500">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm font-semibold">Loading results…</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center py-20">
                <p className="text-sm font-semibold text-red-500">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const subjects = Array.isArray(data.subjects) ? data.subjects : [];
    const passCount = subjects.filter(s => s.status === "Pass").length;
    const failCount = subjects.length - passCount;
    const isPass = data.status === "Pass";

    return (
        <div className="flex flex-col gap-4 animate-in fade-in duration-300">
            {/* ── Stats ribbon ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                <StatChip label="Name" value={data.name} wide className="col-span-2" />
                <StatChip label="USN" value={data.usn} wide className="col-span-2" />
                <StatChip label="SGPA" value={data.sgpa?.toFixed(2) ?? "—"} accent="blue" />
                <StatChip label="CGPA" value={data.cgpa?.toFixed(2) ?? "—"} accent="indigo" />
                <StatChip label="Percentage" value={`${data.percentage?.toFixed(1) ?? 0}%`} accent="violet" />
                <StatChip
                    label="Status"
                    value={data.status ?? "—"}
                    accent={isPass ? "green" : "red"}
                />
            </div>

            {/* ── Secondary ribbon ─────────────────────────────────────────── */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                <MiniStat icon={<FileText size={13} />} label="Total Marks" value={data.total_marks ?? "—"} />
                <MiniStat icon={<Award size={13} />} label="Credits Earned" value={data.credits ?? "—"} />
                <MiniStat icon={<BookOpen size={13} className="text-emerald-500" />} label="Passed" value={passCount} color="emerald" />
                {failCount > 0 && (
                    <MiniStat icon={<Hash size={13} className="text-rose-500" />} label="Backlogs" value={failCount} color="rose" />
                )}
            </div>

            {/* ── Subjects ─────────────────────────────────────────────────── */}
            <div className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
                {/* Table header */}
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-x-4 px-4 py-2.5 bg-gray-50 dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <span className="w-5 text-center">#</span>
                    <span>Subject</span>
                    <span className="w-20 text-center hidden sm:block">Code</span>
                    <span className="w-10 text-center">IA</span>
                    <span className="w-10 text-center">SEE</span>
                    <span className="w-12 text-center">Total</span>
                    <span className="w-12 text-center">Status</span>
                </div>

                {/* Rows */}
                {subjects.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400">No subjects found for this semester.</div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
                        {subjects.map((sub, idx) => {
                            const isSubPass = sub.status === "Pass";
                            return (
                                <div
                                    key={idx}
                                    className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_auto] items-center gap-x-4 px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors group"
                                >
                                    <span className="w-5 text-center text-[11px] text-gray-400 font-bold">{idx + 1}</span>

                                    <div className="min-w-0">
                                        <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                                            {sub.subject_name}
                                        </p>
                                        <p className="text-[10px] text-gray-400 sm:hidden">{sub.code} · {sub.credit} cr</p>
                                    </div>

                                    <span className="w-20 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 hidden sm:block">
                                        {sub.code}
                                    </span>

                                    <span className="w-10 text-center text-[13px] font-bold text-gray-700 dark:text-gray-200">{sub.ia}</span>
                                    <span className="w-10 text-center text-[13px] font-bold text-gray-700 dark:text-gray-200">{sub.see}</span>

                                    <span className="w-12 text-center text-[14px] font-black text-gray-900 dark:text-white">{sub.total}</span>

                                    <span className={`w-12 text-center text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                        isSubPass
                                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                                            : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400"
                                    }`}>
                                        {sub.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Footer action ────────────────────────────────────────────── */}
            <div className="flex justify-end">
                {data.pdf_url ? (
                    <a
                        href={data.pdf_url}
                        download
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                        <Download size={14} />
                        Download Scorecard
                    </a>
                ) : (
                    <span className="text-xs text-gray-400">No downloadable report available</span>
                )}
            </div>
        </div>
    );
}

// ── Micro-components ───────────────────────────────────────────────────────────

type AccentColor = "blue" | "indigo" | "violet" | "green" | "red";

function StatChip({ label, value, accent, wide, className }: {
    label: string;
    value: string | number;
    accent?: AccentColor;
    wide?: boolean;
    className?: string;
}) {
    const colors: Record<AccentColor, string> = {
        blue:   "text-blue-600 dark:text-blue-400",
        indigo: "text-indigo-600 dark:text-indigo-400",
        violet: "text-violet-600 dark:text-violet-400",
        green:  "text-emerald-600 dark:text-emerald-400",
        red:    "text-rose-600 dark:text-rose-400",
    };
    return (
        <div className={`rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-3 py-2.5 shadow-sm ${className ?? ""}`}>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
            <p className={`text-[13px] font-black truncate ${accent ? colors[accent] : "text-gray-900 dark:text-white"}`}>{value}</p>
        </div>
    );
}

function MiniStat({ icon, label, value, color }: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color?: "emerald" | "rose";
}) {
    return (
        <div className="flex items-center gap-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-3 py-2 shadow-sm">
            <span className={color === "emerald" ? "text-emerald-500" : color === "rose" ? "text-rose-500" : "text-gray-400"}>
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-none">{label}</p>
                <p className="text-[13px] font-black text-gray-900 dark:text-white leading-tight mt-0.5">{value}</p>
            </div>
        </div>
    );
}
