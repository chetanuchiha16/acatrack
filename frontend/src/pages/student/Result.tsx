import { useEffect, useState, useCallback } from "react";
import { getStudentInfoAuthStudentResultGet } from "../../client/sdk.gen";
import type { StudentResultResponse as StudentResult } from "../../client/types.gen";
import type { Semester } from "../../types";
import StudentAIInsights from "./StudentAIInsights";
import ResultGlossary from "./ResultGlossary";
import { parseApiError } from "../../utils/errorHandler";
import { Download, Loader2, GraduationCap } from "lucide-react";

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

    const subjects = Array.isArray(data?.subjects) ? data.subjects : [];
    const passCount = subjects.filter(s => s.status === "Pass").length;
    const failCount = subjects.length - passCount;

    return (
        <div className="w-full">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl">
                        <GraduationCap className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Student Report</h2>
                        <p className="text-xs text-gray-500 mt-1">Subject-wise performance</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <ResultGlossary />
                    {data?.pdf_url && (
                        <a
                            href={data.pdf_url}
                            download
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-base font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                            <Download size={18} />
                            Report
                        </a>
                    )}
                </div>
            </div>

            {/* ── States ───────────────────────────────────────────────────── */}
            <main>
                <div className="mb-4">
                    {loading && (
                        <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center">
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 size={18} className="animate-spin text-blue-500" />
                                <div className="font-medium">Loading results…</div>
                            </div>
                            <div className="text-sm text-slate-500 mt-1">
                                Fetching data for <strong>{semester}</strong>
                            </div>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {data && !loading && (
                    <section>
                        {/* Student info bar */}
                        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <div className="text-sm font-bold text-slate-500">{data.name} · {data.usn}</div>
                                <h2 className="text-lg font-extrabold mt-0.5">{semester.replace("sem", "Semester ")} — {subjects.length} subjects</h2>
                            </div>
                            <div className="flex flex-wrap gap-3 text-sm font-medium">
                                <span className="text-slate-400">SGPA <span className="font-extrabold text-blue-600 dark:text-blue-400 ml-1">{data.sgpa?.toFixed(2)}</span></span>
                                <span className="text-slate-400">CGPA <span className="font-extrabold text-indigo-600 dark:text-indigo-400 ml-1">{data.cgpa?.toFixed(2)}</span></span>
                                <span className="text-slate-400">Percentage <span className="font-extrabold text-violet-600 dark:text-violet-400 ml-1">{data.percentage?.toFixed(1)}%</span></span>
                                <span className={`font-extrabold ${data.status === "Pass" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                    {data.status}
                                </span>
                            </div>
                        </div>

                        {view !== "table" ? (
                            /* ── Card View (matches SemesterResults card design) ── */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {subjects.map((sub, idx) => {
                                    const isSubPass = sub.status === "Pass";
                                    return (
                                        <article
                                            key={idx}
                                            className={`group relative bg-white dark:bg-gray-800/40 rounded-2xl p-4 border transition-all duration-300 hover:shadow-xl overflow-hidden
                                                ${isSubPass
                                                    ? "border-gray-100 dark:border-gray-700/50 hover:border-emerald-500/30 dark:hover:border-emerald-400/30 hover:shadow-emerald-500/5"
                                                    : "border-rose-200 dark:border-rose-800/50 shadow-sm shadow-rose-500/5"
                                                }`}
                                        >
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>

                                            <div className="relative z-10">
                                                {/* Top: code + status */}
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1 min-w-0 pr-2">
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                                                {sub.code}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={sub.subject_name}>
                                                            {sub.subject_name}
                                                        </h3>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <div className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">
                                                            {sub.total}
                                                        </div>
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Total</span>
                                                    </div>
                                                </div>

                                                {/* Stats grid */}
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2 border border-gray-100 dark:border-gray-800/50">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">IA</div>
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">{sub.ia}</div>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2 border border-gray-100 dark:border-gray-800/50">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">SEE</div>
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">{sub.see}</div>
                                                    </div>
                                                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2 border border-gray-100 dark:border-gray-800/50">
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Status</div>
                                                        <div className={`text-sm font-bold ${isSubPass ? "text-emerald-600" : "text-rose-500"}`}>
                                                            {sub.status}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Footer */}
                                                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/50 flex items-center justify-between text-[10px] font-bold text-gray-400">
                                                    <div className="flex gap-3">
                                                        <span>Credits <span className="text-gray-900 dark:text-gray-300 ml-0.5">{sub.credit}</span></span>
                                                        <span>Total <span className="text-gray-900 dark:text-gray-300 ml-0.5">{sub.total}</span></span>
                                                    </div>
                                                    <span className={isSubPass ? "text-emerald-500" : "text-rose-500"}>
                                                        {isSubPass ? "Passed" : "Failed"}
                                                    </span>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            /* ── Table View (matches SemesterResults table design) ── */
                            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto text-base">
                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400">#</th>
                                            <th className="px-4 py-3 text-left font-bold text-gray-500 dark:text-gray-400">Subject</th>
                                            <th className="px-4 py-3 text-center font-bold text-gray-500 dark:text-gray-400">Code</th>
                                            <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400">IA</th>
                                            <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400">SEE</th>
                                            <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400">Total</th>
                                            <th className="px-4 py-3 text-right font-bold text-gray-500 dark:text-gray-400">Credits</th>
                                            <th className="px-4 py-3 text-center font-bold text-gray-500 dark:text-gray-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {subjects.map((sub, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{sub.subject_name}</td>
                                                <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{sub.code}</td>
                                                <td className="px-4 py-3 text-right font-semibold">{sub.ia}</td>
                                                <td className="px-4 py-3 text-right font-semibold">{sub.see}</td>
                                                <td className="px-4 py-3 text-right font-bold">{sub.total}</td>
                                                <td className="px-4 py-3 text-right">{sub.credit}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={sub.status === "Pass" ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                                                        {sub.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Summary footer */}
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-6 text-base font-bold text-gray-400">
                                <span>Total Marks <span className="text-gray-900 dark:text-gray-300 ml-1">{data.total_marks}</span></span>
                                <span>Credits <span className="text-gray-900 dark:text-gray-300 ml-1">{data.credits}</span></span>
                                <span>Passed <span className="text-emerald-500 ml-1">{passCount}</span></span>
                                {failCount > 0 && <span>Failed <span className="text-rose-500 ml-1">{failCount}</span></span>}
                            </div>

                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
