import React, { useState, useEffect } from "react";

export default function OverallResults() {
    const [semester, setSemester] = useState("");
    const [view, setView] = useState("normal");
    const [data, setData] = useState([]);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("cgpa");
    const [sortDir, setSortDir] = useState("desc");
    const [expandedRow, setExpandedRow] = useState(null);

    const semesterOptions = ["SEM1", "SEM2", "SEM3", "SEM4"];

    const fetchData = async () => {
        if (!semester) return;
        let url = `http://localhost:5000/auth/Staff/overall_res?semester=${semester}`;
        if (view === "toppers") url += "&show_toppers=true";
        if (view === "failed") url += "&show_failed=true";

        const res = await fetch(url);
        const json = await res.json();
        setData(json);
    };

    const downloadPDF = () => {
        if (!semester) return;
        const url = `http://localhost:5000/auth/Staff/report/${semester}`;
        const a = document.createElement("a");
        a.href = url;
        a.download = `${semester}_report.pdf`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Filter and sort data
    const filteredData = data
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
        <div className="max-w-6xl mx-auto p-6 shadow rounded-lg bg-[var(--background)] text-[var(--foreground)] transition-colors">
            <h2 className="text-2xl font-bold mb-4">Overall Performance</h2>

            <div className="flex flex-wrap gap-3 mb-4 items-center">
                <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="border border-gray-400 rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring focus:ring-blue-400"
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
                    className="border border-gray-400 rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring focus:ring-blue-400"
                >
                    <option value="normal">Full Results</option>
                    <option value="toppers">Top 10</option>
                    <option value="failed">Failed Students</option>
                </select>

                <button
                    onClick={fetchData}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    disabled={!semester}
                >
                    Fetch
                </button>

                <button
                    onClick={downloadPDF}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    disabled={!semester}
                >
                    PDF
                </button>

                <input
                    type="text"
                    placeholder="Search by name or USN"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ml-auto border border-gray-400 rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring focus:ring-blue-400 max-w-xs"
                />
            </div>

            <table className="w-full table-auto border-collapse border border-gray-400 text-sm">
                <thead>
                    <tr className="bg-gray-200 dark:bg-gray-700">
                        <th
                            className="border border-gray-400 px-3 py-2 cursor-pointer"
                            onClick={() => toggleSort("name")}
                        >
                            Name{" "}
                            {sortBy === "name"
                                ? sortDir === "asc"
                                    ? "↑"
                                    : "↓"
                                : ""}
                        </th>
                        <th
                            className="border border-gray-400 px-3 py-2 cursor-pointer"
                            onClick={() => toggleSort("usn")}
                        >
                            USN{" "}
                            {sortBy === "usn"
                                ? sortDir === "asc"
                                    ? "↑"
                                    : "↓"
                                : ""}
                        </th>
                        <th
                            className="border border-gray-400 px-3 py-2 cursor-pointer"
                            onClick={() => toggleSort("cgpa")}
                        >
                            CGPA{" "}
                            {sortBy === "cgpa"
                                ? sortDir === "asc"
                                    ? "↑"
                                    : "↓"
                                : ""}
                        </th>
                        <th
                            className="border border-gray-400 px-3 py-2 cursor-pointer"
                            onClick={() => toggleSort("percentage")}
                        >
                            Percentage{" "}
                            {sortBy === "percentage"
                                ? sortDir === "asc"
                                    ? "↑"
                                    : "↓"
                                : ""}
                        </th>
                        <th className="border border-gray-400 px-3 py-2">
                            Credits
                        </th>
                        <th className="border border-gray-400 px-3 py-2">
                            Passed Subjects
                        </th>
                        <th className="border border-gray-400 px-3 py-2">
                            Failed Subjects
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
                                        setExpandedRow(isExpanded ? null : idx)
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
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <strong>IA Marks:</strong>
                                                    <ul className="list-disc list-inside">
                                                        {student.ia_marks.map(
                                                            (mark, i) => (
                                                                <li key={i}>
                                                                    Subject{" "}
                                                                    {i + 1}:{" "}
                                                                    {mark}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <strong>SEE Marks:</strong>
                                                    <ul className="list-disc list-inside">
                                                        {student.see_marks.map(
                                                            (mark, i) => (
                                                                <li key={i}>
                                                                    Subject{" "}
                                                                    {i + 1}:{" "}
                                                                    {mark}
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                                <div>
                                                    <strong>Pass/Fail:</strong>
                                                    <ul className="list-disc list-inside">
                                                        {student.pass_fail.map(
                                                            (pf, i) => (
                                                                <li key={i}>
                                                                    Subject{" "}
                                                                    {i + 1}:{" "}
                                                                    {pf}
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
    );
}
