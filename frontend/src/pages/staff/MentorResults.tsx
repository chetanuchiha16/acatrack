import React, { useEffect, useState, useCallback } from "react";
import { Users, ChevronDown, Search, FileText, BarChart3 } from "lucide-react";
import { 
    getMentorStudentsAuthStaffMentorResultGet, 
    getMenteeChartAuthStaffMentorChartGet 
} from "../../client/sdk.gen";
import type { StudentResultResponse as MenteeResult } from "../../client/types.gen";
import { parseApiError } from "../../utils/errorHandler";
import useStaffStore from "../../store/useStaffStore";

interface MentorResultsProps {
    mentor_id?: string;
    batchYear: string;
}

const MentorResults: React.FC<MentorResultsProps> = ({ mentor_id, batchYear }) => {
    const { availableSems, fetchAvailableSemesters } = useStaffStore();
    const [semester, setSemester] = useState<string>("sem1");

    useEffect(() => {
        if (batchYear) {
            void fetchAvailableSemesters(batchYear);
        }
    }, [batchYear, fetchAvailableSemesters]);

    useEffect(() => {
        if (availableSems.length > 0 && !availableSems.includes(semester)) {
            setSemester(availableSems[availableSems.length - 1]);
        }
    }, [availableSems, semester]);
    const [mentees, setMentees] = useState<MenteeResult[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedMentee, setSelectedMentee] = useState<string | null>(null);
    const [chartData, setChartData] = useState<string>("");
    const [expandedMentees, setExpandedMentees] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState<string>("");

    const fetchMentees = useCallback(async () => {
        if (!mentor_id) return;
        setLoading(true);
        try {
            const { data } = await getMentorStudentsAuthStaffMentorResultGet({
                query: {
                    mentor_id: Number(mentor_id),
                    semester,
                    batch_year: Number(batchYear)
                }
            });
            if (data) setMentees(data as unknown as MenteeResult[]);
        } catch (err) {
            console.error(err);
            alert(parseApiError(err) || "Failed to fetch mentees.");
        } finally {
            setLoading(false);
        }
    }, [mentor_id, semester, batchYear]);

    useEffect(() => {
        if (mentor_id && batchYear) void fetchMentees();
    }, [mentor_id, batchYear, fetchMentees]);

    const fetchChart = async (usn: string) => {
        try {
            const { data } = await getMenteeChartAuthStaffMentorChartGet({
                query: {
                    usn,
                    semester,
                    batch_year: Number(batchYear)
                }
            });
            const dataObj = data as { image?: string };
            const chartImage = dataObj?.image;
            if (chartImage) {
                setChartData(chartImage);
                setSelectedMentee(usn);
            }
        } catch (err) {
            console.error(err);
            alert(parseApiError(err) || "Failed to fetch chart.");
        }
    };

    const toggleExpand = (usn: string) => {
        setExpandedMentees((prev) => ({
            ...prev,
            [usn]: !prev[usn],
        }));
    };

    // Filter mentees based on searchTerm
    const filteredMentees = mentees.filter(
        (mentee) =>
            mentee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mentee.usn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-full">
            {/* Header / Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-2xl">
                        <Users className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Mentee Progress</h2>
                        <p className="text-xs text-gray-500 mt-1">Track academic performance of your mentees</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none appearance-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm min-w-[140px]"
                        >
                            {availableSems.map((sem) => (
                                <option key={sem} value={sem}>{sem.toUpperCase()}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>

                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search mentees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-full sm:w-64 shadow-sm"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 font-medium">Syncing performance data...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredMentees.length === 0 && (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                             <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4 inline-block">
                                <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No mentees found matching your search.</p>
                        </div>
                    )}
                    
                    {filteredMentees.map((mentee) => (
                        <div
                            key={mentee.usn}
                            className="bg-white dark:bg-gray-800/40 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-xl transition-all duration-300 hover:border-blue-500/30"
                        >
                            {/* Mentee Header */}
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-500/20">
                                        {mentee.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{mentee.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{mentee.usn}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{semester.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-8">
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">SGPA</div>
                                        <div className="text-xl font-black text-gray-900 dark:text-white">{mentee.sgpa}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">CGPA</div>
                                        <div className="text-xl font-black text-gray-900 dark:text-white">{mentee.cgpa}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Marks</div>
                                        <div className="text-xl font-black text-gray-900 dark:text-white">{mentee.total_marks}</div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <a
                                        href={mentee.pdf_url || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-xs font-bold transition-all border border-gray-100 dark:border-gray-700"
                                    >
                                        <FileText size={16} />
                                        Report
                                    </a>
                                    <button
                                        onClick={() => void fetchChart(mentee.usn)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl text-xs font-bold transition-all border border-gray-100 dark:border-gray-700"
                                    >
                                        <BarChart3 size={16} />
                                        Chart
                                    </button>
                                    <button
                                        onClick={() => toggleExpand(mentee.usn)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                    >
                                        {expandedMentees[mentee.usn] ? "Hide Detail" : "View Detail"}
                                    </button>
                                </div>
                            </div>
                            {/* Subjects Detailed View */}
                            {expandedMentees[mentee.usn] && (
                                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-700/50 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                <tr>
                                                    <th className="px-6 py-4">Subject</th>
                                                    <th className="px-6 py-4 text-center">IA</th>
                                                    <th className="px-6 py-4 text-center">SEE</th>
                                                    <th className="px-6 py-4 text-center">Total</th>
                                                    <th className="px-6 py-4 text-center">Credits</th>
                                                    <th className="px-6 py-4 text-right">Result</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {mentee.subjects.map((sub) => (
                                                    <tr key={sub.code} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-gray-900 dark:text-white">{sub.subject_name}</div>
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase">{sub.code}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-medium">{sub.ia}</td>
                                                        <td className="px-6 py-4 text-center font-medium">{sub.see}</td>
                                                        <td className="px-6 py-4 text-center font-black text-blue-600 dark:text-blue-400">{sub.total}</td>
                                                        <td className="px-6 py-4 text-center font-medium">{sub.credit}</td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                                                sub.status === "Pass" 
                                                                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" 
                                                                    : "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
                                                            }`}>
                                                                {sub.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {/* Premium Chart Modal */}
            {chartData && selectedMentee && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden relative border border-white/20">
                        <button
                            onClick={() => setChartData("")}
                            className="absolute top-6 right-6 w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-rose-500 hover:text-white text-gray-500 rounded-full flex items-center justify-center transition-all z-10"
                        >
                            ✕
                        </button>
                        
                        <div className="p-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                    <BarChart3 className="w-6 h-6 text-emerald-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-none">Performance Chart</h2>
                                    <p className="text-sm text-gray-500 mt-1">Academic trajectory for {selectedMentee}</p>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-4 border border-gray-100 dark:border-gray-700/50">
                                <img
                                    src={chartData}
                                    alt="Student Performance Trajectory"
                                    className="w-full h-auto rounded-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MentorResults;
