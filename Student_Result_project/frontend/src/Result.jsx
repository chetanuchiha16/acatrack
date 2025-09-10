import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "./config";
import ResultCardView from "./ResultCardView";
import StudentAIInsights from "./StudentAIInsights";
export default function Result({ usn, semester, view }) {
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    // const [view, setView] = useState("table");

    const fetchStudent = async () => {
        if (!usn || !semester) return;
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_BASE}/auth/Student/result`, {
                params: { usn, semester },
                withCredentials: true
            });
            setData(res.data);
            setError("");
        } catch (err) {
            setError(err.response?.data?.error || "Something went wrong.");
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usn, semester]);

    const subjects = Array.isArray(data?.subjects) ? data.subjects : [];

    return (
        <div className="w-full">
            <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md">
                {loading && (
                    <div className="text-center py-6">
                        <div className="inline-block animate-pulse px-4 py-2 bg-gray-100 dark:bg-gray-900 rounded">
                            Loading results...
                        </div>
                    </div>
                )}

                {error && !loading && (
                    <div className="text-center py-4">
                        <p className="text-red-600 dark:text-red-400 font-semibold">
                            {error}
                        </p>
                    </div>
                )}
                {view === "cards" && data && !loading && (
                    <div className="space-y-5 hidden sm:block">
                        {/* Title */}
                        <h2 className="text-base sm:text-2xl font-bold text-center text-blue-600 dark:text-blue-400">
                            Student Report
                        </h2>

                        {/* Student Info Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Name
                                </p>
                                <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                                    {data.name}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    USN
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200 truncate">
                                    {data.usn}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    SGPA
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {data.sgpa.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Percentage
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {data.percentage.toFixed(2)}%
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Total Marks
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {data.total_marks}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Credits
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {data.credits}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    CGPA
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {data.cgpa.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Status
                                </p>
                                <p className="font-medium">
                                    <span
                                        className={
                                            data.status === "Pass"
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-red-600 dark:text-red-400"
                                        }
                                    >
                                        {data.status}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Subjects Section */}
                        <div className="w-full max-w-6xl mx-auto mt-4 sm:mt-8 p-4 sm:p-6 rounded-xl bg-white dark:bg-slate-900 shadow-lg h-full flex flex-col gap-6">
                            <h3 className="text-sm sm:text-lg font-semibold text-blue-500 mb-2">
                                Subjects
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {data.subjects.map((sub, idx) => (
                                    <div
                                    key={idx}
                                    className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-md p-3"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                                        {idx + 1}.{" "}
                                                        {sub.subject_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                        {sub.code}
                                                    </div>
                                                </div>
                                                <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                                    IA:{" "}
                                                    <span className="font-semibold">
                                                        {sub.ia}
                                                    </span>{" "}
                                                    • SEE:{" "}
                                                    <span className="font-semibold">
                                                        {sub.see}
                                                    </span>{" "}
                                                    • Total:{" "}
                                                    <span className="font-semibold">
                                                        {sub.total}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-3 text-right">
                                                <div
                                                    className={`text-xs font-semibold ${
                                                        sub.status === "Pass"
                                                            ? "text-green-600"
                                                            : "text-red-600"
                                                    }`}
                                                >
                                                    {sub.status}
                                                </div>
                                                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                                    {sub.credit} cr
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Download Button */}
                        <div className="flex items-center justify-center mt-3 !text-white">
                            {data.pdf_url ? (
                                <a
                                    href={data.pdf_url}
                                    download
                                    className="inline-block px-4 py-2 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                >
                                    📄 Download Report
                                </a>
                            ) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    No downloadable report available
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {view === "table" && data && !loading && (
                    <div className="space-y-5">
                        {/* Title */}
                        <h2 className="text-base sm:text-2xl font-bold text-center text-blue-600 dark:text-blue-400">
                            Student Report
                        </h2>

                        {/* Student Info */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Name
                                </p>
                                <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                                    {data.name}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    USN
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200 truncate">
                                    {data.usn}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    SGPA
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {(data.sgpa ?? 0).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Percentage
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {(data.percentage ?? 0).toFixed(2)}%
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Total Marks
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {data.total_marks ?? "-"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Credits
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {data.credits ?? "-"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    CGPA
                                </p>
                                <p className="font-medium text-gray-700 dark:text-gray-200">
                                    {(data.cgpa ?? 0).toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-300">
                                    Status
                                </p>
                                <p className="font-medium">
                                    <span
                                        className={
                                            data.status === "Pass"
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-red-600 dark:text-red-400"
                                        }
                                    >
                                        {data.status ?? "-"}
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* ---------- MOBILE: stacked cards (visible on small screens) ---------- */}
                        <div className="sm:hidden">
                            <h3 className="text-sm font-semibold text-blue-500 mb-1 w-full max-w-6xl mx-auto mt-4 sm:mt-8 p-4 sm:p-6 rounded-xl bg-white dark:bg-slate-900 shadow-lg h-full flex flex-col gap-6">
                                Subjects
                            </h3>
                            <div className="space-y-2">
                                {subjects.length > 0 ? (
                                    subjects.map((sub, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-md p-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                                                            {idx + 1}.{" "}
                                                            {sub.subject_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                                            {sub.code}
                                                        </div>
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                                        IA:{" "}
                                                        <span className="font-semibold">
                                                            {sub.ia}
                                                        </span>{" "}
                                                        • SEE:{" "}
                                                        <span className="font-semibold">
                                                            {sub.see}
                                                        </span>{" "}
                                                        • Total:{" "}
                                                        <span className="font-semibold">
                                                            {sub.total}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="ml-3 text-right">
                                                    <div
                                                        className={`text-xs font-semibold ${
                                                            sub.status ===
                                                            "Pass"
                                                                ? "text-green-600"
                                                                : "text-red-600"
                                                        }`}
                                                    >
                                                        {sub.status}
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                                        {sub.credit} cr
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-600 dark:text-gray-300">
                                        No subjects found for this semester.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ---------- DESKTOP / TABLET: full table (hidden on small screens) ---------- */}
                        <div className="hidden sm:block w-full max-w-6xl mx-auto mt-4 sm:mt-8 p-4 sm:p-6 rounded-xl bg-white dark:bg-slate-900 shadow-lg h-full  flex-col gap-6">
                            <h3 className="text-sm sm:text-lg font-semibold text-blue-500 mb-2">
                                Subjects
                            </h3>
                            <div className="w-full overflow-x-auto">
                                <table className="w-full text-sm sm:text-base table-fixed border-collapse">
                                    <colgroup>
                                        <col style={{ width: "4%" }} />
                                        <col style={{ width: "48%" }} />
                                        <col style={{ width: "16%" }} />
                                        <col style={{ width: "6%" }} />
                                        <col style={{ width: "6%" }} />
                                        <col style={{ width: "6%" }} />
                                        <col style={{ width: "8%" }} />
                                        {/* increased spacing for Credits */}
                                        <col style={{ width: "6%" }} />
                                    </colgroup>
                                    <thead>
                                        <tr className="text-left text-xs sm:text-sm text-gray-500 uppercase">
                                            <th className="px-2 py-2 text-center">
                                                #
                                            </th>
                                            <th className="px-2 py-2 text-center">
                                                Subject
                                            </th>
                                            <th className="px-2 py-2 text-center">
                                                Code
                                            </th>
                                            <th className="px-2 py-2 text-center">
                                                IA
                                            </th>
                                            <th className="px-2 py-2 text-center">
                                                SEE
                                            </th>
                                            <th className="px-2 py-2 text-center">
                                                Total
                                            </th>
                                            <th className="px-2 py-2 text-center">
                                                Credits
                                            </th>
                                            <th className="px-2 py-2 text-center">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjects.length > 0 ? (
                                            subjects.map((sub, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="border-t border-gray-100 dark:border-gray-700"
                                                >
                                                    <td className="px-2 py-2 text-center">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        {sub.subject_name}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        {sub.code}
                                                    </td>
                                                    <td className="px-2 py-2 text-center font-semibold">
                                                        {sub.ia}
                                                    </td>
                                                    <td className="px-2 py-2 text-center font-semibold">
                                                        {sub.see}
                                                    </td>
                                                    <td className="px-2 py-2 text-center font-semibold">
                                                        {sub.total}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        {sub.credit}
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <span
                                                            className={
                                                                sub.status ===
                                                                "Pass"
                                                                ? "text-green-600"
                                                                    : "text-red-600"
                                                            }
                                                        >
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td
                                                    className="px-2 py-4"
                                                    colSpan={8}
                                                >
                                                    <div className="text-center text-gray-600 dark:text-gray-300">
                                                        No subjects found for
                                                        this semester.
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                            {data && !loading && (
                                <div className="mt-6">
                                    <StudentAIInsights usn={data.usn} semester={semester} />
                                </div>
                            )}
                        {/* Actions */}
                        <div className="flex items-center justify-center mt-3 !text-white">
                            {data.pdf_url ? (
                                <a
                                    href={data.pdf_url}
                                    download
                                    className="inline-block px-4 py-2 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                >
                                    📄 Download Report
                                </a>
                            ) : (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    No downloadable report available
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
