import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { semesterOptions } from "./config";
import jssLogo from "./assets/jssLogo.png";
import useStudentStore from "./useStudentStore";
import API_BASE from "./config";
import { fetchWithAuth } from "./fetchWithAuth";
import ResultGlossary from "./ResultGlossary";

export default function ParentResult() {
    const { t, i18n } = useTranslation();
    const { studentData, loading: storeLoading, fetchStudentData } = useStudentStore();
    const [sem, setSem] = useState("");
    const [semData, setSemData] = useState(null);
    const [semLoading, setSemLoading] = useState(false);

    const [aiData, setAiData] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState("");

    // Fetch student data on mount
    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]);

    // Set default semester and fetch AI insights when data arrives
    useEffect(() => {
        if (studentData?.student?.usn && semesterOptions.length > 0) {
            const defaultSem = semesterOptions[semesterOptions.length - 1];
            setSem(defaultSem);
            fetchAIData(studentData.student.usn, defaultSem, i18n.language);
        }
    }, [studentData, i18n.language]);

    // Re-fetch AI and Semester Data if semester or language changes
    useEffect(() => {
        if (studentData?.student?.usn && sem) {
            fetchSemesterData(studentData.student.usn, sem);
            fetchAIData(studentData.student.usn, sem, i18n.language);
        }
    }, [sem, i18n.language, studentData]);

    const fetchSemesterData = async (usn, semester) => {
        setSemLoading(true);
        try {
            const res = await fetchWithAuth(`${API_BASE}/auth/Student/result?usn=${usn}&semester=${semester}`);
            const data = await res.json();
            setSemData(data);
        } catch (err) {
            console.error(err);
        } finally {
            setSemLoading(false);
        }
    };

    const fetchAIData = async (usn, semester, lang) => {
        setAiLoading(true);
        setAiError("");
        try {
            const [summaryRes, profileRes] = await Promise.all([
                fetchWithAuth(`${API_BASE}/ai/summary?usn=${usn}&semester=${semester}&lng=${lang}`, {}),
                fetchWithAuth(`${API_BASE}/ai/profile?usn=${usn}&semester=${semester}&lng=${lang}`, {})
            ]);

            const summaryJson = await summaryRes.json();
            const profileJson = await profileRes.json();

            setAiData({
                summary: summaryJson.ai_summary,
                profile: profileJson,
            });
        } catch (err) {
            console.error(err);
            setAiError("Could not load AI Insights.");
        } finally {
            setAiLoading(false);
        }
    };

    const changeLanguage = (lng) => i18n.changeLanguage(lng);
    const goBack = () => {
        const currentPath = window.location.pathname;
        const newPath = currentPath.replace(/\/ParentResult$/, "");
        window.location.href = newPath;
    };

    if (storeLoading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="animate-pulse text-xl font-bold text-gray-500">Loading Dashboard...</div>
        </div>
    );

    if (!studentData) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-xl text-gray-600 dark:text-gray-300 mb-4">{t("noData", "No data available")}</div>
            <button onClick={goBack} className="px-4 py-2 bg-blue-600 text-white rounded shadow">⬅ Back</button>
        </div>
    );

    // Extract from semData
    const subjects = Array.isArray(semData?.subjects) ? semData.subjects : [];
    
    // Merge standard data with AI summary data where available
    const percentage = aiData?.summary?.percentage ?? semData?.percentage ?? 0;
    const cgpa = aiData?.summary?.cgpa ?? semData?.cgpa ?? 0;
    const sgpa = aiData?.summary?.sgpa ?? semData?.sgpa ?? 0;
    const totalMarks = aiData?.summary?.total_marks ?? semData?.total_marks ?? "-";

    return (
        <main className="min-h-screen w-full bg-slate-50 dark:bg-slate-900 py-6 px-4">
            
            {/* --- HEADER --- */}
            <div className="max-w-7xl 2xl:max-w-[95%] mx-auto w-full mb-6 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button onClick={goBack} className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors flex-shrink-0" aria-label="Go Back">
                        <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    </button>
                    <img src={jssLogo} alt="Logo" className="h-10 w-auto object-contain" />
                </div>
                
                <div className="flex-1 text-center w-full">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{t("resultTitle")}</h1>
                </div>

                <div className="flex-shrink-0 flex items-center gap-3">
                    <select
                        value={i18n.language}
                        onChange={(e) => changeLanguage(e.target.value)}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-slate-700 border-none rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="en">English</option>
                        <option value="hi">हिंदी</option>
                        <option value="kan">ಕನ್ನಡ</option>
                    </select>
                </div>
            </div>

            <div className="max-w-7xl 2xl:max-w-[95%] mx-auto w-full space-y-6">
                
                {/* --- AI SUMMARY BANNER --- */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/20 rounded-2xl p-5 shadow-sm border border-indigo-100 dark:border-indigo-800/50">
                    <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                        <span>✨</span> {t("progressSummary")}
                    </h2>
                    
                    {aiLoading ? (
                        <div className="animate-pulse h-12 bg-indigo-200/50 dark:bg-indigo-800/50 rounded mt-2"></div>
                    ) : aiError ? (
                        <p className="text-red-500 font-medium text-sm">{t("errorLoadingAI")}</p>
                    ) : aiData?.summary ? (
                        <div className="text-sm sm:text-base text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium bg-white/60 dark:bg-slate-900/50 p-4 rounded-xl shadow-inner border border-white/40 dark:border-slate-700/50">
                            {aiData.summary.backlog_status}
                            {aiData.profile?.placement_advice?.[0] && (
                                <p className="mt-3 text-indigo-700 dark:text-indigo-400">💡 {aiData.profile.placement_advice[0]}</p>
                            )}
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <label className="text-gray-600 dark:text-gray-400 font-medium text-sm whitespace-nowrap">{t("semester")}:</label>
                        <select
                            value={sem}
                            onChange={(e) => setSem(e.target.value)}
                            className="w-full sm:w-40 px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                        >
                            {semesterOptions.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    <ResultGlossary />
                </div>

                {/* --- METRICS GRID --- */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold mb-1">{t("percentage")}</span>
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold mb-1">{t("totalMarks")}</span>
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{totalMarks}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold mb-1">{t("sgpa")}</span>
                        <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{sgpa.toFixed(2)}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center text-center">
                        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest font-bold mb-1">{t("cgpa")}</span>
                        <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{cgpa.toFixed(2)}</span>
                    </div>
                </div>

                {/* --- SUBJECTS LIST (TRAFFIC LIGHTS) --- */}
                <div className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mt-4 mb-2">{t("subjectPerformance")}</h3>
                    
                    {subjects.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {subjects.map((sub, idx) => {
                                const isPass = sub.status === "Pass" || sub.status === "No Credits";
                                const bgClass = isPass 
                                    ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/40" 
                                    : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40";
                                const textClass = isPass ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400";
                                const badgeClass = isPass ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" : "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100";

                                return (
                                    <div key={idx} className={`rounded-xl border p-4 shadow-sm flex flex-col justify-between h-full ${bgClass}`}>
                                        <div className="flex justify-between items-start gap-4 mb-3 border-b border-black/5 dark:border-white/5 pb-3">
                                            <div>
                                                <h4 className={`font-bold text-sm sm:text-base leading-tight mb-1 ${textClass}`}>{sub.subject_name}</h4>
                                                <span className="text-xs font-medium opacity-70 border border-current rounded px-1.5 py-0.5">{sub.code}</span>
                                            </div>
                                            <span className={`text-xs font-black uppercase tracking-wider px-2 py-1 rounded shadow-sm flex-shrink-0 ${badgeClass}`}>
                                                {sub.status}
                                            </span>
                                        </div>
                                        
                                        <div className="flex justify-between items-end">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold opacity-60">{t("internal")}</span>
                                                    <span className={`text-sm sm:text-base font-bold ${textClass}`}>{sub.ia}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase font-bold opacity-60">{t("final")}</span>
                                                    <span className={`text-sm sm:text-base font-bold ${textClass}`}>
                                                        {sub.see === 0 && (sub.ia === sub.total || /(mini project|scr|nss|social connect|physical education|internship|seminar)/i.test(sub.subject_name)) 
                                                            ? "N/A" 
                                                            : sub.see}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span className="text-[10px] uppercase font-bold opacity-60">{t("total")}</span>
                                                <span className={`text-lg sm:text-xl font-black ${textClass}`}>{sub.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-500">
                            {t("noSubjectsFound")} {sem}.
                        </div>
                    )}
                </div>

                {/* --- DOWNLOAD BUTTON --- */}
                {semData?.pdf_url && (
                    <div className="flex justify-center mt-6 pb-12">
                         <a
                            href={semData.pdf_url}
                            download
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 text-white font-bold text-sm sm:text-base shadow-md hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all transform hover:-translate-y-0.5"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            {t("downloadReport")}
                        </a>
                    </div>
                )}
            </div>
        </main>
    );
}
