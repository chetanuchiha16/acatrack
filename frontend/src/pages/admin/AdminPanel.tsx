import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../../utils/storage";
import { 
    listBatchesAdminListBatchesGet,
    generateAccountsAdminGenerateAccountsPost,
    uploadEmailsAdminUploadEmailsPost,
    uploadMentorsAdminUploadMentorsPost,
    createBatchAdminCreateBatchPost,
    refreshBatchAdminRefreshBatchPost,
    fetchResultsRouteWebscrapeFetchResultsPost,
    uploadArchivePdftoexcelUploadPost,
    getStatusPdftoexcelStatusJobIdGet
} from "../../client/sdk.gen";
import AcademicSetup from "./AcademicSetup";

/** Safely extracts a human-readable message from an unknown catch value */
function getErrMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "Unknown error";
}

export default function AdminPanel() {
    const navigate = useNavigate();
    const [secret, setSecret] = useState<string>(localStorage.getItem("admin_secret") || "");
    const [mode, setMode] = useState<string>("missing");
    const [status, setStatus] = useState<string>("");

    const [batchYear, setBatchYear] = useState<number | null>(null);
    const [availableBatches, setAvailableBatches] = useState<number[]>([]);
    const [activeView, setActiveView] = useState<"results" | "setup">("results");

    const [emailFile, setEmailFile] = useState<File | null>(null);
    const [mentorFile, setMentorFile] = useState<File | null>(null);
    const [newBatchYear, setNewBatchYear] = useState<string>("");

    // Webscrape states
    const [usnPrefix, setUsnPrefix] = useState<string>("");
    const [usnStart, setUsnStart] = useState<string>("");
    const [usnEnd, setUsnEnd] = useState<string>("");
    const [sem, setSem] = useState<string>("");
    const [downloadDir, setDownloadDir] = useState<string>("");
    const [pdfZipFile, setPdfZipFile] = useState<File | null>(null);
    const [pdfExcelFilename, setPdfExcelFilename] = useState<string>(
        "result_list_YEAR.xlsx"
    );
    // Redirect if no secret
    useEffect(() => {
        if (!secret) {
            void navigate("/admin");
        }
    }, [navigate, secret]);

    // Fetch available batches from backend
    const fetchBatches = useCallback(() => {
        if (!secret) return;
        listBatchesAdminListBatchesGet({
            headers: { "X-Admin-Secret": secret },
        })
            .then((res) => {
                const data = res.data as { batches?: number[] } | undefined;
                if (data?.batches) {
                    const batches = data.batches;
                    if (batches.length > 0) {
                        setAvailableBatches(batches);
                        setBatchYear(batches[0]);
                    }
                }
            })
            .catch((err) => {
                console.error("Failed to fetch batches:", err);
                setStatus("❌ Failed to load batch list");
            });
    }, [secret]);

    useEffect(() => {
        fetchBatches();
    }, [secret, fetchBatches]);

    const handleSecretSubmit = () => {
        if (!secret) return alert("Enter admin secret");
        setStatus(
            "✅ Secret saved. You can now generate accounts or upload files."
        );
        fetchBatches();
    };

    const generateAccounts = async () => {
        if (!secret) return alert("Admin secret missing");
        if (!batchYear) return alert("Select a batch first");
        setStatus("Generating accounts...");
        try {
            const res = await generateAccountsAdminGenerateAccountsPost({
                query: { mode: mode as "all" | "missing", batch_year: batchYear },
                headers: { "X-Admin-Secret": secret }
            });
            if (res.error) {
                const detail = (res.error as { detail?: string }).detail || "Generation failed";
                throw new Error(detail);
            }
            
            const blob = res.data as unknown as Blob;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "generated_passwords.csv";
            a.click();
            setStatus("✅ Accounts generated and CSV downloaded");
        } catch (err: unknown) {
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const uploadEmails = async () => {
        if (!emailFile) return setStatus("Please select an email file first.");
        if (!secret) return alert("Admin secret missing");

        setStatus("Uploading emails...");
        try {
            const res = await uploadEmailsAdminUploadEmailsPost({
                query: { batch_year: batchYear! },
                headers: { "X-Admin-Secret": secret },
                body: { file: emailFile }
            });
            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }
            if (res.data) {
                const data = res.data as { emails_inserted: number; emails_updated: number };
                setStatus(
                    `✅ Uploaded emails. Inserted ${data.emails_inserted} records and Updated ${data.emails_updated} records.`
                );
            }
        } catch (err: unknown) {
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const uploadMentors = async () => {
        if (!mentorFile) return setStatus("Please select a mentor file first.");
        if (!secret) return alert("Admin secret missing");

        setStatus("Uploading mentors...");
        try {
            const res = await uploadMentorsAdminUploadMentorsPost({
                query: { batch_year: batchYear! },
                headers: { "X-Admin-Secret": secret },
                body: { file: mentorFile }
            });
            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }

            if (res.data) {
                const data = res.data as { mentors_inserted: number; mappings_inserted: number };
                setStatus(
                    `✅ Uploaded mentors. Inserted ${data.mentors_inserted} mentors and ${data.mappings_inserted} mappings.`
                );
            }

            // SDK doesn't natively handle the automatic follow-up fetch for CSV as easily in one call,
            // but we can keep the logic similar if needed. However, the backend should ideally return the data.
            // For now, let's stick to the upload.
        } catch (err: unknown) {
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const createBatch = async () => {
        if (!newBatchYear)
            return setStatus("Enter a new batch year to create.");
        if (!secret) return alert("Admin secret missing");

        setStatus(`Creating batch ${newBatchYear}...`);
        try {
            const res = await createBatchAdminCreateBatchPost({
                headers: { "X-Admin-Secret": secret },
                body: { batch_year: parseInt(newBatchYear, 10) }
            });
            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }
            setStatus(`✅ Batch ${newBatchYear} created successfully.`);
            setNewBatchYear("");
            fetchBatches();
        } catch (err: unknown) {
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const refreshBatch = async () => {
        if (!batchYear) return setStatus("Select batch year to refresh.");
        if (!secret) return alert("Admin secret missing");

        setStatus(`Refreshing batch ${batchYear}...`);
        try {
            const res = await refreshBatchAdminRefreshBatchPost({
                headers: { "X-Admin-Secret": secret },
                body: { batch_year: batchYear }
            });
            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }
            setStatus(`✅ Batch ${batchYear} refreshed successfully.`);
        } catch (err: unknown) {
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    // New: Fetch VTU results
    const fetchResults = async () => {
        if (!secret) return alert("Admin secret missing");
        if (!usnPrefix || !usnStart || !usnEnd || !sem)
            return setStatus("Please fill all required fields.");

        setStatus("Starting result fetch... (check console for CAPTCHA steps)");

        try {
            const res = await fetchResultsRouteWebscrapeFetchResultsPost({
                body: {
                    usn_prefix: usnPrefix,
                    usn_start: parseInt(usnStart, 10),
                    usn_end: parseInt(usnEnd, 10),
                    sem: parseInt(sem, 10),
                    download_dir: downloadDir || undefined,
                }
            });
            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }
            if (res.data) {
                const data = res.data as { message: string };
                setStatus(`✅ Fetch started: ${data.message}`);
            }
        } catch (err: unknown) {
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const uploadPdfZip = async () => {
        if (!pdfZipFile)
            return setStatus("Please select a zip file of PDFs first.");
        if (!secret) return alert("Admin secret missing");

        setStatus("Uploading PDF zip...");

        try {
            const res = await uploadArchivePdftoexcelUploadPost({
                headers: { "X-Admin-Secret": secret },
                body: { file: pdfZipFile }
            });

            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }
            if (res.data) {
                const data = res.data as { job_id: string | number };
                void pollJobStatus(data.job_id);
                setStatus(`✅ Processed PDFs. Job ID: ${data.job_id}`);
            }
        } catch (err: unknown) {
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const pollJobStatus = async (jobId: string | number) => {
        try {
            const res = await getStatusPdftoexcelStatusJobIdGet({
                path: { job_id: String(jobId) }
            });
            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }

            if (res.data) {
                const data = res.data as { status: string; excel_url?: string; progress?: number };
                if (data.status === "done") {
                    setStatus(`✅ Done! Excel at ${data.excel_url}`);
                } else {
                    setStatus(`Processing... ${data.progress} PDFs done`);
                    setTimeout(() => { void pollJobStatus(jobId); }, 1000); // poll every second
                }
            }
        } catch (err: unknown) {
            console.error(err);
            setStatus("❌ Error fetching job status: " + getErrMsg(err));
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex transition-colors">
            {/* Sidebar */}
            <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-gray-700 flex flex-col p-4 gap-4">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 px-2">Admin Panel</h1>
                <button
                    onClick={() => setActiveView("results")}
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeView === "results"
                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                >
                    📊 Results Processing
                </button>
                <button
                    onClick={() => setActiveView("setup")}
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeView === "setup"
                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                >
                    ⚙️ System Setup
                </button>
                <div className="mt-auto border-t border-gray-200 dark:border-gray-700 pt-4">
                    <button
                        onClick={() => {
                            localStorage.removeItem("admin_secret");
                            navigate("/admin");
                        }}
                        className="w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-left"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                {activeView === "results" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* ====== Column 1 (Results) ====== */}
                        <div className="flex flex-col gap-6 lg:col-span-1">
                            {/* Results Workflow */}
                            <div className="shadow-lg rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                                    📊 Results Processing
                                </h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Fetch results from VTU or process PDFs.
                                </p>

                                {/* Fetch VTU */}
                                <input
                                    type="text"
                                    value={usnPrefix}
                                    onChange={(e) => setUsnPrefix(e.target.value)}
                                    placeholder="USN Prefix"
                                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 mb-2"
                                />
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="number"
                                        value={usnStart}
                                        onChange={(e) => setUsnStart(e.target.value)}
                                        placeholder="Start"
                                        className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                                    />
                                    <input
                                        type="number"
                                        value={usnEnd}
                                        onChange={(e) => setUsnEnd(e.target.value)}
                                        placeholder="End"
                                        className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                                    />
                                </div>
                                <select
                                    value={sem}
                                    onChange={(e) => setSem(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 mb-2"
                                >
                                    <option value="">Semester</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <button
                                    onClick={fetchResults}
                                    className="bg-indigo-600 text-white w-full py-2 rounded-lg hover:bg-indigo-700 transition"
                                >
                                    Fetch
                                </button>

                                <div className="bg-gray-200 dark:bg-gray-700 h-px my-4" />

                                {/* PDF to Excel */}
                                <input
                                    type="file"
                                    accept=".zip"
                                    onChange={(e) => setPdfZipFile(e.target.files?.[0] ?? null)}
                                    className="w-full text-sm mb-2"
                                />
                                <button
                                    onClick={uploadPdfZip}
                                    className="bg-teal-600 text-white w-full py-2 rounded-lg hover:bg-teal-700 transition"
                                >
                                    Upload PDF Zip
                                </button>
                            </div>

                            {status && (
                                <div className="shadow-lg rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
                                    <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{status}</p>
                                </div>
                            )}
                        </div>

                        {/* ====== Column 2 ====== */}
                        <div className="flex flex-col gap-6 lg:col-span-2">
                            <div className="shadow-lg rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
                                <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">🎓 Batch & Student Management</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Active Batch</label>
                                        <select
                                            value={batchYear ?? ""}
                                            onChange={(e) => setBatchYear(e.target.value ? parseInt(e.target.value, 10) : null)}
                                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                                        >
                                            {availableBatches.map(b => <option key={b} value={b}>{b}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Create New Batch</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={newBatchYear}
                                                onChange={(e) => setNewBatchYear(e.target.value)}
                                                className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600"
                                            />
                                            <button onClick={createBatch} className="bg-orange-600 text-white px-4 rounded-lg">Create</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700">
                                        <h3 className="font-semibold mb-2">📧 Emails Upload</h3>
                                        <input type="file" onChange={(e) => setEmailFile(e.target.files?.[0] ?? null)} className="text-xs mb-2" />
                                        <button onClick={uploadEmails} className="w-full py-1 bg-green-600 text-white rounded-lg text-sm">Upload</button>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700">
                                        <h3 className="font-semibold mb-2">👨‍🏫 Mentor Mapping</h3>
                                        <input type="file" onChange={(e) => setMentorFile(e.target.files?.[0] ?? null)} className="text-xs mb-2" />
                                        <button onClick={uploadMentors} className="w-full py-1 bg-purple-600 text-white rounded-lg text-sm">Upload</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 shadow-lg rounded-2xl p-6 border border-gray-200 dark:border-gray-700 h-full">
                        <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">🎓 Academic Foundation Setup</h2>
                        <AcademicSetup secret={secret} batchYear={batchYear} />
                    </div>
                )}
            </div>
        </div>
    );
}
