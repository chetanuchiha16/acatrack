import React, { useEffect, useState } from "react";
import { 
    getSemesterResultsAuthStaffSemResGet,
    downloadSemesterReportAuthStaffSemResReportSemesterGet
} from "./client/sdk.gen";

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
                query: { semester: selected, batch_year: batchYear }
            });
            if (res.error) {
                throw new Error(
                    (res.error as any)?.error || `Request failed`
                );
            }
            setData(res.data as SemesterData);
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
                query: { batch_year: batchYear }
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
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between flex-wrap gap-3 sm:gap-4 mb-6">
                <div className="flex items-center justify-center">
                    <div className="text-xl sm:text-2xl font-extrabold">
                        Semester Results
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <label className="flex items-center gap-2 backdrop-blur px-3 py-2 rounded-xl  w-40">
                        <select
                            value={semester}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSemester(e.target.value)}
                            className="appearance-none bg-transparent outline-none text-sm font-medium "
                        >
                            {semesters.map((s) => (
                                <option value={s} key={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="inline-flex overflow-hidden rounded-xl border shadow-sm">
                        <button
                            onClick={() => setView("cards")}
                            className={`px-3 py-2 text-xs sm:text-sm ${
                                view === "cards"
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-600"
                            }`}
                        >
                            Cards
                        </button>
                        <button
                            onClick={() => setView("table")}
                            className={`px-3 py-2 text-xs sm:text-sm ${
                                view === "table"
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-600"
                            }`}
                        >
                            Table
                        </button>
                    </div>
                </div>
            </header>

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
                                        className="group rounded-2xl p-3 sm:p-4 shadow hover:shadow-lg transition-shadow border"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="text-[10px] sm:text-xs text-slate-400">
                                                    Subject
                                                </div>
                                                <div className="font-semibold text-base sm:text-lg break-words">
                                                    {r.subject_name} (
                                                    {r.subject_code})
                                                </div>
                                                <div className="text-xs sm:text-sm text-slate-500 mt-1">
                                                    Students: {r.total_students}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xs sm:text-sm font-semibold">
                                                    {r.pass_percentage}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid grid-cols-3 gap-2 text-xs sm:text-sm">
                                            <div className="col-span-1 rounded-lg p-2 text-center">
                                                <div className="text-[10px] sm:text-xs text-slate-400">
                                                    Present
                                                </div>
                                                <div className="font-medium">
                                                    {r.present_students}
                                                </div>
                                            </div>
                                            <div className="col-span-1 rounded-lg p-2 text-center">
                                                <div className="text-[10px] sm:text-xs text-slate-400">
                                                    Absent
                                                </div>
                                                <div className="font-medium">
                                                    {r.absent_students}
                                                </div>
                                            </div>
                                            <div className="col-span-1 rounded-lg p-2 text-center">
                                                <div className="text-[10px] sm:text-xs text-slate-400">
                                                    Fail
                                                </div>
                                                <div className="font-medium">
                                                    {r.fail_count}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between text-[10px] sm:text-xs text-slate-500">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    FCD:{" "}
                                                    <span className="font-medium text-slate-700">
                                                        {r.fcd_count}
                                                    </span>
                                                </div>
                                                <div>
                                                    FC:{" "}
                                                    <span className="font-medium text-slate-700">
                                                        {r.fc_count}
                                                    </span>
                                                </div>
                                                <div>
                                                    SC:{" "}
                                                    <span className="font-medium text-slate-700">
                                                        {r.sc_count}
                                                    </span>
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

                        <button
                            onClick={downloadPDF}
                            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm hover:scale-102"
                            disabled={!semester}
                        >
                            PDF
                        </button>
                    </section>
                )}
            </main>
        </div>
    );
};

export default SemesterResults;
