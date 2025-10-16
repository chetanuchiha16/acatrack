import { useEffect, useState } from "react";
import API_BASE from "./config";
import { fetchWithAuth } from "./fetchWithAuth";
export default function MentorResults({ mentor_id }) {
    const [semester, setSemester] = useState("SEM1");
    const [mentees, setMentees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMentee, setSelectedMentee] = useState(null);
    const [chartData, setChartData] = useState("");
    const [expandedMentees, setExpandedMentees] = useState({});
    const [searchTerm, setSearchTerm] = useState(""); // <-- for live search

    useEffect(() => {
        if (mentor_id) fetchMentees();
    }, [mentor_id, semester]);

    const fetchMentees = async () => {
        setLoading(true);
        try {
            const res = await fetchWithAuth(
                `${API_BASE}/auth/Staff/Mentor/result?mentor_id=${mentor_id}&semester=${semester}`,
                {}
            );
            const data = await res.json();
            setMentees(data);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch mentees.");
        } finally {
            setLoading(false);
        }
    };

    const fetchChart = async (usn) => {
        try {
            const res = await fetchWithAuth(
                `${API_BASE}/auth/Staff/Mentor/chart?usn=${usn}&semester=${semester}`,
                {}
            );
            const data = await res.json();
            // console.log("Chart response:", data);  // <--- check this
            setChartData(data.image);
            setSelectedMentee(usn);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch chart.");
        }
    };

    const toggleExpand = (usn) => {
        setExpandedMentees((prev) => ({
            ...prev,
            [usn]: !prev[usn],
        }));
    };

    // Filter mentees based on searchTerm
    const filteredMentees = mentees.filter(
        (mentee) =>
            mentee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            mentee.usn.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold ">Mentee Results</h1>

            {/* Semester Selector */}
            <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-2 md:space-y-0">
                <div>
                    <label className="mr-2 font-semibold">Semester:</label>
                    <select
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="border rounded px-2 py-1"
                    >
                        {[
                            "SEM1",
                            "SEM2",
                            "SEM3",
                            "SEM4",
                            "SEM5",
                            "SEM6",
                            "SEM7",
                            "SEM8",
                        ].map((sem) => (
                            <option key={sem} value={sem}>
                                {sem}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Live Search Bar */}
                <div>
                    <input
                        type="text"
                        placeholder="Search by name or USN..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border rounded px-2 py-1 w-full md:w-64"
                    />
                </div>
            </div>

            {loading ? (
                <p>Loading mentees...</p>
            ) : (
                <div className="space-y-4">
                    {filteredMentees.length === 0 && <p>No mentees found.</p>}
                    {filteredMentees.map((mentee) => (
                        <div
                            key={mentee.usn}
                            className="border rounded p-4 shadow hover:shadow-lg transition"
                        >
                            {/* Mentee Header */}
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                                <div className="space-y-1">
                                    <p className="font-semibold">
                                        {mentee.name}
                                    </p>
                                    <p>USN: {mentee.usn}</p>
                                    <p>
                                        Total Marks: {mentee.total_marks} |
                                        SGPA: {mentee.sgpa} | CGPA:{" "}
                                        {mentee.cgpa}
                                    </p>
                                </div>

                                {/* <div className="flex space-x-2 mt-3 md:mt-0">
                  <a
                    href={mentee.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 !text-white px-3 py-1 rounded hover:bg-blue-700 transition"
                  >
                    Download PDF
                  </a>
                  <button
                    onClick={() => fetchChart(mentee.usn)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                  >
                    View Chart
                  </button>
                  <button
                    onClick={() => toggleExpand(mentee.usn)}
                    className=" text-gray-800 px-3 py-1 rounded hover:bg-gray-300 transition"
                  >
                    {expandedMentees[mentee.usn] ? "Hide Subjects" : "View Subjects"}
                  </button>
                </div> */}

                                <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 mt-3 md:mt-0">
                                    <a
                                        href={mentee.pdf_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition text-center w-full md:w-auto"
                                    >
                                        Download PDF
                                    </a>
                                    <button
                                        onClick={() => fetchChart(mentee.usn)}
                                        className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition text-center w-full md:w-auto"
                                    >
                                        View Chart
                                    </button>
                                    <button
                                        onClick={() => toggleExpand(mentee.usn)}
                                        className="text-gray-800 px-3 py-2 rounded hover:bg-gray-300 transition text-center w-full md:w-auto"
                                    >
                                        {expandedMentees[mentee.usn]
                                            ? "Hide Subjects"
                                            : "View Subjects"}
                                    </button>
                                </div>
                            </div>

                            {/* Subjects Table */}
                            {expandedMentees[mentee.usn] && (
                                <div className="mt-4 overflow-x-auto">
                                    <table className="w-full border-collapse border border-gray-300">
                                        <thead>
                                            <tr>
                                                <th className="border px-2 py-1">
                                                    Code
                                                </th>
                                                <th className="border px-2 py-1">
                                                    Subject
                                                </th>
                                                <th className="border px-2 py-1">
                                                    IA
                                                </th>
                                                <th className="border px-2 py-1">
                                                    SEE
                                                </th>
                                                <th className="border px-2 py-1">
                                                    Total
                                                </th>
                                                <th className="border px-2 py-1">
                                                    Credit
                                                </th>
                                                <th className="border px-2 py-1">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mentee.subjects.map((sub) => (
                                                <tr
                                                    key={sub.code}
                                                    className="text-center"
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
                                                        {sub.credit}
                                                    </td>
                                                    <td
                                                        className={`border px-2 py-1 ${
                                                            sub.status ===
                                                            "Pass"
                                                                ? "text-green-600"
                                                                : "text-red-600"
                                                        }`}
                                                    >
                                                        {sub.status}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Chart Modal */}
            {chartData && selectedMentee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-4 rounded shadow-lg max-w-lg w-full relative">
                        <button
                            onClick={() => setChartData("")}
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 font-bold"
                        >
                            ✕
                        </button>
                        <h2 className="text-lg font-semibold mb-2">
                            Chart for {selectedMentee}
                        </h2>
                        <img
                            src={chartData}
                            alt="Student Chart"
                            className="w-full h-auto"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
