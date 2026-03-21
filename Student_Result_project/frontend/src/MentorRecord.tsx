import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "./config";

interface MentorRecordsProps {
    mentor_id: string;
    batchYear: string;
}

interface MentorPdfEntry {
    usn: string;
    name: string;
    file_url?: string;
}

interface MentorPdfDownloadResponse {
    file_url: string;
}

export default function MentorRecords({ mentor_id, batchYear }: MentorRecordsProps) {
    const [pdfs, setPdfs] = useState<MentorPdfEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPdf, setSelectedPdf] = useState<MentorPdfEntry | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchPdfs = async () => {
            try {
                const res = await axios.get<MentorPdfEntry[]>(
                    `${API_BASE}/mentee/mentor/${mentor_id}/pdfs?batch_year=${batchYear}`
                );
                setPdfs(res.data);
            } catch {
                setError("Failed to fetch PDFs.");
            } finally {
                setLoading(false);
            }
        };
        if (mentor_id && batchYear) void fetchPdfs();
    }, [mentor_id, batchYear]);

    // Fetch signed file URL before viewing/downloading
    const fetchPdfUrl = async (usn: string): Promise<string | null> => {
        try {
            const res = await axios.get<MentorPdfDownloadResponse>(
                `${API_BASE}/mentee/mentor/${mentor_id}/download/${usn}?batch_year=${batchYear}`
            );
            setPdfUrl(res.data.file_url);
            return res.data.file_url;
        } catch {
            setError("Failed to load the PDF.");
            return null;
        }
    };

    if (loading) return <p className="text-center mt-4">Loading PDFs...</p>;
    if (error) return <p className="text-center mt-4 text-red-600">{error}</p>;
    if (!pdfs.length) return <p className="text-center mt-4">No PDFs found.</p>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Mentee Records</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-gray-700">USN</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-gray-700">Name</th>
                            <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs border-b border-gray-200 dark:border-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {pdfs.map((pdf) => (
                            <tr key={pdf.usn} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{pdf.usn}</td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{pdf.name}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedPdf(pdf);
                                            void fetchPdfUrl(pdf.usn);
                                        }}
                                        className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const url = await fetchPdfUrl(pdf.usn);
                                            if (url) {
                                                window.open(url, "_blank");
                                            }
                                        }}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                                    >
                                        Download
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Modal for viewing PDF */}
            {selectedPdf && pdfUrl && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-5xl h-[85vh] p-6 relative rounded-2xl shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                {selectedPdf.name} ({selectedPdf.usn})
                            </h3>
                            <button
                                onClick={() => {
                                    setSelectedPdf(null);
                                    setPdfUrl(null);
                                }}
                                className="p-2 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 dark:bg-gray-700 dark:hover:bg-red-500/20 dark:text-gray-300 dark:hover:text-red-400 rounded-lg transition-colors font-medium text-sm"
                            >
                                Close Viewer
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <iframe
                                src={pdfUrl}
                                width="100%"
                                height="100%"
                                className="w-full h-full"
                            ></iframe>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
