import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "./config";

export default function MentorRecords({ mentor_id }) {
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPdf, setSelectedPdf] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null); // For viewing

    useEffect(() => {
        const fetchPdfs = async () => {
            try {
                const res = await axios.get(
                    `${API_BASE}/mentee/mentor/${mentor_id}/pdfs`
                );
                setPdfs(res.data);
            } catch (err) {
                setError("Failed to fetch PDFs.");
            } finally {
                setLoading(false);
            }
        };
        fetchPdfs();
    }, [mentor_id]);

    // Fetch signed file URL before viewing/downloading
    const fetchPdfUrl = async (usn) => {
        try {
            const res = await axios.get(
                `${API_BASE}/mentee/mentor/${mentor_id}/download/${usn}`
            );
            setPdfUrl(res.data.file_url);
        } catch {
            setError("Failed to load the PDF.");
        }
    };

    if (loading) return <p className="text-center mt-4">Loading PDFs...</p>;
    if (error) return <p className="text-center mt-4 text-red-600">{error}</p>;
    if (!pdfs.length) return <p className="text-center mt-4">No PDFs found.</p>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold mb-2">Mentee Records</h2>
            <table className="w-full text-left border rounded-lg">
                <thead>
                    <tr>
                        <th className="px-4 py-2">USN</th>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {pdfs.map((pdf) => (
                        <tr key={pdf.usn}>
                            <td className="px-4 py-2">{pdf.usn}</td>
                            <td className="px-4 py-2">{pdf.name}</td>
                            <td className="px-4 py-2 flex gap-2">
                                {/* View button */}
                                <button
                                    onClick={() => {
                                        setSelectedPdf(pdf);
                                        fetchPdfUrl(pdf.usn);
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    View
                                </button>
                                {/* Download button */}
                                <button
                                    onClick={async () => {
                                        const res = await axios.get(
                                            `${API_BASE}/mentee/mentor/${mentor_id}/download/${pdf.usn}`
                                        );
                                        window.open(
                                            res.data.file_url,
                                            "_blank"
                                        );
                                    }}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Download
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* Modal for viewing PDF */}
            {selectedPdf && pdfUrl && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white w-4/5 h-4/5 p-4 relative rounded-lg shadow-lg">
                        <button
                            onClick={() => {
                                setSelectedPdf(null);
                                setPdfUrl(null);
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                        >
                            Close
                        </button>
                        <iframe
                            src={pdfUrl}
                            width="100%"
                            height="100%"
                            className="rounded border"
                        ></iframe>
                    </div>
                </div>
            )}
        </div>
    );
}
