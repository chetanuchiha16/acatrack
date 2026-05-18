import { useState, useEffect } from "react";
import {
    aiSummaryAiSummaryGet,
    aiProfileAiProfileGet,
    aiTrendAiTrendGet,
    aiPredictCgpaAiPredictCgpaGet,
    getStudentAnalysisAuthStudentAnalysisGet
} from "../../client/sdk.gen";
import {
    Sparkles, BarChart3, TrendingUp, TrendingDown,
    Minus, AlertTriangle, CheckCircle, Lightbulb, Target, BookOpen, GraduationCap, ArrowRight
} from "lucide-react";

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

// ─── Interactive SVG Performance Chart ─────────────────────────────────────────
const AcademicSVGChart: React.FC<{ subjects: SubjectAnalysis[] }> = ({ subjects }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  if (!subjects || subjects.length === 0) return null;

  const chartHeight = 220;
  const paddingBottom = 40;
  const paddingTop = 20;
  const paddingLeft = 40;
  const paddingRight = 20;
  const chartWidth = 500;

  const maxVal = 100;
  const graphHeight = chartHeight - paddingTop - paddingBottom;
  const graphWidth = chartWidth - paddingLeft - paddingRight;

  const step = graphWidth / subjects.length;
  const barWidth = Math.min(30, step * 0.6);

  return (
    <div className="relative bg-slate-50 dark:bg-[#0b0f19] p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-inner w-full">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
        <defs>
          <linearGradient id="barGradPass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="barGradFail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <filter id="glowPass" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid Lines */}
        {[0, 25, 50, 75, 100].map((val) => {
          const y = paddingTop + graphHeight - (val / maxVal) * graphHeight;
          return (
            <g key={val}>
              <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="rgba(148, 163, 184, 0.08)" strokeDasharray="3 3" />
              <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="text-[10px] font-black fill-slate-400 dark:fill-slate-500">{val}</text>
            </g>
          );
        })}

        {/* Bars */}
        {subjects.map((sub, index) => {
          const total = sub.total || 0;
          const pct = Math.min(100, Math.max(0, total));
          const barHeight = (pct / maxVal) * graphHeight;
          const x = paddingLeft + index * step + (step - barWidth) / 2;
          const y = paddingTop + graphHeight - barHeight;
          const isHovered = hoveredIndex === index;
          const isPass = (sub.status || "").toLowerCase() === "pass";

          return (
            <g
              key={sub.code || index}
              onMouseEnter={(e) => {
                setHoveredIndex(index);
                // Position tooltip above the bar
                setTooltipPos({
                  x: x + barWidth / 2,
                  y: y - 10
                });
              }}
              onMouseLeave={() => {
                setHoveredIndex(null);
                setTooltipPos(null);
              }}
              className="cursor-pointer"
            >
              {/* Actual bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={isPass ? "url(#barGradPass)" : "url(#barGradFail)"}
                filter={isHovered ? "url(#glowPass)" : undefined}
                className="transition-all duration-300 origin-bottom"
                style={{
                  transform: isHovered ? "scaleY(1.03)" : "none",
                  transformOrigin: "bottom"
                }}
              />

              {/* Subject Code labels at bottom */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - paddingBottom + 16}
                textAnchor="middle"
                className={`text-[9px] font-bold uppercase transition-all duration-200 ${isHovered ? "fill-indigo-500 dark:fill-indigo-400 font-extrabold scale-105" : "fill-slate-400 dark:fill-slate-500"}`}
              >
                {sub.code || "N/A"}
              </text>
            </g>
          );
        })}

        {/* X Axis Line */}
        <line x1={paddingLeft} y1={chartHeight - paddingBottom} x2={chartWidth - paddingRight} y2={chartHeight - paddingBottom} stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1.5" />
      </svg>

      {/* Floating Interactive Tooltip */}
      {hoveredIndex !== null && tooltipPos && (
        <div
          className="absolute z-50 bg-slate-900/95 dark:bg-slate-950/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-md pointer-events-none transition-all duration-200"
          style={{
            left: `${(tooltipPos.x / chartWidth) * 100}%`,
            top: `${(tooltipPos.y / chartHeight) * 100}%`,
            transform: "translate(-50%, -105%)",
          }}
        >
          <div className="flex flex-col gap-1 min-w-[150px]">
            <div className="flex justify-between items-center gap-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{subjects[hoveredIndex].code}</span>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${subjects[hoveredIndex].status?.toLowerCase() === 'pass' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {subjects[hoveredIndex].status}
              </span>
            </div>
            <span className="text-xs font-bold text-white truncate max-w-[180px]">{subjects[hoveredIndex].subject_name}</span>
            <div className="border-t border-slate-800/80 my-1"></div>
            <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-300">
              <span>IA Internals:</span>
              <span className="text-right font-mono font-bold text-slate-200">{subjects[hoveredIndex].ia}</span>
              <span>SEE Exam:</span>
              <span className="text-right font-mono font-bold text-slate-200">{subjects[hoveredIndex].see}</span>
              <span className="text-white font-bold mt-0.5">Total Marks:</span>
              <span className="text-right font-mono font-black text-indigo-400 mt-0.5 text-[11px]">{subjects[hoveredIndex].total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function StudentAIInsights({ usn = "", semester = "sem1" }) {
    const [viewMode, setViewMode] = useState<"ai" | "perf">("ai");
    
    const [aiData, setAiData] = useState<AiData | null>(null);
    const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
    const [loadingAI, setLoadingAI] = useState<boolean>(false);
    const [loadingPerf, setLoadingPerf] = useState<boolean>(false);
    const [errorAI, setErrorAI] = useState<string>("");
    const [errorPerf, setErrorPerf] = useState<string>("");

    useEffect(() => {
        if (viewMode === "ai" && !aiData && !loadingAI) {
            void fetchAIInsights();
        } else if (viewMode === "perf" && !performanceData && !loadingPerf) {
            void fetchPerformance();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [viewMode, usn, semester]);

    // Fetch AI Insights
    const fetchAIInsights = async () => {
        if (!usn) return setErrorAI("USN is missing.");
        setErrorAI("");
        setLoadingAI(true);

        try {
            const [summaryRes, profileRes, trendRes, predictRes] =
                await Promise.all([
                    aiSummaryAiSummaryGet({ query: { usn } }),
                    aiProfileAiProfileGet({ query: { usn } }),
                    aiTrendAiTrendGet({ query: { usn } }),
                    aiPredictCgpaAiPredictCgpaGet({ query: { usn } }),
                ]);

            const summaryData = summaryRes.data as { ai_summary: AiSummary };
            setAiData({
                ai_summary: summaryData.ai_summary,
                ai_profile: profileRes.data as AiProfile,
                trend: trendRes.data as AiTrend,
                cgpa_prediction: predictRes.data as CgpaPrediction,
            });
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
            const res = await getStudentAnalysisAuthStudentAnalysisGet({
                query: { usn, semester }
            });
            const data = res.data as PerformanceData;

            if (res.data) {
                setPerformanceData({
                    ...data,
                    subject_analysis: Array.isArray(data.subject_analysis) ? data.subject_analysis : [],
                    improvement_advice: Array.isArray(data.improvement_advice) ? data.improvement_advice : [],
                    study_summary: data.study_summary || "Focus on overall improvement.",
                });
            } else {
                const errorData = res.error as { error?: string };
                setErrorPerf(errorData?.error || "Failed to fetch student performance");
            }
        } catch (err: unknown) {
            setErrorPerf("Server error: " + (err instanceof Error ? err.message : "Unknown"));
        } finally {
            setLoadingPerf(false);
        }
    };

    const getSubjectColor = (subject: SubjectAnalysis): string => {
        const marks = subject.total ?? 0;
        if (marks < 50) return "bg-red-50/50 dark:bg-red-500/5 text-red-900 dark:text-red-300";
        if (marks >= 50 && marks <= 80) return "bg-amber-50/50 dark:bg-amber-500/5 text-amber-900 dark:text-amber-300";
        return "bg-green-50/50 dark:bg-green-500/5 text-green-900 dark:text-green-300";
    };

    return (
        <div className="w-full space-y-8 mt-6">
            {/* Segmented Control Navigation */}
            <div className="flex justify-center">
                <div className="bg-gray-100/80 dark:bg-gray-900 p-1.5 rounded-full inline-flex border border-gray-200/60 dark:border-gray-800 shadow-sm backdrop-blur-md">
                    <button
                        onClick={() => setViewMode("ai")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                            viewMode === "ai"
                                ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-md border-gray-100 dark:border-gray-700"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        <Sparkles size={18} className={viewMode === "ai" ? "text-purple-500" : ""} />
                        AI Insights
                    </button>
                    <button
                        onClick={() => setViewMode("perf")}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                            viewMode === "perf"
                                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-md border-gray-100 dark:border-gray-700"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                        }`}
                    >
                        <BarChart3 size={18} className={viewMode === "perf" ? "text-blue-500" : ""} />
                        Performance Dashboard
                    </button>
                </div>
            </div>

            {errorAI && viewMode === "ai" && <p className="text-sm text-red-600 text-center font-medium animate-pulse">{errorAI}</p>}
            {errorPerf && viewMode === "perf" && <p className="text-sm text-red-600 text-center font-medium animate-pulse">{errorPerf}</p>}

            {/* AI Insights View */}
            {viewMode === "ai" && (
                <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {loadingAI ? (
                        <div className="flex justify-center items-center py-20 text-purple-500">
                            <Sparkles className="animate-spin mr-3" size={24} />
                            <span className="font-medium animate-pulse">Generating AI Insights...</span>
                        </div>
                    ) : aiData ? (
                        <>
                            {/* Top Row: Hero Prediction & Trend */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Hero Card */}
                                <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl flex flex-col justify-between group border border-purple-500/30">
                                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div>
                                            <h3 className="text-purple-100 font-medium tracking-wider uppercase text-xs sm:text-sm mb-1 flex items-center gap-2">
                                                <Sparkles size={16} /> AI Prediction Model
                                            </h3>
                                            <p className="text-sm text-purple-200/80 mb-6 max-w-sm">Based on your historical performance and current trajectory.</p>
                                        </div>
                                        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold border border-white/20 uppercase tracking-wider">
                                            {aiData.ai_summary.semester}
                                        </div>
                                    </div>
                                    <div className="relative z-10 mt-auto">
                                        <p className="text-xs text-purple-200 uppercase tracking-widest font-semibold mb-2">Predicted Final CGPA</p>
                                        <div className="text-6xl sm:text-7xl font-black tracking-tight">{aiData.cgpa_prediction.predicted_final_cgpa || "N/A"}</div>
                                        
                                        <div className="mt-8 inline-flex flex-col sm:flex-row items-start sm:items-center bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 gap-4">
                                            <div className="flex items-center gap-3 pr-6 sm:border-r border-white/10">
                                                <div className="bg-white/10 p-2 rounded-lg">
                                                    <Target className="text-purple-300" size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-purple-200 uppercase tracking-widest font-semibold">Predicted Next SGPA</p>
                                                    <p className="text-xl font-bold text-white">{aiData.cgpa_prediction.predicted_next_sgpa || "N/A"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white/10 p-2 rounded-lg">
                                                    <GraduationCap className="text-blue-300" size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-purple-200 uppercase tracking-widest font-semibold">Current CGPA</p>
                                                    <p className="text-xl font-bold text-white">{aiData.ai_summary.cgpa?.toFixed(2) || "N/A"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Trend Timeline */}
                                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-6 shadow-md border border-gray-100 dark:border-gray-700 flex flex-col relative overflow-hidden backdrop-blur-sm">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none">
                                        <TrendingUp size={120} />
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <BarChart3 size={16} /> SGPA History
                                    </h4>
                                    
                                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                        {aiData.trend.history ? (
                                            <div className="relative border-l-2 border-gray-100 dark:border-gray-700 ml-3 space-y-6 py-2">
                                                {Object.entries(aiData.trend.history)
                                                    .sort(([a], [b]) => parseInt(a.replace("sem", "")) - parseInt(b.replace("sem", "")))
                                                    .map(([sem, sgpa], idx, arr) => {
                                                        const isLast = idx === arr.length - 1;
                                                        const val = Number(sgpa);
                                                        const isGood = val >= 8.0;
                                                        const isMid = val >= 6.0 && val < 8.0;
                                                        
                                                        return (
                                                            <div key={sem} className="relative pl-6">
                                                                <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${
                                                                    isGood ? "bg-green-500" : isMid ? "bg-amber-500" : "bg-red-500"
                                                                } ${isLast ? "animate-pulse ring-4 ring-purple-500/20" : ""}`}></div>
                                                                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">{sem}</span>
                                                                    <span className="font-black text-gray-900 dark:text-white">{val.toFixed(2)}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        ) : (
                                            <div className="flex h-full items-center justify-center text-sm text-gray-400">No history available</div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Average</p>
                                            <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{aiData.trend.avg_sgpa || "N/A"}</p>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                                            aiData.trend.trend === "Improving" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                            aiData.trend.trend === "Declining" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                        }`}>
                                            {aiData.trend.trend === "Improving" ? <TrendingUp size={14} /> : 
                                             aiData.trend.trend === "Declining" ? <TrendingDown size={14} /> : <Minus size={14} />}
                                            {aiData.trend.trend || "Stable"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Middle Row: Backlogs & Tags */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Strengths & Weaknesses Card */}
                                <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-6 shadow-md border border-gray-100 dark:border-gray-700 backdrop-blur-sm">
                                    <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <Target size={16} /> Performance Breakdown
                                    </h4>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pl-1">Strong Areas</p>
                                            <div className="flex flex-wrap gap-2">
                                                {aiData.ai_profile.strong_tags?.map((tag, i) => (
                                                    <span key={`s-tag-${i}`} className="bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-200/50 dark:border-green-800/30 hover:scale-105 transition-transform cursor-default">{tag}</span>
                                                ))}
                                                {aiData.ai_profile.latest_strong_subjects?.map((subj, i) => (
                                                    <span key={`s-sub-${i}`} className="bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-200/50 dark:border-green-800/30 hover:scale-105 transition-transform cursor-default">{subj}</span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pl-1">Needs Improvement</p>
                                            <div className="flex flex-wrap gap-2">
                                                {aiData.ai_profile.weak_tags?.map((tag, i) => (
                                                    <span key={`w-tag-${i}`} className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200/50 dark:border-red-800/30 hover:scale-105 transition-transform cursor-default">{tag}</span>
                                                ))}
                                                {aiData.ai_profile.latest_weak_subjects?.map((subj, i) => (
                                                    <span key={`w-sub-${i}`} className="bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-200/50 dark:border-red-800/30 hover:scale-105 transition-transform cursor-default">{subj}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actionable Advice */}
                                <div className="space-y-6">
                                    {/* Backlogs Notice */}
                                    {Object.keys(aiData.ai_profile.backlogs || {}).length > 0 && (
                                        <div className="bg-red-50 dark:bg-red-900/10 rounded-3xl p-6 border border-red-200 dark:border-red-900/30">
                                            <h4 className="text-sm font-bold text-red-800 dark:text-red-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <AlertTriangle size={16} /> Active Backlogs
                                            </h4>
                                            <div className="space-y-3">
                                                {Object.entries(aiData.ai_profile.backlogs || {}).map(([sem, data]) => (
                                                    <div key={sem} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-red-100 dark:border-red-900/20">
                                                        <span className="text-xs font-bold text-red-800 dark:text-red-300 uppercase bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">{sem}</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(data.failed_subjects || []).map((sub, i) => (
                                                                <span key={i} className="text-xs font-semibold text-red-700 dark:text-red-300">• {sub.subject}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Learning Plan */}
                                    {aiData.ai_profile.learning_plan && aiData.ai_profile.learning_plan.length > 0 && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-3xl p-6 border border-blue-100 dark:border-blue-900/30 flex-1">
                                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <BookOpen size={16} /> Suggested Learning Plan
                                            </h4>
                                            <ul className="space-y-3">
                                                {aiData.ai_profile.learning_plan.map((tip, i) => (
                                                    <li key={i} className="flex items-start gap-3">
                                                        <CheckCircle className="text-blue-500 mt-0.5 shrink-0" size={16} />
                                                        <span className="text-sm text-blue-900 dark:text-blue-200 font-medium leading-relaxed">{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Bottom Row: Placement Advice */}
                            {aiData.ai_profile.placement_advice && aiData.ai_profile.placement_advice.length > 0 && (
                                <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/80 dark:to-gray-900/80 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="bg-amber-100 dark:bg-amber-900/30 p-2.5 rounded-xl text-amber-600 dark:text-amber-400">
                                            <Lightbulb size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Career & Placement Advice</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tailored recommendations based on your academic profile</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {aiData.ai_profile.placement_advice.map((advice, i) => (
                                            <div key={i} className="bg-white dark:bg-black/20 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50 flex items-start gap-3">
                                                <ArrowRight className="text-amber-500 mt-0.5 shrink-0" size={16} />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{advice}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {/* Performance Dashboard View */}
            {viewMode === "perf" && (
                <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {loadingPerf ? (
                        <div className="flex justify-center items-center py-20 text-blue-500">
                            <BarChart3 className="animate-spin mr-3" size={24} />
                            <span className="font-medium animate-pulse">Loading Performance Dashboard...</span>
                        </div>
                    ) : performanceData ? (
                        <>
                            {/* Metrics Ribbon */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Semester SGPA</p>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{(performanceData.sgpa ?? 0).toFixed(2)}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Percentage</p>
                                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{(performanceData.percentage ?? 0).toFixed(1)}%</p>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-1">Cumulative CGPA</p>
                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{(performanceData.cgpa ?? 0).toFixed(2)}</p>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-5 shadow-sm border border-purple-100 dark:border-purple-900/20">
                                    <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase tracking-widest font-semibold mb-1">Target Next SGPA</p>
                                    <p className="text-3xl font-black text-purple-700 dark:text-purple-300">{(performanceData.predicted_next_sgpa ?? 0).toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Subjects Table (Takes 2 columns on large screens) */}
                                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <BookOpen size={16} className="text-blue-500" /> Subject Breakdown
                                    </h4>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead>
                                                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                                                    <th className="pb-3 font-semibold">Subject</th>
                                                    <th className="pb-3 font-semibold text-center">IA</th>
                                                    <th className="pb-3 font-semibold text-center">SEE</th>
                                                    <th className="pb-3 font-semibold text-center">Total</th>
                                                    <th className="pb-3 font-semibold text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                                                {performanceData.subject_analysis.map((sub, idx) => (
                                                    <tr key={idx} className={`group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${getSubjectColor(sub)}`}>
                                                        <td className="py-4 pr-4">
                                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{sub.subject_name}</div>
                                                            <div className="text-xs text-gray-500 mt-1 opacity-80">{sub.code}</div>
                                                            {sub.advice && <div className="text-xs mt-2 text-gray-600 dark:text-gray-400 max-w-sm hidden sm:block">{sub.advice}</div>}
                                                        </td>
                                                        <td className="py-4 text-center font-medium opacity-90">{sub.ia}</td>
                                                        <td className="py-4 text-center font-medium opacity-90">{sub.see}</td>
                                                        <td className="py-4 text-center font-bold">{sub.total}</td>
                                                        <td className="py-4 text-center">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                sub.status === "Pass" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
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

                                {/* Right Column: Chart & Advice */}
                                <div className="space-y-6">
                                    {performanceData.subject_analysis && performanceData.subject_analysis.length > 0 && (
                                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <BarChart3 size={16} className="text-indigo-500" /> Interactive Performance Chart
                                            </h4>
                                            <AcademicSVGChart subjects={performanceData.subject_analysis} />
                                        </div>
                                    )}

                                    <div className="bg-blue-50 dark:bg-blue-900/10 rounded-3xl p-6 border border-blue-100 dark:border-blue-900/20">
                                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <Lightbulb size={16} /> Action Items
                                        </h4>
                                        <div className="space-y-4">
                                            {performanceData.study_summary && (
                                                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                                    {performanceData.study_summary}
                                                </p>
                                            )}
                                            <ul className="space-y-3">
                                                {performanceData.improvement_advice.map((advice, i) => (
                                                    <li key={i} className="flex items-start gap-3">
                                                        <ArrowRight className="text-blue-500 mt-0.5 shrink-0" size={14} />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{advice}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
}
