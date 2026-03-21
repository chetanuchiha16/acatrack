import { useState } from "react";
import API_BASE from "./config";
import { fetchWithAuth } from "./fetchWithAuth";

// ─── AI API response shapes ──────────────────────────────────────────────────
interface AiSummary {
    name?: string;
    usn?: string;
    semester?: string;
    percentage?: number;
    total_marks?: number;
    obtained_credits?: number;
    sgpa?: number;
    cgpa?: number;
    backlog_status?: string;
    [key: string]: unknown;
}

interface BacklogSemData {
    failed_subjects?: { subject: string }[];
}

interface AiProfile {
    backlogs?: Record<string, BacklogSemData>;
    latest_strong_subjects?: string[];
    latest_mid_subjects?: string[];
    latest_weak_subjects?: string[];
    strong_tags?: string[];
    mid_tags?: string[];
    weak_tags?: string[];
    tag_avgs?: Record<string, number | string>;
    learning_plan?: string[];
    placement_advice?: string[];
    [key: string]: unknown;
}

interface AiTrend {
    trend?: string;
    avg_sgpa?: number | string;
    history?: Record<string, number | string>;
}

interface CgpaPrediction {
    predicted_next_sgpa?: number | string;
    predicted_final_cgpa?: number | string;
}

interface AiData {
    ai_summary: AiSummary;
    ai_profile: AiProfile;
    trend: AiTrend;
    cgpa_prediction: CgpaPrediction;
}

// ─── Performance API response shapes ────────────────────────────────────────
interface SubjectAnalysis {
    code?: string;
    subject_name?: string;
    ia?: number;
    see?: number;
    total?: number;
    status?: string;
    advice?: string;
    tips?: string;
}

interface PerformanceData {
    name?: string;
    usn?: string;
    sgpa?: number;
    percentage?: number;
    total_marks?: number;
    cgpa?: number;
    predicted_next_sgpa?: number;
    subject_analysis: SubjectAnalysis[];
    improvement_advice: string[];
    study_summary?: string;
    [key: string]: unknown;
}

export default function StudentAIInsights({ usn = "", semester = "sem1" }) {
    const [aiData, setAiData] = useState<AiData | null>(null);
    const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
    const [loadingAI, setLoadingAI] = useState<boolean>(false);
    const [loadingPerf, setLoadingPerf] = useState<boolean>(false);
    const [errorAI, setErrorAI] = useState<string>("");
    const [errorPerf, setErrorPerf] = useState<string>("");
    const [openAI, setOpenAI] = useState<boolean>(false);
    const [openPerf, setOpenPerf] = useState<boolean>(false);
    const [chartUrl, setChartUrl] = useState<string>("");

    // Fetch AI Insights
    const fetchAIInsights = async () => {
        if (!usn) return setErrorAI("USN is missing.");
        setErrorAI("");
        setLoadingAI(true);

        try {
            const [summaryRes, profileRes, trendRes, predictRes] =
                await Promise.all([
                    fetchWithAuth(`${API_BASE}/ai/summary?usn=${usn}&semester=${semester}`, {}),
                    fetchWithAuth(`${API_BASE}/ai/profile?usn=${usn}&semester=${semester}`, {}),
                    fetchWithAuth(`${API_BASE}/ai/trend?usn=${usn}`, {}),
                    fetchWithAuth(`${API_BASE}/ai/predict_cgpa?usn=${usn}`, {}),
                ]);

            const summaryJson = await summaryRes.json();
            const profileJson = await profileRes.json();
            const trendJson = await trendRes.json();
            const predictJson = await predictRes.json();

            setAiData({
                ai_summary: summaryJson.ai_summary,
                ai_profile: profileJson,
                trend: trendJson,
                cgpa_prediction: predictJson,
            });
            setOpenAI(true);
        } catch (err) {
            console.error(err);
            setErrorAI("Failed to fetch AI insights. Check USN and try again.");
        } finally {
            setLoadingAI(false);
        }
    };

    // Fetch Performance Dashboard
    const fetchPerformance = async () => {
        if (!usn) return setErrorPerf("USN is missing.");
        setErrorPerf("");
        setLoadingPerf(true);

        try {
            const res = await fetchWithAuth(
                `${API_BASE}/auth/Student/analysis?usn=${usn}&semester=${semester}`,
                {}
            );
            const data = await res.json();

            if (res.ok) {
                setPerformanceData({
                    ...data,
                    subject_analysis: Array.isArray(data.subject_analysis) ? data.subject_analysis : [],
                    improvement_advice: Array.isArray(data.improvement_advice) ? data.improvement_advice : [],
                    study_summary: data.study_summary || "Focus on overall improvement.",
                });
                void fetchChart();
                setOpenPerf(true);
            } else {
                setErrorPerf(data?.error || "Failed to fetch student performance");
            }
        } catch (err: unknown) {
            setErrorPerf("Server error: " + (err instanceof Error ? err.message : "Unknown"));
        } finally {
            setLoadingPerf(false);
        }
    };

    // Fetch Chart
    const fetchChart = async () => {
        try {
            const res = await fetchWithAuth(
                `${API_BASE}/auth/Student/chart?usn=${usn}&semester=${semester}`,
                {}
            );
            if (!res.ok) return;
            const data = await res.json();
            setChartUrl(data.image || "");
        } catch (err) {
            console.error("Failed to fetch chart:", err);
        }
    };

    // Get subject color based on marks
    const getSubjectColor = (subject: SubjectAnalysis): string => {
        const marks = subject.total ?? 0;
        if (marks < 50) return "bg-red-50 dark:bg-red-500/10";
        if (marks >= 50 && marks <= 80) return "bg-yellow-50 dark:bg-yellow-500/10";
        return "bg-green-50 dark:bg-green-500/10";
    };

    return (
        <div className="w-full space-y-4">
            {/* Buttons Container */}
            <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 shadow-md">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                        onClick={() => {
                            if (!aiData) void fetchAIInsights();
                            setOpenAI(true);
                            setOpenPerf(false);
                        }}
                        disabled={loadingAI}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 border shadow-sm ${
                            openAI 
                                ? "bg-purple-600 border-purple-600 text-white" 
                                : "bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-800/80 hover:text-purple-600 dark:hover:text-purple-400"
                        }`}
                    >
                        <div className="flex items-center justify-center">
                            <span>✨ AI Insights</span>
                            {loadingAI && <span className="ml-2 animate-spin">⏳</span>}
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            if (!performanceData) void fetchPerformance();
                            setOpenAI(false);
                            setOpenPerf(true);
                        }}
                        disabled={loadingPerf}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 border shadow-sm ${
                            openPerf 
                                ? "bg-blue-600 border-blue-600 text-white" 
                                : "bg-white dark:bg-slate-800 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-800/80 hover:text-blue-600 dark:hover:text-blue-400"
                        }`}
                    >
                        <div className="flex items-center justify-center">
                            <span>📊 Performance Dashboard</span>
                            {loadingPerf && <span className="ml-2 animate-spin">⏳</span>}
                        </div>
                    </button>
                </div>
                {(errorAI && openAI) && <p className="mt-3 text-sm text-red-600 text-center font-medium">{errorAI}</p>}
                {(errorPerf && openPerf) && <p className="mt-3 text-sm text-red-600 text-center font-medium">{errorPerf}</p>}
            </div>

            {/* AI Insights Content */}
            {openAI && aiData && (
                <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col gap-6">
                    {/* 🧠 AI Summary */}
                    <div>
                        <h3 className="text-base sm:text-xl font-bold text-purple-600 dark:text-purple-400 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            🧠 AI Summary
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{aiData.ai_summary.name}</p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">USN</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200 truncate">{aiData.ai_summary.usn}</p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Semester</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200">{aiData.ai_summary.semester}</p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200">{aiData.ai_summary.percentage}</p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Marks</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200">{aiData.ai_summary.total_marks}</p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credits</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200">{aiData.ai_summary.obtained_credits}</p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">SGPA</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200">{aiData.ai_summary.sgpa}</p>
                            </div>
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">CGPA</p>
                                <p className="font-semibold text-gray-700 dark:text-gray-200">{aiData.ai_summary.cgpa}</p>
                            </div>
                        </div>

                        {/* Backlogs */}
                        <div className="mt-6">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 uppercase tracking-wider">
                                ⚠️ Backlogs
                            </h4>
                            {Object.keys(aiData.ai_profile.backlogs || {}).length === 0 ? (
                                <div className="inline-block bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800/50 px-3 py-1.5 rounded-md text-sm font-medium">
                                    No backlogs
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {Object.entries(aiData.ai_profile.backlogs ?? {}).map(([sem, semData]) => (
                                        <div key={sem} className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-3 rounded-lg">
                                            <div className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2 border-b border-red-200 dark:border-red-900/30 pb-1">
                                                {sem}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(semData.failed_subjects ?? []).map((subj, idx) => (
                                                    <span key={idx} className="bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200 px-2.5 py-1 rounded text-xs font-semibold border border-red-200 dark:border-red-800/50">
                                                        {subj.subject}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 📊 AI Profile */}
                    <div>
                        <h3 className="text-base sm:text-xl font-bold text-purple-600 dark:text-purple-400 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                            📊 AI Profile
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <h4 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 uppercase tracking-wider">📌 Subject Strengths & Weaknesses</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(aiData.ai_profile.latest_strong_subjects || []).map((subj, i) => (
                                            <span key={`strong-${i}`} className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium border border-green-200 dark:border-green-800/50">{subj}</span>
                                        ))}
                                        {(aiData.ai_profile.latest_mid_subjects || []).map((subj, i) => (
                                            <span key={`mid-${i}`} className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-3 py-1 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800/50">{subj}</span>
                                        ))}
                                        {(aiData.ai_profile.latest_weak_subjects || []).map((subj, i) => (
                                            <span key={`weak-${i}`} className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 px-3 py-1 rounded-full text-xs font-medium border border-red-200 dark:border-red-800/50">{subj}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                    <h4 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 uppercase tracking-wider">📚 Tag-level Strengths & Weaknesses</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(aiData.ai_profile.strong_tags || []).map((tag, i) => (
                                            <span key={`strong-tag-${i}`} className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium border border-green-200 dark:border-green-800/50">{tag}</span>
                                        ))}
                                        {(aiData.ai_profile.mid_tags || []).map((tag, i) => (
                                            <span key={`mid-tag-${i}`} className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 px-3 py-1 rounded-full text-xs font-medium border border-yellow-200 dark:border-yellow-800/50">{tag}</span>
                                        ))}
                                        {(aiData.ai_profile.weak_tags || []).map((tag, i) => (
                                            <span key={`weak-tag-${i}`} className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 px-3 py-1 rounded-full text-xs font-medium border border-red-200 dark:border-red-800/50">{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-4">
                                {aiData.ai_profile.tag_avgs && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <h4 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3 uppercase tracking-wider">📚 Subject Area Averages</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.entries(aiData.ai_profile.tag_avgs).map(([tag, avg], i) => (
                                                <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 px-3 py-2 rounded-lg text-xs sm:text-sm shadow-sm">
                                                    <span className="text-gray-600 dark:text-gray-400 font-medium">{tag}</span>
                                                    <span className="font-bold text-gray-900 dark:text-gray-100">{Number(avg).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                {aiData.ai_profile.learning_plan?.length && aiData.ai_profile.learning_plan.length > 0 && (
                                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                        <h4 className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 uppercase tracking-wider">📝 Learning Plan</h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-blue-900 dark:text-blue-200 font-medium">
                                            {(aiData.ai_profile.learning_plan ?? []).map((tip, index) => (
                                                <li key={index} className="leading-snug">{tip}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {aiData.ai_profile.placement_advice?.length && aiData.ai_profile.placement_advice.length > 0 && (
                                    <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                        <h4 className="text-xs sm:text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-3 uppercase tracking-wider">🎯 Placement Advice</h4>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-indigo-900 dark:text-indigo-200 font-medium">
                                            {(aiData.ai_profile.placement_advice ?? []).map((advice, index) => (
                                                <li key={index} className="leading-snug">{advice}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Row (Trend & Prediction) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mt-2 pb-2">
                        {/* 📈 Trend */}
                        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                            <h4 className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-3 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600 pb-2">
                                📈 SGPA Trend
                            </h4>
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Trend</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{aiData.trend.trend || "N/A"}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Average SGPA</span>
                                    <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{aiData.trend.avg_sgpa || "N/A"}</span>
                                </div>
                            </div>
                            
                            {aiData.trend.history && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-2 uppercase tracking-widest">History</span>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(aiData.trend.history)
                                            .sort(([a], [b]) => parseInt(a.replace("sem", "")) - parseInt(b.replace("sem", "")))
                                            .map(([sem, sgpa]) => (
                                                <div key={sem} className="flex flex-col items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg shadow-sm">
                                                    <span className="text-[10px] text-gray-500 font-semibold uppercase">{sem}</span>
                                                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{Number(sgpa).toFixed(2)}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🔮 CGPA Prediction */}
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-4 sm:p-5 rounded-xl border border-purple-100 dark:border-purple-900/30 flex flex-col justify-between">
                            <h4 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-3 uppercase tracking-wider border-b border-purple-200 dark:border-purple-500/30 pb-2">
                                🔮 CGPA Prediction
                            </h4>
                            <div className="flex flex-col gap-3 flex-1 justify-center">
                                <div className="flex justify-between items-center bg-white dark:bg-slate-900/80 px-4 py-3 rounded-xl border border-purple-100 dark:border-purple-500/20 shadow-sm">
                                    <span className="text-xs sm:text-sm font-semibold text-purple-800 dark:text-purple-300">Predicted Next SGPA</span>
                                    <span className="text-lg sm:text-xl font-bold text-purple-900 dark:text-purple-200">{aiData.cgpa_prediction.predicted_next_sgpa || "N/A"}</span>
                                </div>
                                <div className="flex justify-between items-center bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md px-4 py-3 rounded-xl">
                                    <span className="text-xs sm:text-sm font-semibold text-white">Predicted Final CGPA</span>
                                    <span className="text-xl sm:text-2xl font-black text-white tracking-wider">{aiData.cgpa_prediction.predicted_final_cgpa || "N/A"}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Dashboard Content */}
            {openPerf && performanceData && (
                <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col gap-6">
                    <h3 className="text-base sm:text-xl font-bold text-blue-600 dark:text-blue-400 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        📊 Student Performance Dashboard
                    </h3>

                    {/* Summary Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs sm:text-sm">
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Candidate Name</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate">{performanceData.name}</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">USN Identifier</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-200 truncate">{performanceData.usn}</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Target Semester</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">{semester}</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">SGPA</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">{(performanceData.sgpa ?? 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Percentage Achieved</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">{(performanceData.percentage ?? 0).toFixed(2)}%</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aggregate Marks</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">{performanceData.total_marks}</p>
                        </div>
                        <div>
                            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cumulative GPA</p>
                            <p className="font-semibold text-gray-700 dark:text-gray-200">{(performanceData.cgpa ?? 0).toFixed(2)}</p>
                        </div>
                        {performanceData.predicted_next_sgpa && (
                            <div>
                                <p className="text-[10px] sm:text-xs text-purple-500 dark:text-purple-400 uppercase tracking-wider font-bold">Predicted Next SGPA</p>
                                <p className="font-bold text-purple-700 dark:text-purple-300">{performanceData.predicted_next_sgpa.toFixed(2)}</p>
                            </div>
                        )}
                    </div>

                    {/* Subjects Table */}
                    <div className="w-full overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                        <table className="min-w-full text-sm sm:text-base border-collapse text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-800/80 text-xs sm:text-sm text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 font-semibold">Code</th>
                                    <th className="px-4 py-3 font-semibold">Subject</th>
                                    <th className="px-4 py-3 font-semibold text-center">IA</th>
                                    <th className="px-4 py-3 font-semibold text-center">SEE</th>
                                    <th className="px-4 py-3 font-semibold text-center">Total</th>
                                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                                    <th className="px-4 py-3 font-semibold">Advice / Tips</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performanceData.subject_analysis.map((sub, idx) => {
                                    const baseRowClasses = "border-b border-gray-100 dark:border-gray-800 last:border-0";
                                    let statusColor = "";
                                    if (sub.status === "Pass") {
                                        statusColor = "text-green-600 dark:text-green-400";
                                    } else {
                                        statusColor = "text-red-600 dark:text-red-400 font-bold";
                                    }

                                    return (
                                        <tr key={idx} className={`${baseRowClasses} ${getSubjectColor(sub)}`}>
                                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{sub.code}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{sub.subject_name}</td>
                                            <td className="px-4 py-3 text-sm text-center font-semibold text-gray-700 dark:text-gray-300">{sub.ia}</td>
                                            <td className="px-4 py-3 text-sm text-center font-semibold text-gray-700 dark:text-gray-300">{sub.see}</td>
                                            <td className="px-4 py-3 text-sm text-center font-bold text-gray-900 dark:text-gray-100">{sub.total}</td>
                                            <td className={`px-4 py-3 text-sm text-center ${statusColor}`}>{sub.status}</td>
                                            <td className="px-4 py-3 text-xs sm:text-sm">
                                                {sub.advice && <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">{sub.advice}</p>}
                                                {sub.tips && <p className="text-blue-600 dark:text-blue-400">{sub.tips}</p>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Overall Improvement Advice */}
                        <div className="lg:col-span-2 space-y-4">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                📈 Overall Improvement Advice
                            </h4>
                            {performanceData.improvement_advice.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {performanceData.improvement_advice.map((advice, i) => (
                                        <div key={`advice-${i}`} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-xl shadow-sm hover:shadow-md transition text-sm flex items-start">
                                            <span className="mr-2 text-blue-500">💡</span> 
                                            <span className="leading-snug">{advice}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800/50 px-4 py-3 rounded-xl shadow-sm font-medium">
                                    ✨ Excellent performance! Keep it up.
                                </div>
                            )}

                            {/* Overall Study Summary */}
                            {performanceData.study_summary && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl shadow-sm border border-yellow-100 dark:border-yellow-900/30 text-gray-800 dark:text-gray-200 mt-4">
                                    <h4 className="text-sm font-bold text-yellow-700 dark:text-yellow-400 mb-2 uppercase tracking-wider">
                                        📌 Overall Study Advice
                                    </h4>
                                    <p className="text-sm leading-relaxed text-yellow-900 dark:text-yellow-200 font-medium">
                                        {performanceData.study_summary}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Chart */}
                        {chartUrl && (
                            <div className="lg:col-span-1 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wider w-full text-center">
                                    Subject Marks Chart
                                </h4>
                                <img src={chartUrl} alt="Student Marks Chart" className="w-full rounded-lg shadow-sm border border-gray-200 dark:border-slate-600 bg-white" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
