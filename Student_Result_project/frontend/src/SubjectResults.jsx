import React, { useState } from "react";

export default function SubjectResults() {
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [data, setData] = useState(null);

  const semesterOptions = ["SEM1", "SEM2", "SEM3", "SEM4"];
  const subjectMapping = {
    SEM1: ["BMATS101", "BCHES102", "BCEDK103", "BENGK106", "BICOK107", "BIDTK158", "BESCK104A", "BETCK105H"],
    SEM2: ["BMAT201", "BPHYS202", "BPOPS203", "BPWSK206", "BKSKK207", "BSFHK258", "BPLCK205B", "BESCK204C"],
    SEM3: ["BCS301", "BCS302", "BCS303", "BCS304", "BCSL305", "BSCK307", "BNSK359", "BCS306A", "BCS358D"],
    SEM4: ["BCS401", "BCS402", "BCS403", "BCSL404", "BBOC407", "BUHK408", "BPEK459_PhysicalEducation_OR_BNSK459_NSS_", "BCS405B"],
  };

  const fetchData = async () => {
    if (!semester || !subject) return;
    const res = await fetch(`http://localhost:5000/auth/Staff/sub_res?semester=${semester}&subject=${subject}`);
    const json = await res.json();
    setData(json);
  };

   const downloadPDF = () => {
        if (!semester) return;
        const url = `http://localhost:5000/auth/Staff/sub_res/report?semester=${semester}&subject=${subject}`;
        const a = document.createElement("a");
        a.href = url;
        a.download = `${semester}_report.pdf`;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

  return (
    <div className="max-w-3xl mx-auto p-6 shadow rounded-lg bg-[var(--background)] text-[var(--foreground)] transition-colors">
      <h2 className="text-2xl font-bold mb-4">Subject Results</h2>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={semester}
          onChange={(e) => {
            setSemester(e.target.value);
            setSubject("");
          }}
          className="border rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] border-gray-400"
        >
          <option value="">Select Semester</option>
          {semesterOptions.map((sem) => (
            <option key={sem} value={sem}>
              {sem}
            </option>
          ))}
        </select>

        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] border-gray-400"
          disabled={!semester}
        >
          <option value="">Select Subject</option>
          {semester &&
            subjectMapping[semester]?.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
        </select>

        <button
          onClick={fetchData}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          disabled={!semester || !subject}
        >
          Fetch
        </button>

        <button
          onClick={downloadPDF}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
          disabled={!semester || !subject}
        >
          PDF
        </button>
      </div>

      {/* Stats Card */}
      {data && (
        <div className="p-6 rounded-xl shadow-sm bg-[var(--card)] text-[var(--card-foreground)] transition-colors">
          <h3 className="text-lg font-semibold mb-4">
            {data.subject_code} — {data.semester}
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Stat label="Total Students" value={data.total_students} />
            <Stat label="Present" value={data.present_students} />
            <Stat label="Absent" value={data.absent_students} />
            <Stat label="Pass %" value={`${data.pass_percentage}%`} highlight />
          </div>

          <div className="mt-6 grid grid-cols-3 sm:grid-cols-6 gap-4">
            <Stat label="Pass Count" value={data.pass_count} />
            <Stat label="FCD" value={data.fcd_count} />
            <Stat label="FC" value={data.fc_count} />
            <Stat label="SC" value={data.sc_count} />
            <Stat label="Fail" value={data.fail_count} danger />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight, danger }) {
  let classes = "flex flex-col items-center justify-center p-3 rounded-lg shadow-sm";
  if (highlight) classes += " bg-green-200 text-green-900";
  else if (danger) classes += " bg-red-200 text-red-900";
  else classes += " bg-[var(--background)] text-[var(--foreground)]";

  return (
    <div className={classes}>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
