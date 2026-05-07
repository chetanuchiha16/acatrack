import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
} from "./client/sdk.gen";

/** Safely extracts a human-readable message from an unknown catch value */
function getErrMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "Unknown error";
}

export default function AdminPanel() {
    const navigate = useNavigate();
    const [secret, setSecret] = useState<string>("");
    const [mode, setMode] = useState<string>("missing");
    const [status, setStatus] = useState<string>("");

    const [batchYear, setBatchYear] = useState<number | null>(null);
    const [availableBatches, setAvailableBatches] = useState<number[]>([]);

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
                const data = res.data as any;
                if (data.batches && data.batches.length > 0) {
                    setAvailableBatches(data.batches);
                    setBatchYear(data.batches[0]);
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
                query: { mode: mode as any, batch_year: batchYear },
                headers: { "X-Admin-Secret": secret }
            });
            if (res.error) throw new Error((res.error as any).detail || "Generation failed");
            
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
                body: { file: emailFile as any }
            });
            const data = res.data as any;
            if (res.error) throw new Error((res.error as any).error || "Unknown error");
            setStatus(
                `✅ Uploaded emails. Inserted ${data.emails_inserted} records and Updated ${data.emails_updated} records.`
            );
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
                body: { file: mentorFile as any }
            });
            const data = res.data as any;
            if (res.error) throw new Error((res.error as any).error || "Unknown error");

            setStatus(
                `✅ Uploaded mentors. Inserted ${data.mentors_inserted} mentors and ${data.mappings_inserted} mappings.`
            );

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
            if (res.error) throw new Error((res.error as any).error || "Unknown error");
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
            if (res.error) throw new Error((res.error as any).error || "Unknown error");
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
            const data = res.data as any;
            if (res.error) throw new Error((res.error as any).error || "Unknown error");
            setStatus(`✅ Fetch started: ${data.message}`);
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
                body: { file: pdfZipFile as any }
            });

            const data = res.data as any;
            if (res.error) throw new Error((res.error as any).error || "Unknown error");
            void pollJobStatus(data.job_id);

            setStatus(
                `✅ Processed PDFs. Job ID: ${data.job_id}`
            );
        } catch (err: unknown) {
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const pollJobStatus = async (jobId: string | number) => {
        try {
            const res = await getStatusPdftoexcelStatusJobIdGet({
                path: { job_id: jobId as string }
            });
            const data = res.data as any;
            if (res.error) throw new Error((res.error as any).error || "Unknown error");

            if (data.status === "done") {
                setStatus(`✅ Done! Excel at ${data.excel_url}`);
            } else {
                setStatus(`Processing... ${data.progress} PDFs done`);
                setTimeout(() => { void pollJobStatus(jobId); }, 1000); // poll every second
            }
        } catch (err: unknown) {
            console.error(err);
            setStatus("❌ Error fetching job status: " + getErrMsg(err));
        }
    };

    return (
        <div className="min-h-screen p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-gray-100 dark:bg-gray-900 transition-colors">
            {/* ====== Column 1 (Results) ====== */}
            <div className="flex flex-col gap-6 lg:col-span-1">
                {/* Results Workflow */}
                <div className="shadow-lg rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 h-full">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                        📊 Results Processing
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Fetch results directly from VTU or process downloaded
                        PDFs into Excel.
                    </p>

                    {/* Fetch VTU */}
                    <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-200">
                        Fetch VTU Results
                    </h3>
                    <input
                        type="text"
                        value={usnPrefix}
                        onChange={(e) => setUsnPrefix(e.target.value)}
                        placeholder="USN Prefix (e.g., 1JS23CS)"
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2 mb-2">
                        <input
                            type="number"
                            value={usnStart}
                            onChange={(e) => setUsnStart(e.target.value)}
                            placeholder="Start"
                            className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                            type="number"
                            value={usnEnd}
                            onChange={(e) => setUsnEnd(e.target.value)}
                            placeholder="End"
                            className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={sem}
                        onChange={(e) => setSem(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Select Semester</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    <input
                        type="text"
                        value={downloadDir}
                        onChange={(e) => setDownloadDir(e.target.value)}
                        placeholder="Optional Download Directory"
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={fetchResults}
                        className="bg-indigo-600 text-white w-full py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                        Fetch
                    </button>

                    {/* PDF to Excel */}
                    <h3 className="font-medium mb-2 text-gray-700 dark:text-gray-200 mt-6">
                        PDF Zip → Excel
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Upload a ZIP file containing VTU PDF results. The system
                        will extract and generate a consolidated Excel file.
                    </p>
                    <input
                        type="text"
                        value={pdfExcelFilename}
                        onChange={(e) => setPdfExcelFilename(e.target.value)}
                        placeholder="Excel filename (e.g., results.xlsx)"
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 mb-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                        type="file"
                        accept=".zip,.rar"
                        onChange={(e) => setPdfZipFile(e.target.files?.[0] ?? null)}
                        className="w-full text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white hover:file:bg-teal-700 mb-2 cursor-pointer transition-colors"
                    />
                    <button
                        onClick={uploadPdfZip}
                        className="bg-teal-600 text-white w-full py-2 rounded-lg hover:bg-teal-700 transition"
                    >
                        Upload
                    </button>
                </div>

                {/* Status */}
                {status && (
                    <div className="shadow-lg rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{status}</p>
                    </div>
                )}
            </div>

            {/* ====== Column 2 (Batch + Students) ====== */}
            <div className="flex flex-col gap-6 lg:col-span-2 h-full">
                {/* Admin Secret */}
                <div className="shadow-lg rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
                    {!secret ? (
                        <>
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
                                🔑 Admin Access
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Enter the admin secret to unlock batch and
                                student management.
                            </p>
                            <input
                                type="password"
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                placeholder="Enter admin secret"
                                className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 mb-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                            <button
                                onClick={handleSecretSubmit}
                                className="bg-yellow-600 text-white w-full py-2 rounded-lg hover:bg-yellow-700 transition"
                            >
                                Save Secret
                            </button>
                        </>
                    ) : (
                        <p className="text-sm text-green-400">
                            ✅ Secret already saved
                        </p>
                    )}
                </div>

                {/* Batch + Student Workflow */}
                <div className="shadow-lg rounded-2xl p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 flex flex-col h-full">
                    <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">
                        🎓 Batch & Student Management
                    </h2>

                    {/* Batch Controls */}
                    <div className="mb-6">
                        <label className="block mb-1 font-medium text-gray-700 dark:text-gray-300">
                            Active Batch
                        </label>
                        <select
                            value={batchYear ?? ""}
                            onChange={(e) =>
                                setBatchYear(e.target.value ? parseInt(e.target.value, 10) : null)
                            }
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            {availableBatches.map((b) => (
                                <option key={b} value={b}>
                                    {b}
                                </option>
                            ))}
                        </select>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="number"
                                value={newBatchYear}
                                onChange={(e) =>
                                    setNewBatchYear(e.target.value)
                                }
                                placeholder="New batch year"
                                className="flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                            <button
                                onClick={createBatch}
                                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
                            >
                                Create
                            </button>
                        </div>
                        <button
                            onClick={refreshBatch}
                            className="bg-orange-600 text-white w-full py-2 rounded-lg hover:bg-orange-700 transition"
                        >
                            Refresh
                        </button>
                    </div>

                    {/* Student Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                        {/* ===== Accounts Card ===== */}
                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 flex flex-col justify-between min-h-[300px]">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        👩‍🎓 Accounts
                                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                            New
                                        </span>
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Generate student account CSV for the active
                                    batch.
                                </p>
                                <div>
                                    <label className="text-gray-700 dark:text-gray-300 text-sm mb-1 block">
                                        Mode
                                    </label>
                                    <select
                                        value={mode}
                                        onChange={(e) =>
                                            setMode(e.target.value)
                                        }
                                        className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0f1720] border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="missing">
                                            Only Missing
                                        </option>
                                        <option value="all">
                                            Recreate All
                                        </option>
                                    </select>
                                </div>
                                <div className="bg-gray-200 dark:bg-gray-700 h-px my-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <span>ℹ️</span> Tip: Use “Only Missing” for
                                    incremental updates.
                                </p>
                            </div>

                            <button
                                onClick={generateAccounts}
                                className="bg-blue-600 text-white w-full py-2 rounded-lg hover:bg-blue-700 transition"
                            >
                                Generate CSV
                            </button>
                        </div>

                        {/* ===== Emails Card ===== */}
                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 flex flex-col justify-between min-h-[300px]">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        📧 Emails
                                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                            Upload
                                        </span>
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Upload a CSV or Excel file with the
                                    following student details:
                                </p>

                                <input
                                    type="file"
                                    accept=".xlsx,.csv"
                                    onChange={(e) =>
                                        setEmailFile(e.target.files?.[0] ?? null)
                                    }
                                    className="w-full text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer transition-colors"
                                />

                                <div className="bg-gray-200 dark:bg-gray-700 h-px my-2" />

                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <span>ℹ️ Required CSV Headers:</span>
                                    <table className="mt-1 border border-gray-300 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-300 dark:border-gray-600">
                                                <th className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-tl">
                                                    Column Name
                                                </th>
                                                <th className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-tr">
                                                    Description
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <td className="px-2 py-1">
                                                    student_usn
                                                </td>
                                                <td className="px-2 py-1">
                                                    Unique Student Number
                                                </td>
                                            </tr>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <td className="px-2 py-1">
                                                    student_name
                                                </td>
                                                <td className="px-2 py-1">
                                                    Full Name of Student
                                                </td>
                                            </tr>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <td className="px-2 py-1">
                                                    Parent_Email
                                                </td>
                                                <td className="px-2 py-1">
                                                    Parent's Email
                                                </td>
                                            </tr>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <td className="px-2 py-1">
                                                    Student_Email
                                                </td>
                                                <td className="px-2 py-1">
                                                    Student's Email
                                                </td>
                                            </tr>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <td className="px-2 py-1">
                                                    Student_PHNO
                                                </td>
                                                <td className="px-2 py-1">
                                                    Student's Phone Number
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="px-2 py-1">
                                                    Parent_PHNO
                                                </td>
                                                <td className="px-2 py-1">
                                                    Parent's Phone Number
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <button
                                onClick={uploadEmails}
                                className="bg-green-600 text-white w-full py-2 rounded-lg hover:bg-green-700 transition"
                            >
                                Upload
                            </button>
                        </div>

                        {/* ===== Mentors Card ===== */}
                        <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700 flex flex-col justify-between min-h-[300px]">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                        👨‍🏫 Mentors
                                        <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                                            Assign
                                        </span>
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Upload an Excel file mapping students to
                                    their assigned mentors:
                                </p>

                                <input
                                    type="file"
                                    accept=".xlsx"
                                    onChange={(e) =>
                                        setMentorFile(e.target.files?.[0] ?? null)
                                    }
                                    className="w-full text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer transition-colors"
                                />

                                <div className="bg-gray-200 dark:bg-gray-700 h-px my-2" />

                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    <span>ℹ️ Required CSV Headers:</span>
                                    <table className="mt-1 border border-gray-300 dark:border-gray-600 text-left text-gray-700 dark:text-gray-300 w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-300 dark:border-gray-600">
                                                <th className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-tl">
                                                    Column Name
                                                </th>
                                                <th className="px-2 py-1 bg-gray-100 dark:bg-slate-800 rounded-tr">
                                                    Description
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-gray-200 dark:border-gray-700">
                                                <td className="px-2 py-1">
                                                    Mentor_Name
                                                </td>
                                                <td className="px-2 py-1">
                                                    Full Name of Mentor
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="px-2 py-1">
                                                    student_usn
                                                </td>
                                                <td className="px-2 py-1">
                                                    Unique Student Number
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <button
                                onClick={uploadMentors}
                                className="bg-purple-600 text-white w-full py-2 rounded-lg hover:bg-purple-700 transition"
                            >
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
