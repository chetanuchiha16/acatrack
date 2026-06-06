import { useEffect, useState } from "react";
import { 
    listMentorPdfsMenteeMentorMentorIdPdfsGet,
    downloadMenteePdfMenteeMentorMentorIdDownloadUsnGet
} from "../../client/sdk.gen";

interface MentorRecordsProps {
    mentor_id: string;
    batchYear: string;
}

interface MentorPdfEntry {
    usn: string;
    name: string;
    file_url?: string;
}

export default function MentorRecords({ mentor_id, batchYear }: MentorRecordsProps) {
    const [pdfEntries, setPdfEntries] = useState<MentorPdfEntry[]>([]);
    const [isFetching, setIsFetching] = useState<boolean>(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [activePdf, setActivePdf] = useState<MentorPdfEntry | null>(null);
    const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadRecords = async () => {
            try {
                const response = await listMentorPdfsMenteeMentorMentorIdPdfsGet({
                    path: { mentor_id: parseInt(mentor_id, 10) },
                    query: { batch_year: parseInt(batchYear, 10) }
                });
                if (response.data) {
                    setPdfEntries(response.data as MentorPdfEntry[]);
                }
            } catch {
                setFetchError("Unable to retrieve mentee PDF records.");
            } finally {
                setIsFetching(false);
            }
        };
        if (mentor_id && batchYear) {
            void loadRecords();
        }
    }, [mentor_id, batchYear]);

    const loadSignedUrl = async (usn: string): Promise<string | null> => {
        try {
            const response = await downloadMenteePdfMenteeMentorMentorIdDownloadUsnGet({
                path: { mentor_id: parseInt(mentor_id, 10), usn },
                query: { batch_year: parseInt(batchYear, 10) }
            });
            const urlResult = (response.data as { file_url?: string })?.file_url ?? null;
            setSignedPdfUrl(urlResult);
            return urlResult;
        } catch {
            setFetchError("Unable to generate a signed download link.");
            return null;
        }
    };

    if (isFetching) {
        return <p className="text-center mt-4">Retrieving PDF documents...</p>;
    }
    if (fetchError) {
        return <p className="text-center mt-4 text-red-600">{fetchError}</p>;
    }
    if (!pdfEntries.length) {
        return <p className="text-center mt-4">No PDF records found for this mentor.</p>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Mentee PDF Records</h2>
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
                        {pdfEntries.map((pdf) => (
                            <tr key={pdf.usn} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-gray-800 dark:text-gray-200">{pdf.usn}</td>
                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{pdf.name}</td>
                                <td className="px-6 py-4 flex gap-3">
                                    <button
                                        onClick={() => {
                                            setActivePdf(pdf);
                                            void loadSignedUrl(pdf.usn);
                                        }}
                                        className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        View
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const signedLink = await loadSignedUrl(pdf.usn);
                                            if (signedLink) {
                                                window.open(signedLink, "_blank");
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
            
            {activePdf && signedPdfUrl && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-5xl h-[85vh] p-6 relative rounded-2xl shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                {activePdf.name} ({activePdf.usn})
                            </h3>
                            <button
                                onClick={() => {
                                    setActivePdf(null);
                                    setSignedPdfUrl(null);
                                }}
                                className="p-2 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 dark:bg-gray-700 dark:hover:bg-red-500/20 dark:text-gray-300 dark:hover:text-red-400 rounded-lg transition-colors font-medium text-sm"
                            >
                                Close Viewer
                            </button>
                        </div>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <iframe
                                src={signedPdfUrl}
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
