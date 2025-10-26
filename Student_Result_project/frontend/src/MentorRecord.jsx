import { BarChart3, Users, CalendarDays, FileText } from "lucide-react";
import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "./config";

export default function MentorRecords({ mentor_id }) {
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPdf, setSelectedPdf] = useState(null);

    useEffect(() => {
        const fetchPdfs = async () => {
            try {
                const res = await axios.get(`${API_BASE}/mentee/mentor/${mentor_id}/pdfs`);
                setPdfs(res.data);
            } catch (err) {
                setError("Failed to fetch PDFs.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchPdfs();
    }, [mentor_id]);

    if (loading) return <p className="text-center mt-4 text-gray-700 dark:text-gray-300">Loading PDFs...</p>;
    if (error) return <p className="text-center mt-4 text-red-600 dark:text-red-400">{error}</p>;
    if (!pdfs.length) return <p className="text-center mt-4 text-gray-700 dark:text-gray-300">No PDFs found.</p>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-gray-100">Mentee Records</h2>

            <table className="w-full text-left border border-gray-300 dark:border-gray-600 rounded-lg">
                <thead>
                    <tr className="bg-gray-200 dark:bg-gray-700">
                        <th className="px-4 py-2 text-gray-800 dark:text-gray-100">USN</th>
                        <th className="px-4 py-2 text-gray-800 dark:text-gray-100">Name</th>
                        <th className="px-4 py-2 text-gray-800 dark:text-gray-100">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {pdfs.map((pdf) => (
                        <tr key={pdf.usn} className="border-t border-gray-300 dark:border-gray-600">
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{pdf.usn}</td>
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{pdf.name}</td>
                            <td className="px-4 py-2 flex gap-2">
                                {/* View button */}
                                <button
                                    onClick={() => setSelectedPdf(pdf)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                                >
                                    View
                                </button>
                                {/* Download button */}
                                <a
                                    href={`${API_BASE}/mentee/mentor/${mentor_id}/download/${pdf.usn}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                                >
                                    Download
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Modal for viewing PDF */}
            {selectedPdf && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white dark:bg-gray-800 w-4/5 h-4/5 p-4 relative rounded-lg shadow-lg">
                        <button
                            onClick={() => setSelectedPdf(null)}
                            className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 dark:bg-red-400 dark:hover:bg-red-500"
                        >
                            Close
                        </button>
                        <iframe
                            src={`${API_BASE}/mentee/mentor/${mentor_id}/download/${selectedPdf.usn}`}
                            width="100%"
                            height="100%"
                            className="rounded border border-gray-300 dark:border-gray-600"
                        ></iframe>
                    </div>
                </div>
            )}
        </div>
    );
}
