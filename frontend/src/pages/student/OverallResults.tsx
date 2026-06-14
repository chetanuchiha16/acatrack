import React, { useState, useEffect } from "react";
import { Trophy, ChevronDown, Search, FileText } from "lucide-react";
import { 
    getAcademicPerformanceAuthStaffOverallResGet,
    getReportAuthStaffReportSemesterGet
} from "../../client/sdk.gen";

interface OverallResultsProps {
    batchYear: string;
}

interface StudentResult {
    name: string;
    usn: string;
    cgpa: number;
    percentage: number;
    obtained_credits: number;
    pass_fail: string[];
    ia_marks: number[];
    see_marks: number[];
    subject_names: string[];
}

import useStaffStore from "../../store/useStaffStore";

const OverallResults: React.FC<OverallResultsProps> = ({ batchYear }) => {
    const { semester, section, assignments } = useStaffStore();
    const [view, setView] = useState<string>("normal");
    const [data, setData] = useState<StudentResult[]>([]);
    const [search, setSearch] = useState<string>("");
    const [sortBy, setSortBy] = useState<keyof StudentResult | "">("cgpa");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [expandedRow, setExpandedRow] = useState<number | null>(null);

    useEffect(() => {
        if (semester && batchYear) {
            const semAssignments = assignments.filter(
                a => a.semester === semester && a.section_name
            );
            const assignedSections = Array.from(
                new Set(semAssignments.map(a => a.section_name as string))
            );

            if (assignedSections.length > 0 && assignedSections.includes(section)) {
                void fetchData(semester, section);
            } else {
                setData([]);
            }
        } else {
            setData([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchYear, semester, section, view, assignments]);

    const fetchData = async (selectedSem: string, selectedSec: string) => {
        try {
            const res = await getAcademicPerformanceAuthStaffOverallResGet({
                query: { 
                    semester: selectedSem, 
                    section: selectedSec,
                    batch_year: parseInt(batchYear, 10),
                    show_toppers: view === "toppers" ? true : undefined,
                    show_failed: view === "failed" ? true : undefined
                }
            });
            if (res.data) {
                setData(res.data as unknown as StudentResult[]);
            } else {
                setData([]);
            }
        } catch (error) {
            console.error("Failed to fetch overall results:", error);
            setData([]);
        }
    };

    const downloadPDF = async () => {
        if (!semester || !section || section === "ALL") return;
        try {
            let res;
            if (view === "toppers") {
                res = await getAcademicPerformanceAuthStaffOverallResGet({
                    query: { 
                        semester, 
                        section,
                        batch_year: parseInt(batchYear, 10),
                        show_toppers: true,
                        format: "pdf" as "pdf" | "json" | undefined
                    }
                });
            } else {
                res = await getReportAuthStaffReportSemesterGet({
                    path: { semester },
                    query: { 
                        batch_year: parseInt(batchYear, 10),
                        section
                    }
                });
            }

            if (res.error) {
                console.error("PDF download failed", res.error);
                return;
            }
            const blob = res.data as unknown as Blob;
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

    // Filter out invalid entries first safely
    const validData = Array.isArray(data) ? data.filter((student) => student?.name && student?.usn) : [];

    // Then apply search and sorting
    const filteredData = validData
        .filter(
            (student) =>
                student.name.toLowerCase().includes(search.toLowerCase()) ||
                student.usn.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            if (!sortBy) return 0;
            const aVal = a[sortBy];
            const bVal = b[sortBy];
            
            if (aVal === undefined || bVal === undefined) return 0;

            if (sortDir === "asc") {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

    const toggleSort = (column: keyof StudentResult) => {
        if (sortBy === column) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortBy(column);
            setSortDir("asc");
        }
    };

    return (
        <div className="w-full h-full flex flex-col overflow-hidden">
            {/* Sticky Header with Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-2xl">
                        <Trophy className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Overall Rankings</h2>
                        <p className="text-xs text-gray-500 mt-1">Cohort performance and analytics</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">

                    <div className="relative">
                        <select
                            value={view}
                            onChange={(e) => setView(e.target.value)}
                            className="pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none appearance-none focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer shadow-sm min-w-[140px]"
                        >
                            <option value="normal">Full Cohort</option>
                            <option value="toppers">Top 10</option>
                            <option value="failed">Backlogs</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search cohort..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all w-full sm:w-64 shadow-sm"
                        />
                    </div>

                    <button
                        onClick={downloadPDF}
                        disabled={!semester}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                    >
                        <FileText size={18} />
                        Export
                    </button>
                </div>
            </div>

            {/* Scrollable Table Area */}
            <div className="flex-1 min-h-0 bg-white dark:bg-gray-800/20 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 overflow-hidden flex flex-col">
                <div className="overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900/80 backdrop-blur-md z-20 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4 cursor-pointer hover:text-purple-600 transition-colors" onClick={() => toggleSort("name")}>
                                    <div className="flex items-center gap-1">Student {sortBy === "name" && (sortDir === "asc" ? "↑" : "↓")}</div>
                                </th>
                                <th className="px-6 py-4 cursor-pointer hover:text-purple-600 transition-colors" onClick={() => toggleSort("usn")}>
                                    <div className="flex items-center gap-1">USN {sortBy === "usn" && (sortDir === "asc" ? "↑" : "↓")}</div>
                                </th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:text-purple-600 transition-colors" onClick={() => toggleSort("cgpa")}>
                                    <div className="flex items-center justify-center gap-1">CGPA {sortBy === "cgpa" && (sortDir === "asc" ? "↑" : "↓")}</div>
                                </th>
                                <th className="px-6 py-4 text-center cursor-pointer hover:text-purple-600 transition-colors" onClick={() => toggleSort("percentage")}>
                                    <div className="flex items-center justify-center gap-1">Score % {sortBy === "percentage" && (sortDir === "asc" ? "↑" : "↓")}</div>
                                </th>
                                <th className="px-6 py-4 text-center">Credits</th>
                                <th className="px-6 py-4 text-right">Performance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-gray-500 font-medium">
                                        {assignments.length > 0 && assignments.filter(a => a.semester === semester).length === 0 ? (
                                            "You do not have any assigned classes/sections in this semester."
                                        ) : (
                                            "No academic records found for this selection."
                                        )}
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((student, idx) => {
                                    const passCount = (student.pass_fail || []).filter(p => p === "Pass").length;
                                    const failCount = (student.pass_fail || []).filter(p => p === "Fail").length;
                                    const isExpanded = expandedRow === idx;

                                    return (
                                        <React.Fragment key={student.usn}>
                                            <tr 
                                                className={`group hover:bg-purple-50/50 dark:hover:bg-purple-900/10 cursor-pointer transition-all ${isExpanded ? "bg-purple-50/30 dark:bg-purple-900/10" : ""}`}
                                                onClick={() => setExpandedRow(isExpanded ? null : idx)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">{student.name}</div>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-400">{student.usn}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="font-black text-gray-900 dark:text-white">
                                                        {student.cgpa !== undefined ? student.cgpa.toFixed(2) : "0.00"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-400">
                                                        {student.percentage !== undefined ? student.percentage.toFixed(1) : "0.0"}%
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold">{student.obtained_credits}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-black uppercase tracking-tighter">
                                                            {passCount} Pass
                                                        </span>
                                                        {failCount > 0 && (
                                                            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-md text-[10px] font-black uppercase tracking-tighter">
                                                                {failCount} Fail
                                                            </span>
                                                        )}
                                                        <ChevronDown className={`transition-transform duration-300 text-gray-300 ${isExpanded ? "rotate-180" : ""}`} size={14} />
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-gray-50/50 dark:bg-gray-900/50 animate-in slide-in-from-top-2 duration-300">
                                                    <td colSpan={6} className="px-6 py-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <DetailCard title="Internal Assessment" icon={<FileText size={14} />} items={student.ia_marks} subjects={student.subject_names} color="blue" />
                                                            <DetailCard title="Semester End Exam" icon={<Search size={14} />} items={student.see_marks} subjects={student.subject_names} color="purple" />
                                                            <DetailCard title="Subject Status" icon={<Trophy size={14} />} items={student.pass_fail} subjects={student.subject_names} color="emerald" />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

interface DetailCardProps {
    title: string;
    icon: React.ReactNode;
    items: (string | number)[];
    subjects: string[];
    color: string;
}

const DetailCard = ({ title, icon, items, subjects, color }: DetailCardProps) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 bg-${color}-500/10 text-${color}-500 rounded-lg`}>{icon}</div>
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">{title}</h4>
        </div>
        <div className="space-y-1.5">
            {(items || []).map((val, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 dark:border-gray-700 last:border-0">
                    <span className="text-gray-500 font-medium truncate pr-4">{(subjects || [])[i] || `Subject ${i + 1}`}</span>
                    <span className={`font-bold ${val === 'Fail' ? 'text-rose-500' : 'text-gray-900 dark:text-gray-200'}`}>{val}</span>
                </div>
            ))}
        </div>
    </div>
);

export default OverallResults;

