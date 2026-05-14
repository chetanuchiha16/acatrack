import React, { useEffect, useState } from "react";
import { 
    GraduationCap, 
    ChevronDown, 
    FileText, 
    ArrowLeft, 
    ChevronRight,
    Search
} from "lucide-react";
import { 
    getSemesterResultsAuthStaffSemResGet,
    downloadSemesterReportAuthStaffSemResReportSemesterGet
} from "../../client/sdk.gen";

interface SemesterResultsProps {
    batchYear: string;
}

interface SemesterDataResult {
    subject_code: string;
    subject_name: string;
    total_students: number;
    pass_percentage: number;
    present_students: number;
    absent_students: number;
    fail_count: number;
    fcd_count: number;
    fc_count: number;
    sc_count: number;
}

interface SemesterData {
    semester: string;
    results: SemesterDataResult[];
}

interface StatProps {
    label: string;
    value: string | number;
}

const SemesterResults: React.FC<SemesterResultsProps> = ({ batchYear }) => {
    const [semester, setSemester] = useState<string>("sem1");
    const [data, setData] = useState<SemesterData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [view, setView] = useState<string>("cards");

    const semesters: string[] = ["sem1", "sem2", "sem3", "sem4"];

    useEffect(() => {
        if (semester && batchYear) {
            void fetchResults(semester);
        } else {
            setData(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [semester, batchYear]);

    async function fetchResults(selected: string): Promise<void> {
        setLoading(true);
        setError("");
        setData(null);
        try {
            const res = await getSemesterResultsAuthStaffSemResGet({
                query: { semester: selected, batch_year: parseInt(batchYear, 10) }
            });
            if (res.error) {
                const errorData = res.error as { error?: string };
                throw new Error(
                    errorData?.error || `Request failed`
                );
            }
            setData(res.data as unknown as SemesterData);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setLoading(false);
        }
    }

    const downloadPDF = async (): Promise<void> => {
        if (!semester) return;
        try {
            const res = await downloadSemesterReportAuthStaffSemResReportSemesterGet({
                path: { semester },
                query: { batch_year: parseInt(batchYear, 10) }
            });
            if (res.error) {
                throw new Error("Failed to fetch PDF");
            }
            const blob = res.data as unknown as Blob;
            const url = window.URL.createObjectURL(
                new Blob([blob], { type: "application/pdf" })
            );
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${semester}_results.pdf`);
            document.body.appendChild(link);
            link.click();
            if (link.parentNode) {
                link.parentNode.removeChild(link);
            }
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading PDF:", error);
        }
    };

    // Kept as requested pattern but strongly typed matching the UI design specs.
     
    const Stat: React.FC<StatProps> = ({ label, value }) => {
        return (
            <div className="flex flex-col items-center justify-center p-2">
                <div className="text-xs uppercase text-slate-400">{label}</div>
                <div className="text-xl font-semibold">{value}</div>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                        <GraduationCap className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Semester Overview</h2>
                        <p className="text-xs text-gray-500 mt-1">Detailed subject performance metrics</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={semester}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSemester(e.target.value)}
                            className="pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none appearance-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm min-w-[140px]"
                        >
                            {semesters.map((s) => (
                                <option value={s} key={s}>{s.toUpperCase()}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>

                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setView("cards")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                view === "cards" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500"
                            }`}
                        >
                            Cards
                        </button>
                        <button
                            onClick={() => setView("table")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                view === "table" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500"
                            }`}
                        >
                            Table
                        </button>
                    </div>

                    <button
                        onClick={downloadPDF}
                        disabled={!semester}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                    >
                        <FileText size={18} />
                        Report
                    </button>
                </div>
            </div>

            <main>
                <div className="mb-4">
                    {loading && (
                        <div className="rounded-lg border border-dashed border-slate-200 p-4 sm:p-6 text-center">
                            <div className="font-medium">Loading results…</div>
                            <div className="text-xs sm:text-sm text-slate-500">
                                Fetching data for <strong>{semester}</strong>
                            </div>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {!data && !loading && !error && (
                        <div className="rounded-lg border border-slate-100 p-4 sm:p-6 text-slate-500 text-sm">
                            No data loaded. Choose a semester to begin.
                        </div>
                    )}
                </div>

                {data && data.results && (
                    <section>
                        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <div className="text-xs sm:text-sm text-slate-500">
                                    Showing
                                </div>
                                <h2 className="text-base sm:text-lg font-semibold">
                                    {data.semester} — {data.results.length}{" "}
                                    subjects
                                </h2>
                            </div>
                        </div>

                        {view === "cards" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                                {data.results.map((r) => (
                                    <article
                                        key={r.subject_code}
                                        className="group relative bg-white dark:bg-gray-800/40 rounded-3xl p-5 border border-gray-100 dark:border-gray-700/50 hover:border-blue-500/30 dark:hover:border-blue-400/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/5 overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150 duration-700"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1 min-w-0">
                                                    <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-2">
                                                        {r.subject_code}
                                                    </span>
                                                    <h3 className="font-bold text-gray-900 dark:text-white truncate" title={r.subject_name}>
                                                        {r.subject_name}
                                                    </h3>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">
                                                        {r.pass_percentage}%
                                                    </div>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Passing</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-800/50">
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Present</div>
                                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{r.present_students}</div>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-800/50">
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Fail</div>
                                                    <div className="text-sm font-bold text-rose-500">{r.fail_count}</div>
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-800/50">
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Absent</div>
                                                    <div className="text-sm font-bold text-gray-500">{r.absent_students}</div>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50 flex items-center justify-between text-[10px] font-bold text-gray-400">
                                                <div className="flex gap-4">
                                                    <span>FCD <span className="text-gray-900 dark:text-gray-300 ml-1">{r.fcd_count}</span></span>
                                                    <span>FC <span className="text-gray-900 dark:text-gray-300 ml-1">{r.fc_count}</span></span>
                                                    <span>SC <span className="text-gray-900 dark:text-gray-300 ml-1">{r.sc_count}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="min-w-full divide-y table-auto text-xs sm:text-sm">
                                    <thead>
                                        <tr>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium">
                                                Subject
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                                                Total
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                                                Present
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                                                Absent
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                                                Pass %
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                                                FCD
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                                                FC
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                                                SC
                                            </th>
                                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium">
                                                Fail
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {data.results.map((r) => (
                                            <tr
                                                key={r.subject_code}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium break-words">
                                                    {r.subject_name}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                                                    {r.total_students}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                                                    {r.present_students}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                                                    {r.absent_students}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right font-semibold">
                                                    {r.pass_percentage}%
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                                                    {r.fcd_count}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                                                    {r.fc_count}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                                                    {r.sc_count}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-red-600">
                                                    {r.fail_count}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </section>
                )}
            </main>
        </div>
    );
};

export default SemesterResults;
