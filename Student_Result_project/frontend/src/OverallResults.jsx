import React, { useState } from "react";

export default function OverallResults() {
  const [semester, setSemester] = useState("");
  const [view, setView] = useState("normal");
  const [data, setData] = useState(null);

  const fetchData = async () => {
    let url = `/auth/Staff/overall_res?semester=${semester}`;
    if (view === "toppers") url += "&show_toppers=true";
    if (view === "failed") url += "&show_failed=true";

    const res = await fetch(url);
    const json = await res.json();
    setData(json);
  };

  const downloadPDF = async () => {
    const res = await fetch(`http://localhost:5000/auth/Staff/report/${semester}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${semester}_report.pdf`;
    a.click();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Overall Performance</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Semester"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="border rounded p-2"
        />
        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          className="border rounded p-2"
        >
          <option value="normal">Full Results</option>
          <option value="toppers">Top 10</option>
          <option value="failed">Failed Students</option>
        </select>
        <button
          onClick={fetchData}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          Fetch
        </button>
        <button
          onClick={downloadPDF}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
        >
          PDF
        </button>
      </div>

      {data && (
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
