import React, { useEffect, useState, useCallback } from "react";
import { 
    getMentorStudentsAuthStaffMentorResultGet, 
    getMenteeChartAuthStaffMentorChartGet 
} from "../../client/sdk.gen";
import type { StudentResultResponse as MenteeResult } from "../../client/types.gen";
import { parseApiError } from "../../utils/errorHandler";

interface MentorResultsProps {
    mentor_id?: string;
    batchYear: string;
}

const MentorResults: React.FC<MentorResultsProps> = ({ mentor_id, batchYear }) => {
    const [semester, setSemester] = useState<string>("sem1");
    const [mentees, setMentees] = useState<MenteeResult[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [selectedMentee, setSelectedMentee] = useState<string | null>(null);
    const [chartData, setChartData] = useState<string>("");
    const [expandedMentees, setExpandedMentees] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState<string>("");

    const fetchMentees = useCallback(async () => {
        if (!mentor_id) return;
        setLoading(true);
        try {
            const { data } = await getMentorStudentsAuthStaffMentorResultGet({
                query: {
                    mentor_id: Number(mentor_id),
                    semester,
                    batch_year: Number(batchYear)
                }
            });
            if (data) setMentees(data as unknown as MenteeResult[]);
        } catch (err) {
            console.error(err);
            alert(parseApiError(err) || "Failed to fetch mentees.");
        } finally {
            setLoading(false);
        }
    }, [mentor_id, semester, batchYear]);

    useEffect(() => {
        if (mentor_id && batchYear) void fetchMentees();
    }, [mentor_id, batchYear, fetchMentees]);

    const fetchChart = async (usn: string) => {
        try {
            const { data } = await getMenteeChartAuthStaffMentorChartGet({
                query: {
                    usn,
                    semester,
                    batch_year: Number(batchYear)
                }
            });
            const dataObj = data as { image?: string };
            const chartImage = dataObj?.image;
            if (chartImage) {
                setChartData(chartImage);
                setSelectedMentee(usn);
            }
        } catch (err) {
            console.error(err);
            alert(parseApiError(err) || "Failed to fetch chart.");
        }
    };

    const toggleExpand = (usn: string) => {
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
                            "sem1",
                            "sem2",
                            "sem3",
                            "sem4",
                            "sem5",
                            "sem6",
                            "sem7",
                            "sem8",
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

                                <div className="flex flex-col md:flex-row md:space-x-2 space-y-2 md:space-y-0 mt-3 md:mt-0">
                                    <a
                                        href={mentee.pdf_url || "#"}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition text-center w-full md:w-auto"
                                    >
                                        Download PDF
                                    </a>
                                    <button
                                        onClick={() => void fetchChart(mentee.usn)}
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
};

export default MentorResults;
