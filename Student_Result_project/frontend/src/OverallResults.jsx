import React, { useState } from "react";
import API_BASE from "./config";
import { fetchWithAuth } from "./fetchWithAuth";
export default function OverallResults({ batchYear }) {
    const [semester, setSemester] = useState("");
    const [view, setView] = useState("normal");
    const [data, setData] = useState([]);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("cgpa");
    const [sortDir, setSortDir] = useState("desc");
    const [expandedRow, setExpandedRow] = useState(null);

    const semesterOptions = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6"];

    const fetchData = async () => {
        if (!semester) return;
        let url = `${API_BASE}/auth/Staff/overall_res?semester=${semester}&batch_year=${batchYear}`;
        if (view === "toppers") url += "&show_toppers=true";
        if (view === "failed") url += "&show_failed=true";

        const res = await fetchWithAuth(url, {
            // <-- this ensures cookies/session are sent
        });
        const json = await res.json();
        setData(json);
    };

    const downloadPDF = async () => {
        if (!semester) return;
        let url;
        if (view === "toppers") {
            // Top 10 Toppers PDF
            url = `${API_BASE}/auth/Staff/overall_res?semester=${semester}&show_toppers=true&format=pdf&batch_year=${batchYear}`;
        } else {
            // Full report as before
            url = `${API_BASE}/auth/Staff/report/${semester}?batch_year=${batchYear}`;
        }
        try {
            const response = await fetchWithAuth(url, {});
            if (!response.ok) {
                console.error("PDF download failed", response.status);
                return;
            }
            const blob = await response.blob();
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download =
                view === "toppers"
                    ? `${semester}_toppers_list.pdf`
                    : `${semester}_report.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        } catch (err) {
            console.error("Error downloading PDF:", err);
        }
    };

    // Filter out invalid entries first
    const validData = data.filter((student) => student.name && student.usn);

    // Then apply search and sorting
    const filteredData = validData
        .filter(
            (student) =>
                student.name.toLowerCase().includes(search.toLowerCase()) ||
                student.usn.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            if (sortDir === "asc") return a[sortBy] > b[sortBy] ? 1 : -1;
            else return a[sortBy] < b[sortBy] ? 1 : -1;
        });

    const toggleSort = (column) => {
        if (sortBy === column) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortDir("asc");
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 rounded-lg bg-[var(--background)] text-[var(--foreground)] transition-colors">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">
                Overall Performance
            </h2>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mb-4 items-start sm:items-center">
                <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="border border-gray-400 rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
                >
                    <option value="">Select Semester</option>
                    {semesterOptions.map((sem) => (
                        <option key={sem} value={sem}>
                            {sem}
                        </option>
                    ))}
                </select>

                <select
                    value={view}
                    onChange={(e) => setView(e.target.value)}
                    className="border border-gray-400 rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
                >
                    <option value="normal">Full Results</option>
                    <option value="toppers">Top 10</option>
                    <option value="failed">Failed Students</option>
                </select>

                <button
                    onClick={fetchData}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
                    disabled={!semester}
                >
                    Fetch
                </button>

                <button
                    onClick={downloadPDF}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm w-full sm:w-auto"
                    disabled={!semester}
                >
                    PDF
                </button>

                <input
                    type="text"
                    placeholder="Search by name or USN"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border border-gray-400 rounded-lg px-3 py-2 text-sm w-full sm:w-auto sm:ml-auto"
                />
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-400 text-sm">
                    <thead>
                        <tr className="bg-gray-200 dark:bg-gray-700">
                            {["name", "usn", "cgpa", "percentage"].map(
                                (col) => (
                                    <th
                                        key={col}
                                        className="border border-gray-400 px-3 py-2 cursor-pointer whitespace-nowrap"
                                        onClick={() => toggleSort(col)}
                                    >
                                        {col.toUpperCase()}{" "}
                                        {sortBy === col
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </th>
                                )
                            )}
                            <th className="border border-gray-400 px-3 py-2">
                                Credits
                            </th>
                            <th className="border border-gray-400 px-3 py-2">
                                Passed
                            </th>
                            <th className="border border-gray-400 px-3 py-2">
                                Failed
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-4">
                                    No results found.
                                </td>
                            </tr>
                        )}
                        {filteredData.map((student, idx) => {
                            const passCount = student.pass_fail.filter(
                                (p) => p === "Pass"
                            ).length;
                            const failCount = student.pass_fail.filter(
                                (p) => p === "Fail"
                            ).length;
                            const isExpanded = expandedRow === idx;

                            return (
                                <React.Fragment key={student.usn}>
                                    <tr
                                        className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                                            isExpanded
                                                ? "bg-gray-100 dark:bg-gray-800"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setExpandedRow(
                                                isExpanded ? null : idx
                                            )
                                        }
                                    >
                                        <td className="border border-gray-400 px-3 py-2">
                                            {student.name}
                                        </td>
                                        <td className="border border-gray-400 px-3 py-2">
                                            {student.usn}
                                        </td>
                                        <td className="border border-gray-400 px-3 py-2">
                                            {student.cgpa.toFixed(2)}
                                        </td>
                                        <td className="border border-gray-400 px-3 py-2">
                                            {student.percentage.toFixed(2)}%
                                        </td>
                                        <td className="border border-gray-400 px-3 py-2">
                                            {student.obtained_credits}
                                        </td>
                                        <td className="border border-gray-400 px-3 py-2">
                                            {passCount}
                                        </td>
                                        <td className="border border-gray-400 px-3 py-2">
                                            {failCount}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="bg-gray-50 dark:bg-gray-900">
                                            <td
                                                colSpan={7}
                                                className="px-4 py-2 text-xs"
                                            >
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <strong>
                                                            IA Marks:
                                                        </strong>
                                                        <ul className="list-disc list-inside">
                                                            {student.ia_marks.map(
                                                                (mark, i) => (
                                                                    // <li key={i}>Subject {i + 1}: {mark}</li>
                                                                    <li key={i}>
                                                                        {
                                                                            student
                                                                                .subject_names[
                                                                                i
                                                                            ]
                                                                        }
                                                                        : {mark}
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>
                                                            SEE Marks:
                                                        </strong>
                                                        <ul className="list-disc list-inside">
                                                            {student.see_marks.map(
                                                                (mark, i) => (
                                                                    // <li key={i}>Subject {i + 1}: {mark}</li>
                                                                    <li key={i}>
                                                                        {
                                                                            student
                                                                                .subject_names[
                                                                                i
                                                                            ]
                                                                        }
                                                                        : {mark}
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </div>
                                                    <div>
                                                        <strong>
                                                            Pass/Fail:
                                                        </strong>
                                                        <ul className="list-disc list-inside">
                                                            {student.pass_fail.map(
                                                                (pf, i) => (
                                                                    // <li key={i}>Subject {i + 1}: {pf}</li>
                                                                    <li key={i}>
                                                                        {
                                                                            student
                                                                                .subject_names[
                                                                                i
                                                                            ]
                                                                        }
                                                                        : {pf}
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
