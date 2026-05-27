import React, { useState, useEffect } from "react";
import { ChevronDown, FileText, Search } from "lucide-react";
import { subjectMapping } from "../../config";
import { 
    getSubjectResultsAuthStaffSubResGet,
    getSubjectReportPdfAuthStaffSubResReportGet
} from "../../client/sdk.gen";

interface SubjectResultsProps {
    batchYear: string;
}

interface StatProps {
    label: string;
    value: string | number;
    highlight?: boolean;
    danger?: boolean;
}

interface SubjectData {
    subject_name: string;
    subject_code: string;
    semester: string;
    total_students: number;
    present_students: number;
    absent_students: number;
    pass_percentage: number;
    pass_count: number;
    fcd_count: number;
    fc_count: number;
    sc_count: number;
    fail_count: number;
}

import useStaffStore from "../../store/useStaffStore";

const SubjectResults: React.FC<SubjectResultsProps> = ({ batchYear }) => {
    const { semester, assignments } = useStaffStore();
    const [subject, setSubject] = useState<string>("");
    const [data, setData] = useState<SubjectData | null>(null);

    useEffect(() => {
        if (semester && subject && batchYear) {
            void fetchData();
        } else {
            setData(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [semester, subject, batchYear]);

    const fetchData = async () => {
        if (!semester || !subject || !batchYear) return;
        try {
            const res = await getSubjectResultsAuthStaffSubResGet({
                query: { semester, subject, batch_year: parseInt(batchYear, 10) }
            });
            if (res.data) {
                setData(res.data as unknown as SubjectData);
            } else {
                setData(null);
            }
        } catch (error) {
            console.error("Failed to fetch subject data:", error);
            setData(null);
        }
    };

    const downloadPDF = async () => {
        if (!semester) return;

        try {
            const res = await getSubjectReportPdfAuthStaffSubResReportGet({
                query: { semester, subject, batch_year: parseInt(batchYear, 10) }
            });

            if (res.error) {
                console.error("PDF download failed");
                return;
            }

            const blob = res.data as unknown as Blob;
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `${semester}_report.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error("Failed to download PDF:", error);
        }
    };
    
    // Safety check to handle potential unmapped semesters gracefully
    const currentMapping = semester ? subjectMapping[semester as keyof typeof subjectMapping] : undefined;
    const allMappedSubjects = currentMapping 
        ? Object.entries(currentMapping) 
        : [];

    // Filter to only show teacher's assignments if they exist
    const teacherAssignmentsForSem = assignments.filter(a => a.semester === semester);
    const displayedSubjects = teacherAssignmentsForSem.length > 0
        ? teacherAssignmentsForSem.map(a => [a.subject_code, a.subject_name])
        : allMappedSubjects;

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl">
                        <Search className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Subject Analysis</h2>
                        <p className="text-xs text-gray-500 mt-1">Deep dive into individual subject performance</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">

                    <div className="relative">
                        <select
                            value={subject}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSubject(e.target.value)}
                            disabled={!semester}
                            className="pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-200 outline-none appearance-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-sm min-w-[200px] disabled:opacity-50"
                        >
                            <option value="">Select Subject</option>
                            {semester && displayedSubjects.map(([code, name]) => (
                                <option key={code} value={code}>{String(name)}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>

                    <button
                        onClick={downloadPDF}
                        disabled={!semester || !subject}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50"
                    >
                        <FileText size={18} />
                        Report
                    </button>
                </div>
            </div>

            {/* Stats Card */}
            {data ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-800/40 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <FileText className="w-5 h-5 text-blue-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Subject Statistics</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <Stat label="Total" value={data.total_students} />
                                <Stat label="Present" value={data.present_students} />
                                <Stat label="Absent" value={data.absent_students} />
                                <Stat label="Pass %" value={`${data.pass_percentage}%`} highlight />
                            </div>

                            <div className="mt-8 grid grid-cols-3 sm:grid-cols-5 gap-4">
                                <Stat label="Passed" value={data.pass_count} />
                                <Stat label="FCD" value={data.fcd_count} />
                                <Stat label="FC" value={data.fc_count} />
                                <Stat label="SC" value={data.sc_count} />
                                <Stat label="Fail" value={data.fail_count} danger />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20">
                            <h4 className="text-sm font-bold opacity-80 uppercase tracking-wider mb-2">Selected Subject</h4>
                            <div className="text-3xl font-black mb-1">{data.subject_code}</div>
                            <div className="text-lg font-medium opacity-90 mb-4">{data.subject_name}</div>
                            <div className="inline-flex px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase">
                                {data.semester.toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
                        <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Detailed Subject View</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                        Select a semester and subject above to see deep-dive performance metrics and download the PDF report.
                    </p>
                </div>
            )}
        </div>
    );
};

const Stat: React.FC<StatProps> = ({ label, value, highlight, danger }) => {
    return (
        <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
            highlight 
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400" 
                : danger 
                ? "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800/50 text-rose-700 dark:text-rose-400" 
                : "bg-gray-50/50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800/50 text-gray-700 dark:text-gray-300"
        }`}>
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</div>
            <div className="text-xl font-black">{value}</div>
        </div>
    );
};

export default SubjectResults;
