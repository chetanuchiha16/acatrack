import React, { useState } from "react";
import API_BASE from "./config";

export default function StudentAIInsights({ usn = "", semester = "SEM1" }) {
  const [aiData, setAiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false); // <-- collapsible state

  const fetchAIInsights = async () => {
    if (!usn) {
      setError("USN is missing.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const summaryRes = await fetch(`${API_BASE}/ai/summary?usn=${usn}&semester=${semester}`);
      const profileRes = await fetch(`${API_BASE}/ai/profile?usn=${usn}&semester=${semester}`);
      const trendRes = await fetch(`${API_BASE}/ai/trend?usn=${usn}`);
      const predictRes = await fetch(`${API_BASE}/ai/predict_cgpa?usn=${usn}`);

      const summaryJson = await summaryRes.json();
      const profileJson = await profileRes.json();
      const trendJson = await trendRes.json();
      const predictJson = await predictRes.json();

      setAiData({
        ai_summary: summaryJson.ai_summary,  // <- unwrap here
        ai_profile: profileJson,
        trend: trendJson,
        cgpa_prediction: predictJson
      });
      setOpen(true);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch AI insights. Check USN and try again.");
    }


    setLoading(false);
  };

  return (
    <div className="p-2 rounded mb-2">
      <button
        onClick={() => {
          if (!aiData) fetchAIInsights(); // fetch if not already
          else setOpen(!open); // toggle if data exists
        }}
        disabled={loading}
        className="w-full text-left bg-purple-500 text-white px-3 py-2 rounded hover:bg-purple-600 transition-transform transform hover:scale-105 flex items-center justify-between"
      >
        ✨ AI Insights
        {loading && <span className="ml-2 animate-spin">⏳</span>}
        {!loading && aiData && <span className="ml-2">{open ? "▲" : "▼"}</span>} {/* collapsible arrow */}
      </button>

      {error && <p className="mt-2 text-red-600">{error}</p>}

      {/* Collapsible panel */}
      {open && aiData && (
        <div className="mt-3 space-y-4 bg-gray-50 p-4 rounded-lg shadow-inner text-gray-800">

          {/* 🧠 AI Summary */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h4 className="font-semibold text-purple-600 mb-2">🧠 AI Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-100 px-2 py-1 rounded"><b>Student:</b> {aiData.ai_summary.name}</div>
              <div className="bg-gray-100 px-2 py-1 rounded"><b>USN:</b> {aiData.ai_summary.usn}</div>
              <div className="bg-gray-100 px-2 py-1 rounded"><b>Current Semester:</b> {aiData.ai_summary.semester}</div>
              <div className="bg-gray-100 px-2 py-1 rounded"><b>Marks:</b> {aiData.ai_summary.total_marks}</div>
              <div className="bg-gray-100 px-2 py-1 rounded"><b>Percentage:</b> {aiData.ai_summary.percentage}</div>
              <div className="bg-gray-100 px-2 py-1 rounded"><b>Credits:</b> {aiData.ai_summary.obtained_credits}</div>
              <div className="bg-gray-100 px-2 py-1 rounded"><b>SGPA:</b> {aiData.ai_summary.sgpa}</div>
              <div className="bg-gray-100 px-2 py-1 rounded"><b>CGPA:</b> {aiData.ai_summary.cgpa}</div>
            </div>

            {/* Multi-semester Backlogs */}
            <div className="mt-4">
              <h4 className="font-semibold text-purple-600 mb-2">⚠️ Backlogs</h4>

              {Object.keys(aiData.ai_profile.backlogs || {}).length === 0 ? (
                <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm w-fit">
                  No backlogs
                </div>
              ) : (
                Object.entries(aiData.ai_profile.backlogs).map(([sem, subjects]) => (
                  <div key={sem} className="mb-3">
                    <div className="text-gray-700 font-semibold mb-1">{sem}:</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {subjects.map((subj, idx) => (
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
            <h4 className="font-semibold text-purple-600">📊 AI Profile</h4>

            {/* Subject Strengths & Weaknesses */}
            <div>
              <b>📌 Subject Strengths & Weaknesses:</b>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {(aiData.ai_profile.latest_strong_subjects || []).map((subj, i) => (
                  <div key={`strong-${i}`} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">{subj}</div>
                ))}
                {(aiData.ai_profile.latest_mid_subjects || []).map((subj, i) => (
                  <div key={`mid-${i}`} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">{subj}</div>
                ))}
                {(aiData.ai_profile.latest_weak_subjects || []).map((subj, i) => (
                  <div key={`weak-${i}`} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">{subj}</div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <b>📚 Tag-level Strengths & Weaknesses:</b>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {(aiData.ai_profile.strong_tags || []).map((tag, i) => (
                  <div key={`strong-tag-${i}`} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">{tag}</div>
                ))}
                {(aiData.ai_profile.mid_tags || []).map((tag, i) => (
                  <div key={`mid-tag-${i}`} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">{tag}</div>
                ))}
                {(aiData.ai_profile.weak_tags || []).map((tag, i) => (
                  <div key={`weak-tag-${i}`} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">{tag}</div>
                ))}
              </div>
            </div>

            {/* Subject Area Averages */}
            {aiData.ai_profile.tag_avgs && (
              <div>
                <b>📚 Subject Area Averages:</b>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {Object.entries(aiData.ai_profile.tag_avgs).map(([tag, avg], i) => (
                    <div key={i} className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {tag}: <span className="font-semibold">{avg.toFixed(2)}</span>
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
                  {aiData.ai_profile.learning_plan.map((tip, index) => (
                    <div key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">{tip}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Placement Advice */}
            {aiData.ai_profile.placement_advice?.length > 0 && (
              <div>
                <b>🎯 Placement Advice:</b>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {aiData.ai_profile.placement_advice.map((advice, index) => (
                    <div key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">{advice}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 📈 Trend */}
          <div className="bg-white p-3 rounded-lg shadow">
            <h4 className="font-semibold text-purple-600">📈 SGPA Trend</h4>
            <p><b>Trend:</b> {aiData.trend.trend || "N/A"}</p>
            <p><b>Average SGPA:</b> {aiData.trend.avg_sgpa || "N/A"}</p>
            {aiData.trend.history && (
              <div className="mt-2">
                <b>History:</b>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {Object.entries(aiData.trend.history)
                    .sort(([a], [b]) => parseInt(a.replace("SEM", "")) - parseInt(b.replace("SEM", "")))
                    .map(([sem, sgpa]) => (
                      <div key={sem} className="bg-gray-100 px-2 py-1 rounded text-sm">
                        {sem}: <span className="font-semibold">{Number(sgpa).toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 🔮 CGPA Prediction */}
          <div className="bg-white p-3 rounded-lg shadow">
            <h4 className="font-semibold text-purple-600">🔮 CGPA Prediction</h4>
            <p><b>Predicted Next SGPA:</b> {aiData.cgpa_prediction.predicted_next_sgpa || "N/A"}</p>
            <p><b>Predicted Final CGPA:</b> {aiData.cgpa_prediction.predicted_final_cgpa || "N/A"}</p>
            {aiData.cgpa_prediction.ci_low !== undefined && aiData.cgpa_prediction.ci_high !== undefined}
          </div>

        </div>
      )}
    </div>
  );
}
