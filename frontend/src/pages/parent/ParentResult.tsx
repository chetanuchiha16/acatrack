import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { semesterOptions, brandingConfig } from "../../config";
import useStudentStore from "../../store/useStudentStore";
import { 
    getStudentInfoAuthStudentResultGet,
    aiSummaryAiSummaryGet,
    aiProfileAiProfileGet
} from "../../client/sdk.gen";
import ResultGlossary from "../student/ResultGlossary";
import type { StudentResult } from "../../types";
import { 
    ArrowLeft, Calendar, Award, Sparkles, Download, 
    TrendingUp, Target, BookOpen, BookOpenCheck, Languages, 
    ChevronRight, CheckCircle2, AlertCircle
} from "lucide-react";

interface AiSummary {
    backlog_status?: string;
    percentage?: number;
    cgpa?: number;
    sgpa?: number;
    total_marks?: number | string;
    [key: string]: unknown;
}

interface AiProfile {
    trend?: { trend: string };
    cgpa_prediction?: { predicted_next_sgpa?: number | string };
    placement_advice?: string[];
    learning_plan?: string[];
    [key: string]: unknown;
}

interface AiData {
    summary: AiSummary;
    profile: AiProfile;
}

export default function ParentResult() {
    const { t, i18n } = useTranslation();
    const { studentData, loading: storeLoading, fetchStudentData } = useStudentStore();
    const [sem, setSem] = useState<string>("");
    const [semData, setSemData] = useState<StudentResult | null>(null);
    const [_semLoading, setSemLoading] = useState<boolean>(false);

    const [aiData, setAiData] = useState<AiData | null>(null);
    const [aiLoading, setAiLoading] = useState<boolean>(false);
    const [aiError, setAiError] = useState<string>("");

    // Fetch student data on mount
    useEffect(() => {
        void fetchStudentData();
    }, [fetchStudentData]);

    // Set default semester and fetch AI insights when data arrives
    useEffect(() => {
        if (studentData?.student?.usn && semesterOptions.length > 0) {
            const defaultSem = semesterOptions[semesterOptions.length - 1];
            setSem(defaultSem);
            void fetchAIData(studentData.student.usn, defaultSem, i18n.language);
        }
    }, [studentData, i18n.language]);

    // Re-fetch AI and Semester Data if semester or language changes
    useEffect(() => {
        if (studentData?.student?.usn && sem) {
            void fetchSemesterData(studentData.student.usn, sem);
            void fetchAIData(studentData.student.usn, sem, i18n.language);
        }
    }, [sem, i18n.language, studentData]);

    const fetchSemesterData = async (usn: string, semester: string) => {
        setSemLoading(true);
        try {
            const res = await getStudentInfoAuthStudentResultGet({
                query: { usn, semester }
            });
            if (res.data) setSemData(res.data as unknown as StudentResult);
        } catch (err: unknown) {
            console.error(err);
        } finally {
            setSemLoading(false);
        }
    };

    const fetchAIData = async (usn: string, semester: string, lang: string) => {
        setAiLoading(true);
        setAiError("");
        try {
            const [summaryRes, profileRes] = await Promise.all([
                aiSummaryAiSummaryGet({
                    query: { usn, lng: lang as "en" | "hi" | "kan" }
                }),
                aiProfileAiProfileGet({
                    query: { usn, lng: lang as "en" | "hi" | "kan" }
                })
            ]);

            const summaryData = summaryRes.data as { ai_summary?: AiSummary };
            const summaryJson = summaryData?.ai_summary as AiSummary;
            const profileJson = profileRes.data as AiProfile;

            setAiData({
                summary: summaryJson,
                profile: profileJson,
            });
        } catch (err: unknown) {
            console.error(err);
            setAiError("Could not load AI Insights.");
        } finally {
            setAiLoading(false);
        }
    };

    const changeLanguage = (lng: string) => i18n.changeLanguage(lng);
    const goBack = () => {
        const currentPath = window.location.pathname;
        const newPath = currentPath.replace(/\/ParentResult$/, "");
        window.location.href = newPath;
    };

    if (storeLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0b0f19]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading Analytics Dashboard...</div>
            </div>
        </div>
    );

    if (!studentData) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0b0f19] px-4 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} />
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6">{t("noData", "No academic records available.")}</div>
            <button 
                onClick={goBack} 
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 font-black text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
                <ArrowLeft size={16} /> Return to Home
            </button>
        </div>
    );

    // Extract from semData
    const subjects = Array.isArray(semData?.subjects) ? semData.subjects : [];
    
    // Prioritize exact database data (semData) over AI-generated text numbers
    const percentage = semData?.percentage ?? aiData?.summary?.percentage ?? 0;
    const cgpa = semData?.cgpa ?? aiData?.summary?.cgpa ?? 0;
    const sgpa = semData?.sgpa ?? aiData?.summary?.sgpa ?? 0;
    const totalMarks = semData?.total_marks ?? aiData?.summary?.total_marks ?? "-";

    return (
        <main className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 py-6 px-4 sm:px-6 relative overflow-hidden font-sans">
            {/* Animated Mesh Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-400 rounded-full blur-[130px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400 rounded-full blur-[130px] animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto w-full space-y-6 flex flex-col">
                
                {/* --- HEADER --- */}
                <header className="w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/50 rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-slate-100/50 dark:shadow-none flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <button 
                            onClick={goBack} 
                            className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-xl transition-all flex items-center justify-center" 
                            aria-label="Go Back"
                        >
                            <ArrowLeft size={18} />
                        </button>
                        {brandingConfig.collegeLogo ? (
                            <img src={brandingConfig.collegeLogo} alt="Logo" className="h-10 w-auto object-contain" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <BookOpen className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden sm:inline">AcaTrack</span>
                            </div>
                        )}
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
                        <div className="hidden md:block">
                            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Reports Workspace</span>
                            <h2 className="text-sm font-bold text-slate-400">Ward Performance Analysis</h2>
                        </div>
                    </div>
                    
                    <div className="flex-1 text-center hidden sm:block">
                        <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t("resultTitle", "Academic Performance Center")}</h1>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-3 w-full sm:w-auto justify-end">
                        <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200/50 dark:border-slate-700/50">
                            <Languages size={16} className="text-slate-400 dark:text-slate-500 mr-2" />
                            <select
                                value={i18n.language}
                                onChange={(e) => changeLanguage(e.target.value)}
                                className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-4 uppercase"
                            >
                                <option value="en">English</option>
                                <option value="hi">हिंदी</option>
                                <option value="kan">ಕನ್ನಡ</option>
                            </select>
                        </div>
                    </div>
                </header>

                {/* --- AI SUMMARY BANNER --- */}
                <div className="bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent backdrop-blur-md rounded-[2.5rem] p-6 sm:p-8 border border-white dark:border-slate-800/50 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 blur-[60px] pointer-events-none" />
                    
                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2.5">
                        <span className="w-8 h-8 bg-indigo-500/15 rounded-xl flex items-center justify-center text-indigo-500 text-sm">✨</span>
                        {t("progressSummary", "Smart Progress Overview")}
                    </h2>
                    
                    {aiLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                        </div>
                    ) : aiError ? (
                        <p className="text-red-500 font-bold text-sm flex items-center gap-2">
                            <AlertCircle size={16} /> {t("errorLoadingAI", "Error fetching dynamic diagnostic report.")}
                        </p>
                    ) : aiData?.summary ? (
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-semibold bg-white/60 dark:bg-[#1e293b]/50 p-5 rounded-2xl border border-white dark:border-slate-800/50 shadow-inner">
                            {aiData.summary.backlog_status}
                        </p>
                    ) : null}
                </div>

                {/* --- CONTROL BAR --- */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/40 dark:bg-slate-900/30 backdrop-blur-md p-4 rounded-2xl border border-white/20 dark:border-slate-800/40">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Calendar size={18} className="text-indigo-500" />
                        <label className="text-slate-500 dark:text-slate-400 font-black text-xs uppercase tracking-wider whitespace-nowrap">{t("semester", "Selected Cycle")}:</label>
                        <select
                            value={sem}
                            onChange={(e) => setSem(e.target.value)}
                            className="w-full sm:w-40 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        >
                            {semesterOptions.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <ResultGlossary />
                </div>

                {/* --- METRICS GRID --- */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Percentage */}
                    <div className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl p-6 rounded-3xl border border-white dark:border-slate-800/50 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mb-1">{t("percentage", "Aggregate %")}</span>
                        <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 tracking-tight group-hover:scale-105 transition-transform duration-300">
                            {percentage.toFixed(1)}%
                        </span>
                    </div>
                    {/* Total Marks */}
                    <div className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl p-6 rounded-3xl border border-white dark:border-slate-800/50 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-slate-500/30 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-600" />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mb-1">{t("totalMarks", "Net Marks")}</span>
                        <span className="text-2xl sm:text-3xl font-black text-slate-700 dark:text-slate-200 tracking-tight">
                            {totalMarks}
                        </span>
                    </div>
                    {/* SGPA */}
                    <div className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl p-6 rounded-3xl border border-white dark:border-slate-800/50 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mb-1">{t("sgpa", "Term SGPA")}</span>
                        <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight group-hover:scale-105 transition-transform duration-300">
                            {sgpa.toFixed(2)}
                        </span>
                    </div>
                    {/* CGPA */}
                    <div className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl p-6 rounded-3xl border border-white dark:border-slate-800/50 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-purple-500/30 transition-all duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black mb-1">{t("cgpa", "Cumulative CGPA")}</span>
                        <span className="text-3xl sm:text-4xl font-black text-purple-600 dark:text-purple-400 tracking-tight group-hover:scale-105 transition-transform duration-300">
                            {cgpa.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* --- SUBJECTS LIST (TRAFFIC LIGHTS GLOW) --- */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center">
                            <BookOpenCheck size={18} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">{t("subjectPerformance", "Subject Breakdown")}</h3>
                    </div>
                    
                    {subjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {subjects.map((sub, idx) => {
                                const isPass = sub.status === "Pass" || sub.status === "No Credits";
                                
                                const glowCardClass = isPass 
                                    ? "bg-white/70 dark:bg-[#1e293b]/60 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/[0.02]" 
                                    : "bg-white/70 dark:bg-[#1e293b]/60 border-red-500/20 hover:border-red-500/40 shadow-red-500/[0.02]";
                                
                                const textThemeClass = isPass ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400";
                                const bgChipThemeClass = isPass 
                                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-900/30" 
                                    : "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/30 dark:border-red-900/30";

                                return (
                                    <div 
                                        key={idx} 
                                        className={`rounded-2xl border p-5 shadow-lg backdrop-blur-md flex flex-col justify-between h-full transition-all duration-300 hover:scale-[1.01] ${glowCardClass}`}
                                    >
                                        <div className="flex justify-between items-start gap-4 mb-4 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white leading-snug tracking-tight text-sm mb-1.5 line-clamp-2">
                                                    {sub.subject_name}
                                                </h4>
                                                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg uppercase">
                                                    {sub.code}
                                                </span>
                                            </div>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-inner flex-shrink-0 ${bgChipThemeClass}`}>
                                                {sub.status}
                                            </span>
                                        </div>
                                        
                                        <div className="flex justify-between items-end">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">{t("internal", "Internal")}</span>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{sub.ia}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">{t("final", "SEE")}</span>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                        {sub.see === 0 && (sub.ia === sub.total || /(mini project|scr|nss|social connect|physical education|internship|seminar)/i.test(sub.subject_name)) 
                                                            ? "N/A" 
                                                            : sub.see}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block mb-0.5">{t("total", "Total")}</span>
                                                <span className={`text-xl font-black ${textThemeClass} tracking-tight`}>
                                                    {sub.total}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center p-12 bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl rounded-3xl border border-white dark:border-slate-800/50 shadow-xl text-slate-500 font-bold italic">
                            {t("noSubjectsFound", "No subjects found for Semester")} {sem}.
                        </div>
                    )}
                </div>

                {/* --- DEEP AI PROFILE INSIGHTS --- */}
                {aiData?.profile && !aiLoading && (
                    <div className="space-y-6 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                                <Sparkles size={18} />
                            </div>
                            <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider">
                                {t("aiAnalysis", "Personalized AI Diagnostics")}
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                            
                            {/* Trajectory (5 Cols) */}
                            <div className="lg:col-span-5 bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl rounded-[2rem] p-6 border border-white dark:border-slate-800/50 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-[50px] pointer-events-none" />
                                
                                <div>
                                    <h4 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <TrendingUp size={14} /> Trajectory Trend
                                    </h4>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-[#0b0f19]/30 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Current Slope</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${aiData.profile.trend?.trend === "Improving" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" : "bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400"}`}>
                                                {aiData.profile.trend?.trend || "Stable"}
                                            </span>
                                        </div>

                                        {aiData.profile.cgpa_prediction?.predicted_next_sgpa && (
                                            <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-[#0b0f19]/30 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Next Semester Target</span>
                                                <span className="text-base font-black text-slate-800 dark:text-white flex items-center gap-1">
                                                    <Award size={16} className="text-yellow-500" />
                                                    {aiData.profile.cgpa_prediction.predicted_next_sgpa} {t("sgpa")}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-6 leading-relaxed bg-slate-50/20 dark:bg-slate-900/20 p-3 rounded-xl border border-slate-200/20 dark:border-slate-800/20">
                                    Trajectory is generated dynamically using current SGPA trends mapped against department statistics.
                                </div>
                            </div>

                            {/* Placement Advice (7 Cols) */}
                            {aiData?.profile?.placement_advice && aiData.profile.placement_advice.length > 0 && (
                                <div className="lg:col-span-7 bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl rounded-[2rem] p-6 border border-white dark:border-slate-800/50 shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] pointer-events-none" />
                                    
                                    <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Target size={14} /> Career & Placement Advice
                                    </h4>
                                    
                                    <ul className="space-y-3">
                                        {aiData.profile.placement_advice.slice(0, 3).map((advice, i) => (
                                            <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-3 bg-slate-50/50 dark:bg-[#0b0f19]/30 border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl">
                                                <span className="w-5 h-5 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                                                    {i + 1}
                                                </span>
                                                <span className="leading-relaxed font-semibold">{advice}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        </div>

                        {/* Learning Plan (Full Width) */}
                        {aiData?.profile?.learning_plan && aiData.profile.learning_plan.length > 0 && (
                            <div className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl rounded-[2rem] p-6 border border-white dark:border-slate-800/50 shadow-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 blur-[60px] pointer-events-none" />
                                
                                <h4 className="text-xs font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <BookOpen size={14} /> Recommended Action & Study Plan
                                </h4>
                                
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {aiData.profile.learning_plan.map((plan, i) => (
                                        <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-3 bg-amber-500/[0.03] dark:bg-amber-950/10 p-4 rounded-2xl border border-amber-500/10 dark:border-amber-900/10 group/plan hover:border-amber-500/20 transition-all duration-300">
                                            <div className="w-6 h-6 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                                                <ChevronRight size={14} className="group-hover/plan:translate-x-0.5 transition-transform" />
                                            </div>
                                            <span className="leading-relaxed font-semibold">{plan}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                    </div>
                )}

                {/* --- DOWNLOAD BUTTON --- */}
                {semData?.pdf_url && (
                    <div className="flex justify-center pt-8 pb-12">
                         <a
                            href={semData.pdf_url}
                            download
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-black text-sm sm:text-base shadow-xl shadow-indigo-500/30 hover:scale-[1.03] active:scale-[0.97] transition-all transform duration-300"
                        >
                            <Download size={18} />
                            {t("downloadReport", "Download Official PDF Transcript")}
                        </a>
                    </div>
                )}

            </div>
        </main>
    );
}
