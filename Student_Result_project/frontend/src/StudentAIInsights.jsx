import React, { useState } from "react";
import API_BASE from "./config";

export default function StudentAIInsights({
  usn: defaultUsn = "",
  semester: defaultSemester = "SEM1",
}) {
  const [usn] = useState(defaultUsn);
  const [semester] = useState(defaultSemester);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  const fetchAIInsights = async () => {
    if (!usn) {
      setError("USN is missing.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const [summaryRes, trendRes, predRes, profileRes] = await Promise.all([
        fetch(`${API_BASE}/ai/summary?usn=${usn}&semester=${semester}`),
        fetch(`${API_BASE}/ai/trend?usn=${usn}`),
        fetch(`${API_BASE}/ai/predict_cgpa?usn=${usn}`),
        fetch(`${API_BASE}/ai/profile?usn=${usn}&semester=${semester}`),
      ]);

      if (!summaryRes.ok || !trendRes.ok || !predRes.ok || !profileRes.ok) {
        throw new Error("Some requests failed");
      }

      const summaryData = await summaryRes.json();
      const trendData = await trendRes.json();
      const predData = await predRes.json();
      const profileData = await profileRes.json();

      setSummary(summaryData);
      setTrend(trendData);
      setPrediction(predData);
      setProfile(profileData);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch insights.");
    }
    setLoading(false);
  };

  return (
    <div className="mt-6 w-full max-w-4xl mx-auto">
      <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-blue-700 dark:text-blue-300">
            🤖 AI Assistant Notes
          </h2>
          <button
            onClick={fetchAIInsights}
            disabled={loading}
            className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Loading..." : "Refresh Insights"}
          </button>
        </div>

        {error && (
          <p className="mt-2 text-red-600 dark:text-red-400">{error}</p>
        )}

        {!error && !loading && (
          <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-200">
            {summary && (
              <>
                <p>{summary.ai_summary}</p>
              </>
            )}

            {profile && (
              <>
                <p>
                  <span className="font-semibold">✅ Strengths:</span>{" "}
                  {profile.strengths?.length > 0
                    ? profile.strengths.join(", ")
                    : "None"}
                </p>
                <p>
                  <span className="font-semibold">⚠️ Weaknesses:</span>{" "}
                  {profile.weaknesses?.length > 0
                    ? profile.weaknesses.join(", ")
                    : "None"}
                </p>
                {profile.ai_advice?.length > 0 && (
                  <p>
                    <span className="font-semibold">💡 AI Advice:</span>{" "}
                    {profile.ai_advice.join(" | ")}
                  </p>
                )}
              </>
            )}

            {trend && (
              <>
                <p>
                  <span className="font-semibold">📊 Trend:</span>{" "}
                  {trend.trend} (Avg SGPA: {trend.avg_sgpa})
                </p>
              </>
            )}

            {prediction && (
              <>
                <p>
                  <span className="font-semibold">📈 Predicted Next SGPA:</span>{" "}
                  {prediction.predicted_next_sgpa}
                </p>
                <p>
                  <span className="font-semibold">🎯 Predicted Final CGPA:</span>{" "}
                  {prediction.predicted_final_cgpa}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
