import React, { useState } from "react";
import API_BASE from "./config";

export default function StudentAIInsights({ usn: defaultUsn = "", semester: defaultSemester = "SEM1" }) {
  const [usn, setUsn] = useState(defaultUsn);
  const [semester, setSemester] = useState(defaultSemester);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [risks, setRisks] = useState(null);
  const [error, setError] = useState("");

  

  const fetchAIInsights = async () => {
    if (!usn) {
      setError("Please enter a USN");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // fetch all 3 endpoints in parallel
      const [summaryRes, sgpaRes, riskRes] = await Promise.all([
        fetch(`${API_BASE}/auth/Student/ai_summary?usn=${usn}&semester=${semester}`),
        fetch(`${API_BASE}/auth/Student/predict_sgpa?usn=${usn}&semester=${semester}`),
        fetch(`${API_BASE}/auth/Student/risk_analysis?usn=${usn}&semester=${semester}`)
      ]);

      const summaryData = await summaryRes.json();
      const sgpaData = await sgpaRes.json();
      const riskData = await riskRes.json();

      setSummary(summaryData);
      setPrediction(sgpaData);
      setRisks(riskData);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch insights.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">📊 AI Student Insights</h1>

      {/* Input Section */}
      <div className="flex items-center gap-2">
        
        <button
          onClick={fetchAIInsights}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Loading..." : "Get Insights"}
        </button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {/* AI Summary */}
      {summary && (
        <div className="border rounded-lg p-4 shadow">
          <h2 className="font-semibold text-lg">📝 AI Summary</h2>
          <p className="mt-2">{summary.ai_summary}</p>
          <p className="mt-2">
            <strong>Strengths:</strong>{" "}
            {summary.insights.strengths.join(", ") || "None"}
          </p>
          <p>
            <strong>Weaknesses:</strong>{" "}
            {summary.insights.weaknesses.join(", ") || "None"}
          </p>
          <p>
            <strong>Credits Remaining:</strong>{" "}
            {summary.insights.credits_remaining}
          </p>
        </div>
      )}

      {/* SGPA Prediction */}
      {prediction && (
        <div className="border rounded-lg p-4 shadow">
          <h2 className="font-semibold text-lg">📈 SGPA Prediction</h2>
          <p>
            <strong>Predicted SGPA:</strong> {prediction.predicted_sgpa}
          </p>
          <p>
            <strong>Predicted Final CGPA:</strong>{" "}
            {prediction.predicted_final_cgpa}
          </p>
        </div>
      )}

      {/* Risk Analysis */}
      {risks && (
        <div className="border rounded-lg p-4 shadow">
          <h2 className="font-semibold text-lg">⚠️ Risk Analysis</h2>
          <ul className="list-disc list-inside">
            {Object.entries(risks.risk_analysis).map(([sub, prob]) => (
              <li key={sub}>
                {sub}: {Math.round(prob * 100)}% risk of failing
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
