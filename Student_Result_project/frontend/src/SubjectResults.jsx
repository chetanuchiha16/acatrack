import React, { useState } from "react";

export default function SubjectResults() {
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [data, setData] = useState(null);

  const fetchData = async () => {
    const res = await fetch(`/auth/Staff/sub_res?semester=${semester}&subject=${subject}`);
    const json = await res.json();
    setData(json);
  };

  const downloadPDF = async () => {
    const res = await fetch(`http://localhost:5000/auth/Staff/sub_res/report?semester=${semester}&subject=${subject}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${semester}_${subject}_report.pdf`;
    a.click();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Subject Results</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Semester"
          value={semester}
          onChange={(e) => setSemester(e.target.value)}
          className="border rounded p-2"
        />
        <input
          type="text"
          placeholder="Subject Code"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border rounded p-2"
        />
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
