import React, { useState } from "react";
import API_BASE from "./config";

export default function StudentInsights({ usn = "", semester = "SEM1" }) {
    const [aiData, setAiData] = useState(null);
    const [performanceData, setPerformanceData] = useState(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [loadingPerf, setLoadingPerf] = useState(false);
    const [errorAI, setErrorAI] = useState("");
    const [errorPerf, setErrorPerf] = useState("");
    const [openAI, setOpenAI] = useState(false);
    const [openPerf, setOpenPerf] = useState(false);
    const [chartUrl, setChartUrl] = useState("");

    // Fetch AI Insights
    const fetchAIInsights = async () => {
        if (!usn) return setErrorAI("USN is missing.");
        setErrorAI("");
        setLoadingAI(true);

        try {
            const [summaryRes, profileRes, trendRes, predictRes] =
                await Promise.all([
                    fetch(
                        `${API_BASE}/ai/summary?usn=${usn}&semester=${semester}`,
                        { credentials: "include" }
                    ),
                    fetch(
                        `${API_BASE}/ai/profile?usn=${usn}&semester=${semester}`,
                        { credentials: "include" }
                    ),
                    fetch(`${API_BASE}/ai/trend?usn=${usn}`, {
                        credentials: "include",
                    }),
                    fetch(`${API_BASE}/ai/predict_cgpa?usn=${usn}`, {
                        credentials: "include",
                    }),
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
            const res = await fetch(
                `${API_BASE}/auth/Student/analysis?usn=${usn}&semester=${semester}`,
                { credentials: "include" }
            );
            const data = await res.json();

            if (res.ok) {
                setPerformanceData({
                    ...data,
                    subject_analysis: Array.isArray(data.subject_analysis)
                        ? data.subject_analysis
                        : [],
                    improvement_advice: Array.isArray(data.improvement_advice)
                        ? data.improvement_advice
                        : [],
                    study_summary:
                        data.study_summary || "Focus on overall improvement.", // use the concise summary
                });
                fetchChart();
                setOpenPerf(true);
            } else {
                setErrorPerf(
                    data?.error || "Failed to fetch student performance"
                );
            }
        } catch (err) {
            setErrorPerf("Server error: " + err.message);
        } finally {
            setLoadingPerf(false);
        }
    };

    // Fetch Chart
    const fetchChart = async () => {
        try {
            const res = await fetch(
                `${API_BASE}/auth/Student/chart?usn=${usn}&semester=${semester}`,
                { credentials: "include" }
            );
            if (!res.ok) return;
            const data = await res.json();
            setChartUrl(data.image || "");
        } catch (err) {
            console.error("Failed to fetch chart:", err);
        }
    };

    // Get subject color based on marks
    const getSubjectColor = (subject) => {
        const marks = subject.total || 0;
        if (marks < 50) return "bg-red-200";
        if (marks >= 50 && marks <= 80) return "bg-yellow-200";
        return "bg-green-200";
    };

    return (
        <div className="p-2 rounded space-y-2">
            {/* Buttons to toggle panels */}
            <div className="flex flex-col sm:flex-row gap-2">
                <button
                    onClick={() => {
                        if (!aiData) fetchAIInsights();
                        setOpenAI(true); 
                        setOpenPerf(false);
                    }}
                    disabled={loadingAI}
                    className="flex-1 bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 transition-transform transform hover:scale-102"
                >
                    ✨ AI Insights{" "}
                    {loadingAI && <span className="ml-2 animate-spin">⏳</span>}
                    {!loadingAI && aiData && (
                        <span className="ml-2">{openAI ? "▲" : "▼"}</span>
                    )}
                </button>

                <button
                    onClick={() => {
                        if (!performanceData) fetchPerformance();
                        setOpenAI(false); 
                        setOpenPerf(true);
                    }}
                    disabled={loadingPerf}
                    className="flex-1 bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition-transform transform hover:scale-102"
                >
                    📊 Performance Dashboard{" "}
                    {loadingPerf && (
                        <span className="ml-2 animate-spin">⏳</span>
                    )}
                    {!loadingPerf && performanceData && (
                        <span className="ml-2">{openPerf ? "▲" : "▼"}</span>
                    )}
                </button>
            </div>

            <div className="gap-4">
                {openAI && aiData && (
                    <div className="mt-2 space-y-4  p-4 rounded-lg shadow-inner text-gray-800">
                        {/* 🧠 AI Summary */}
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h4 className="font-semibold text-purple-600 mb-2">
                                🧠 AI Summary
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-gray-100 px-2 py-1 rounded">
                                    <b>Student:</b> {aiData.ai_summary.name}
                                </div>
                                <div className="bg-gray-100 px-2 py-1 rounded">
                                    <b>USN:</b> {aiData.ai_summary.usn}
                                </div>
                                <div className="bg-gray-100 px-2 py-1 rounded">
                                    <b>Current Semester:</b>{" "}
                                    {aiData.ai_summary.semester}
                                </div>
                                <div className="bg-gray-100 px-2 py-1 rounded">
                                    <b>Marks:</b>{" "}
                                    {aiData.ai_summary.total_marks}
                                </div>
                                <div className="bg-gray-100 px-2 py-1 rounded">
                                    <b>Percentage:</b>{" "}
                                    {aiData.ai_summary.percentage}
                                </div>
                                <div className="bg-gray-100 px-2 py-1 rounded">
                                    <b>Credits:</b>{" "}
                                    {aiData.ai_summary.obtained_credits}
                                </div>
                                <div className="bg-gray-100 px-2 py-1 rounded">
                                    <b>SGPA:</b> {aiData.ai_summary.sgpa}
                                </div>
                                <div className="bg-gray-100 px-2 py-1 rounded">
                                    <b>CGPA:</b> {aiData.ai_summary.cgpa}
                                </div>
                            </div>

                            {/* Multi-semester Backlogs */}
                            <div className="mt-4">
                                <h4 className="font-semibold text-purple-600 mb-2">
                                    ⚠️ Backlogs
                                </h4>
                                {Object.keys(aiData.ai_profile.backlogs || {})
                                    .length === 0 ? (
                                    <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm w-fit">
                                        No backlogs
                                    </div>
                                ) : (
                                    Object.entries(
                                        aiData.ai_profile.backlogs
                                    ).map(([sem, semData]) => (
                                        <div key={sem} className="mb-3">
                                            <div className="text-gray-700 font-semibold mb-1">
                                                {sem}:
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                {(
                                                    semData.failed_subjects ||
                                                    []
                                                ).map((subj, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="bg-red-100 text-red-800 px-2 py-2 rounded font-semibold"
                                                    >
                                                        {subj.subject}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* 📊 AI Profile */}
                        <div className="bg-white p-3 rounded-lg shadow space-y-4">
                            <h4 className="font-semibold text-purple-600">
                                📊 AI Profile
                            </h4>

                            {/* Subject Strengths & Weaknesses */}
                            <div>
                                <b>📌 Subject Strengths & Weaknesses:</b>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                    {(
                                        aiData.ai_profile
                                            .latest_strong_subjects || []
                                    ).map((subj, i) => (
                                        <div
                                            key={`strong-${i}`}
                                            className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm"
                                        >
                                            {subj}
                                        </div>
                                    ))}
                                    {(
                                        aiData.ai_profile.latest_mid_subjects ||
                                        []
                                    ).map((subj, i) => (
                                        <div
                                            key={`mid-${i}`}
                                            className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm"
                                        >
                                            {subj}
                                        </div>
                                    ))}
                                    {(
                                        aiData.ai_profile
                                            .latest_weak_subjects || []
                                    ).map((subj, i) => (
                                        <div
                                            key={`weak-${i}`}
                                            className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm"
                                        >
                                            {subj}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <b>📚 Tag-level Strengths & Weaknesses:</b>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                    {(aiData.ai_profile.strong_tags || []).map(
                                        (tag, i) => (
                                            <div
                                                key={`strong-tag-${i}`}
                                                className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm"
                                            >
                                                {tag}
                                            </div>
                                        )
                                    )}
                                    {(aiData.ai_profile.mid_tags || []).map(
                                        (tag, i) => (
                                            <div
                                                key={`mid-tag-${i}`}
                                                className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm"
                                            >
                                                {tag}
                                            </div>
                                        )
                                    )}
                                    {(aiData.ai_profile.weak_tags || []).map(
                                        (tag, i) => (
                                            <div
                                                key={`weak-tag-${i}`}
                                                className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm"
                                            >
                                                {tag}
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* Subject Area Averages */}
                            {aiData.ai_profile.tag_avgs && (
                                <div>
                                    <b>📚 Subject Area Averages:</b>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        {Object.entries(
                                            aiData.ai_profile.tag_avgs
                                        ).map(([tag, avg], i) => (
                                            <div
                                                key={i}
                                                className="bg-gray-100 px-2 py-1 rounded text-sm"
                                            >
                                                {tag}:{" "}
                                                <span className="font-semibold">
                                                    {avg.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Learning Plan */}
                            {aiData.ai_profile.learning_plan?.length > 0 && (
                                <div>
                                    <b>📝 Learning Plan:</b>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        {aiData.ai_profile.learning_plan.map(
                                            (tip, index) => (
                                                <div
                                                    key={index}
                                                    className="bg-gray-100 px-2 py-1 rounded text-sm"
                                                >
                                                    {tip}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Placement Advice */}
                            {aiData.ai_profile.placement_advice?.length > 0 && (
                                <div>
                                    <b>🎯 Placement Advice:</b>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        {aiData.ai_profile.placement_advice.map(
                                            (advice, index) => (
                                                <div
                                                    key={index}
                                                    className="bg-gray-100 px-2 py-1 rounded text-sm"
                                                >
                                                    {advice}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 📈 Trend */}
                        <div className="bg-white p-3 rounded-lg shadow">
                            <h4 className="font-semibold text-purple-600">
                                📈 SGPA Trend
                            </h4>
                            <p>
                                <b>Trend:</b> {aiData.trend.trend || "N/A"}
                            </p>
                            <p>
                                <b>Average SGPA:</b>{" "}
                                {aiData.trend.avg_sgpa || "N/A"}
                            </p>
                            {aiData.trend.history && (
                                <div className="mt-2">
                                    <b>History:</b>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        {Object.entries(aiData.trend.history)
                                            .sort(
                                                ([a], [b]) =>
                                                    parseInt(
                                                        a.replace("SEM", "")
                                                    ) -
                                                    parseInt(
                                                        b.replace("SEM", "")
                                                    )
                                            )
                                            .map(([sem, sgpa]) => (
                                                <div
                                                    key={sem}
                                                    className="bg-gray-100 px-2 py-1 rounded text-sm"
                                                >
                                                    {sem}:{" "}
                                                    <span className="font-semibold">
                                                        {Number(sgpa).toFixed(
                                                            2
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 🔮 CGPA Prediction */}
                        <div className="bg-white p-3 rounded-lg shadow">
                            <h4 className="font-semibold text-purple-600">
                                🔮 CGPA Prediction
                            </h4>
                            <p>
                                <b>Predicted Next SGPA:</b>{" "}
                                {aiData.cgpa_prediction.predicted_next_sgpa ||
                                    "N/A"}
                            </p>
                            <p>
                                <b>Predicted Final CGPA:</b>{" "}
                                {aiData.cgpa_prediction.predicted_final_cgpa ||
                                    "N/A"}
                            </p>
                        </div>
                    </div>
                )}

                {openPerf && performanceData && (
                    <div className="mt-2 space-y-4 bg-gray-50 p-4 rounded-lg shadow-inner text-gray-800">
                        <h3 className="font-semibold text-blue-600 mb-2">
                            📊 Student Performance Dashboard
                        </h3>

                        {/* Summary */}
                        <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                            <div className="bg-gray-100 px-2 py-1 rounded">
                                <b>Name:</b> {performanceData.name}
                            </div>
                            <div className="bg-gray-100 px-2 py-1 rounded">
                                <b>USN:</b> {performanceData.usn}
                            </div>
                            <div className="bg-gray-100 px-2 py-1 rounded">
                                <b>Semester:</b> {semester}
                            </div>
                            <div className="bg-gray-100 px-2 py-1 rounded">
                                <b>Total Marks:</b>{" "}
                                {performanceData.total_marks}
                            </div>
                            <div className="bg-gray-100 px-2 py-1 rounded">
                                <b>Percentage:</b>{" "}
                                {performanceData.percentage.toFixed(2)}%
                            </div>
                            <div className="bg-gray-100 px-2 py-1 rounded">
                                <b>SGPA:</b> {performanceData.sgpa.toFixed(2)}
                            </div>
                            <div className="bg-gray-100 px-2 py-1 rounded">
                                <b>CGPA:</b> {performanceData.cgpa.toFixed(2)}
                            </div>

                            {performanceData.predicted_next_sgpa && (
                                <div className="bg-gray-100 px-2 py-1 rounded">
                                    <b>Predicted Next SGPA:</b>{" "}
                                    {performanceData.predicted_next_sgpa.toFixed(
                                        2
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Subjects Table */}
                        <div>
                            <h4 className="font-semibold mb-2">Subjects</h4>
                            <table className="w-full border text-center">
                                <thead>
                                    <tr className="border bg-gray-100">
                                        <th className="border px-2 py-1">
                                            Code
                                        </th>
                                        <th className="border px-2 py-1">
                                            Subject
                                        </th>
                                        <th className="border px-2 py-1">IA</th>
                                        <th className="border px-2 py-1">
                                            SEE
                                        </th>
                                        <th className="border px-2 py-1">
                                            Total
                                        </th>
                                        <th className="border px-2 py-1">
                                            Status
                                        </th>
                                        <th className="border px-2 py-1">
                                            Advice / Tips
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performanceData.subject_analysis.map(
                                        (sub) => (
                                            <tr
                                                key={sub.code}
                                                className={`border ${getSubjectColor(
                                                    sub
                                                )}`}
                                            >
                                                <td className="border px-2 py-1">
                                                    {sub.code}
                                                </td>
                                                <td className="border px-2 py-1">
                                                    {sub.subject_name}
                                                </td>
                                                <td className="border px-2 py-1">
                                                    {sub.ia}
                                                </td>
                                                <td className="border px-2 py-1">
                                                    {sub.see}
                                                </td>
                                                <td className="border px-2 py-1">
                                                    {sub.total}
                                                </td>
                                                <td className="border px-2 py-1">
                                                    {sub.status}
                                                </td>
                                                <td className="border px-2 py-1 text-left text-sm">
                                                    {sub.advice && (
                                                        <p className="text-red-600 font-medium">
                                                            {sub.advice}
                                                        </p>
                                                    )}
                                                    {sub.tips && (
                                                        <p className="text-green-600">
                                                            {sub.tips}
                                                        </p>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Overall Improvement Advice */}
                        <div>
                            <h4 className="font-semibold mb-2">
                                Overall Improvement Advice
                            </h4>
                            {performanceData.improvement_advice.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {performanceData.improvement_advice.map(
                                        (advice, i) => (
                                            <div
                                                key={`advice-${i}`}
                                                className="bg-gray-100 text-black-800 px-4 py-2 rounded shadow-sm hover:shadow-md transition"
                                            >
                                                {advice}
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="bg-green-100 text-green-800 px-4 py-2 rounded shadow-sm">
                                    Excellent performance! Keep it up.
                                </div>
                            )}
                        </div>

                        {/* Overall Study Summary */}
                        {performanceData.study_summary && (
                            <div className="bg-yellow-50 p-4 rounded-lg shadow-inner text-gray-800 mt-4">
                                <h4 className="font-semibold text-yellow-700 mb-2">
                                    📌 Overall Study Advice
                                </h4>
                                <p className="text-sm">
                                    {performanceData.study_summary}
                                </p>
                            </div>
                        )}

                        {/* Chart */}
                        {chartUrl && (
                            <div className="mt-2">
                                <h4 className="font-semibold mb-2">
                                    Subject Marks Chart
                                </h4>
                                <img
                                    src={chartUrl}
                                    alt="Student Marks Chart"
                                    className="w-full"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
