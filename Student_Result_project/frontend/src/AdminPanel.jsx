import { useState, useEffect } from "react";
import API_BASE from "./config";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "./fetchWithAuth";
export default function AdminPanel() {
    const navigate = useNavigate();
    const savedSecret = localStorage.getItem("admin_secret");

    const [secret, setSecret] = useState(savedSecret || "");
    const [mode, setMode] = useState("missing");
    const [status, setStatus] = useState("");

    const [batchYear, setBatchYear] = useState(null);
    const [availableBatches, setAvailableBatches] = useState([]);

    const [emailFile, setEmailFile] = useState(null);
    const [mentorFile, setMentorFile] = useState(null);
    const [newBatchYear, setNewBatchYear] = useState("");

    // Webscrape states
    const [usnPrefix, setUsnPrefix] = useState("");
    const [usnStart, setUsnStart] = useState("");
    const [usnEnd, setUsnEnd] = useState("");
    const [sem, setSem] = useState("");
    const [downloadDir, setDownloadDir] = useState("");
    const [pdfZipFile, setPdfZipFile] = useState(null);
    const [pdfExcelFilename, setPdfExcelFilename] = useState(
        "result_list_YEAR.xlsx"
    );
    // Redirect if no secret
    useEffect(() => {
        if (!secret) {
            navigate("/admin");
        }
    }, [navigate, secret]);

    // Fetch available batches from backend
    const fetchBatches = () => {
        if (!secret) return;
        fetchWithAuth(`${API_BASE}/admin/list-batches`, {
            headers: { "X-Admin-Secret": secret },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.batches && data.batches.length > 0) {
                    setAvailableBatches(data.batches);
                    setBatchYear(data.batches[0]);
                }
            })
            .catch((err) => {
                console.error("Failed to fetch batches:", err);
                setStatus("❌ Failed to load batch list");
            });
    };

    useEffect(() => {
        fetchBatches();
    }, [secret]);

    const handleSecretSubmit = () => {
        if (!secret) return alert("Enter admin secret");
        localStorage.setItem("admin_secret", secret);
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
            const res = await fetchWithAuth(
                `${API_BASE}/admin/generate-accounts?mode=${mode}&batch_year=${parseInt(
                    batchYear,
                    10
                )}`,
                { method: "POST", headers: { "X-Admin-Secret": secret } }
            );
            if (!res.ok) throw new Error(await res.text());
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "generated_passwords.csv";
            a.click();
            setStatus("✅ Accounts generated and CSV downloaded");
        } catch (err) {
            setStatus("❌ Error: " + err.message);
        }
    };

    const uploadEmails = async () => {
        if (!emailFile) return setStatus("Please select an email file first.");
        if (!secret) return alert("Admin secret missing");

        setStatus("Uploading emails...");
        const formData = new FormData();
        formData.append("file", emailFile);

        try {
            const res = await fetchWithAuth(
                `${API_BASE}/admin/upload-emails?batch_year=${parseInt(
                    batchYear,
                    10
                )}`,
                {
                    method: "POST",
                    headers: { "X-Admin-Secret": secret },
                    body: formData,
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unknown error");
            setStatus(
                `✅ Uploaded emails. Inserted ${data.emails_inserted} records and Updated ${data.emails_updated} records.`
            );
        } catch (err) {
            setStatus("❌ Error: " + err.message);
        }
    };

    const uploadMentors = async () => {
        if (!mentorFile) return setStatus("Please select a mentor file first.");
        if (!secret) return alert("Admin secret missing");

        setStatus("Uploading mentors...");
        const formData = new FormData();
        formData.append("file", mentorFile);

        try {
            const res = await fetchWithAuth(
                `${API_BASE}/admin/upload-mentors?batch_year=${parseInt(
                    batchYear,
                    10
                )}`,
                {
                    method: "POST",
                    headers: { "X-Admin-Secret": secret },
                    body: formData,
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unknown error");

            setStatus(
                `✅ Uploaded mentors. Inserted ${data.mentors_inserted} mentors and ${data.mappings_inserted} mappings.`
            );

            // 🔽 NEW: fetch and download CSV automatically
            if (data.csv_download_url) {
                const csvRes = await fetchWithAuth(
                    `${API_BASE}${data.csv_download_url}`,
                    {
                        headers: { "X-Admin-Secret": secret },
                    }
                );
                if (csvRes.ok) {
                    const blob = await csvRes.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `generated_teachers_batch_${batchYear}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                }
            }
        } catch (err) {
            setStatus("❌ Error: " + err.message);
        }
    };

    const createBatch = async () => {
        if (!newBatchYear)
            return setStatus("Enter a new batch year to create.");
        if (!secret) return alert("Admin secret missing");

        setStatus(`Creating batch ${newBatchYear}...`);
        try {
            const res = await fetchWithAuth(`${API_BASE}/admin/create-batch`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Secret": secret,
                },
                body: JSON.stringify({
                    batch_year: parseInt(newBatchYear, 10),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unknown error");
            setStatus(`✅ Batch ${newBatchYear} created successfully.`);
            setNewBatchYear("");
            fetchBatches();
        } catch (err) {
            setStatus("❌ Error: " + err.message);
        }
    };

    const refreshBatch = async () => {
        if (!batchYear) return setStatus("Select batch year to refresh.");
        if (!secret) return alert("Admin secret missing");

        setStatus(`Refreshing batch ${batchYear}...`);
        try {
            const res = await fetchWithAuth(`${API_BASE}/admin/refresh-batch`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Admin-Secret": secret,
                },
                body: JSON.stringify({ batch_year: parseInt(batchYear, 10) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unknown error");
            setStatus(`✅ Batch ${batchYear} refreshed successfully.`);
        } catch (err) {
            setStatus("❌ Error: " + err.message);
        }
    };

    // New: Fetch VTU results
    const fetchResults = async () => {
        if (!secret) return alert("Admin secret missing");
        if (!usnPrefix || !usnStart || !usnEnd || !sem)
            return setStatus("Please fill all required fields.");

        setStatus("Starting result fetch... (check console for CAPTCHA steps)");

        try {
            const res = await fetchWithAuth(
                `${API_BASE}/webscrape/fetch-results`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        usn_prefix: usnPrefix,
                        usn_start: parseInt(usnStart, 10),
                        usn_end: parseInt(usnEnd, 10),
                        sem: parseInt(sem, 10),
                        download_dir: downloadDir || undefined,
                    }),
                }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unknown error");
            setStatus(`✅ Fetch started: ${data.message}`);
        } catch (err) {
            setStatus("❌ Error: " + err.message);
        }
    };

    const uploadPdfZip = async () => {
        if (!pdfZipFile)
            return setStatus("Please select a zip file of PDFs first.");
        if (!secret) return alert("Admin secret missing");

        setStatus("Uploading PDF zip...");

        const formData = new FormData();
        formData.append("file", pdfZipFile);
        formData.append("excel_filename", pdfExcelFilename); // send filename to backend

        try {
            const res = await fetchWithAuth(`${API_BASE}/pdf/upload_archive`, {
                method: "POST",
                headers: { "X-Admin-Secret": secret },
                body: formData,
            });

            const data = await res.json();
            pollJobStatus(data.job_id);
            if (!res.ok) throw new Error(data.error || "Unknown error");

            setStatus(
                `✅ Processed ${data.processed_files.length} PDFs. Excel saved at: ${data.excel_path}`
            );
        } catch (err) {
            setStatus("❌ Error: " + err.message);
        }
    };

    const pollJobStatus = async (jobId) => {
        try {
            const res = await fetchWithAuth(
                `${API_BASE}/pdf/job_status/${jobId}`
            );
            const data = await res.json();
            console.log(data);
            if (data.status === "done") {
                setStatus(`✅ Done! Excel at ${data.excel_path}`);
            } else {
                setStatus(`Processing... ${data.progress} PDFs done`);
                setTimeout(() => pollJobStatus(jobId), 1000); // poll every second
            }
        } catch (err) {
            console.error(err);
            setStatus("❌ Error fetching job status: " + err.message);
        }
    };

    return (
        <div className="min-h-screen p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ====== Column 1 (Results) ====== */}
            <div className="flex flex-col gap-6 lg:col-span-1">
                {/* Results Workflow */}
                <div className="shadow-xl rounded-2xl p-6 bg-white/5 backdrop-blur-lg border border-white/10 h-full">
                    <h2 className="text-2xl font-semibold mb-4 text-white">
                        📊 Results Processing
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">
                        Fetch results directly from VTU or process downloaded
                        PDFs into Excel.
                    </p>

                    {/* Fetch VTU */}
                    <h3 className="font-medium mb-2 text-gray-200">
                        Fetch VTU Results
                    </h3>
                    <input
                        type="text"
                        value={usnPrefix}
                        onChange={(e) => setUsnPrefix(e.target.value)}
                        placeholder="USN Prefix (e.g., 1JS23CS)"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200 mb-2 focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-2 mb-2">
                        <input
                            type="number"
                            value={usnStart}
                            onChange={(e) => setUsnStart(e.target.value)}
                            placeholder="Start"
                            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200 focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                            type="number"
                            value={usnEnd}
                            onChange={(e) => setUsnEnd(e.target.value)}
                            placeholder="End"
                            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200 focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <select
                        value={sem}
                        onChange={(e) => setSem(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200 mb-2 focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200 mb-2 focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                        onClick={fetchResults}
                        className="bg-indigo-600 text-white w-full py-2 rounded-lg hover:bg-indigo-700"
                    >
                        Fetch
                    </button>

                    {/* PDF to Excel */}
                    <h3 className="font-medium mb-2 text-gray-200 mt-6">
                        PDF Zip → Excel
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">
                        Upload a ZIP file containing VTU PDF results. The system
                        will extract and generate a consolidated Excel file.
                    </p>
                    <input
                        type="text"
                        value={pdfExcelFilename}
                        onChange={(e) => setPdfExcelFilename(e.target.value)}
                        placeholder="Excel filename (e.g., results.xlsx)"
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200 mb-2 focus:ring-2 focus:ring-teal-500"
                    />
                    <input
                        type="file"
                        accept=".zip,.rar"
                        onChange={(e) => setPdfZipFile(e.target.files[0])}
                        className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white hover:file:bg-teal-700 mb-2"
                    />
                    <button
                        onClick={uploadPdfZip}
                        className="bg-teal-600 text-white w-full py-2 rounded-lg hover:bg-teal-700"
                    >
                        Upload
                    </button>
                </div>

                {/* Status */}
                {status && (
                    <div className="shadow-xl rounded-2xl p-6 bg-white/5 backdrop-blur-lg border border-white/10">
                        <p className="text-sm text-gray-300">{status}</p>
                    </div>
                )}
            </div>

            {/* ====== Column 2 (Batch + Students) ====== */}
            <div className="flex flex-col gap-6 lg:col-span-2 h-full">
                {/* Admin Secret */}
                <div className="shadow-xl rounded-2xl p-6 bg-white/5 backdrop-blur-lg border border-white/10">
                    {!savedSecret ? (
                        <>
                            <h2 className="text-xl font-semibold mb-4 text-white">
                                🔑 Admin Access
                            </h2>
                            <p className="text-sm text-gray-400 mb-3">
                                Enter the admin secret to unlock batch and
                                student management.
                            </p>
                            <input
                                type="password"
                                value={secret}
                                onChange={(e) => setSecret(e.target.value)}
                                placeholder="Enter admin secret"
                                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200 mb-3 focus:ring-2 focus:ring-yellow-500"
                            />
                            <button
                                onClick={handleSecretSubmit}
                                className="bg-yellow-600 text-white w-full py-2 rounded-lg hover:bg-yellow-700"
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
                <div className="shadow-xl rounded-2xl p-6 bg-white/5 backdrop-blur-lg border border-white/10 flex flex-col h-full">
                    <h2 className="text-2xl font-semibold mb-6 text-white">
                        🎓 Batch & Student Management
                    </h2>

                    {/* Batch Controls */}
                    <div className="mb-6">
                        <label className="block mb-1 font-medium text-gray-300">
                            Active Batch
                        </label>
                        <select
                            value={batchYear || ""}
                            onChange={(e) =>
                                setBatchYear(parseInt(e.target.value, 10))
                            }
                            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200 mb-4 focus:ring-2 focus:ring-orange-500"
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
                                className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200 focus:ring-2 focus:ring-orange-500"
                            />
                            <button
                                onClick={createBatch}
                                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                            >
                                Create
                            </button>
                        </div>
                        <button
                            onClick={refreshBatch}
                            className="bg-orange-600 text-white w-full py-2 rounded-lg hover:bg-orange-700"
                        >
                            Refresh
                        </button>
                    </div>

                    {/* Student Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
                        {/* ===== Accounts Card ===== */}
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between min-h-[300px]">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        👩‍🎓 Accounts
                                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                            New
                                        </span>
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Generate student account CSV for the active
                                    batch.
                                </p>
                                <div>
                                    <label className="text-gray-200 text-sm mb-1 block">
                                        Mode
                                    </label>
                                    <select
                                        value={mode}
                                        onChange={(e) =>
                                            setMode(e.target.value)
                                        }
                                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-600 text-gray-200"
                                    >
                                        <option value="missing">
                                            Only Missing
                                        </option>
                                        <option value="all">
                                            Recreate All
                                        </option>
                                    </select>
                                </div>
                                <div className="bg-zinc-700 h-px my-2" />
                                <p className="text-sm text-gray-400 flex items-center gap-2">
                                    <span>ℹ️</span> Tip: Use “Only Missing” for
                                    incremental updates.
                                </p>
                            </div>

                            <button
                                onClick={generateAccounts}
                                className="bg-blue-600 text-white w-full py-2 rounded-lg hover:bg-blue-700"
                            >
                                Generate CSV
                            </button>
                        </div>

                        {/* ===== Emails Card ===== */}
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between min-h-[300px]">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        📧 Emails
                                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                            Upload
                                        </span>
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Upload a CSV or Excel file with the
                                    following student details:
                                </p>

                                <input
                                    type="file"
                                    accept=".xlsx,.csv"
                                    onChange={(e) =>
                                        setEmailFile(e.target.files[0])
                                    }
                                    className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-700"
                                />

                                <div className="bg-zinc-700 h-px my-2" />

                                <div className="text-sm text-gray-400">
                                    <span>ℹ️ Required CSV Headers:</span>
                                    <table className="mt-1 border border-gray-500 text-left text-gray-300 w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-600">
                                                <th className="px-2 py-1">
                                                    Column Name
                                                </th>
                                                <th className="px-2 py-1">
                                                    Description
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-gray-700">
                                                <td className="px-2 py-1">
                                                    student_usn
                                                </td>
                                                <td className="px-2 py-1">
                                                    Unique Student Number
                                                </td>
                                            </tr>
                                            <tr className="border-b border-gray-700">
                                                <td className="px-2 py-1">
                                                    student_name
                                                </td>
                                                <td className="px-2 py-1">
                                                    Full Name of Student
                                                </td>
                                            </tr>
                                            <tr className="border-b border-gray-700">
                                                <td className="px-2 py-1">
                                                    Parent_Email
                                                </td>
                                                <td className="px-2 py-1">
                                                    Parent's Email
                                                </td>
                                            </tr>
                                            <tr className="border-b border-gray-700">
                                                <td className="px-2 py-1">
                                                    Student_Email
                                                </td>
                                                <td className="px-2 py-1">
                                                    Student's Email
                                                </td>
                                            </tr>
                                            <tr className="border-b border-gray-700">
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
                                className="bg-green-600 text-white w-full py-2 rounded-lg hover:bg-green-700"
                            >
                                Upload
                            </button>
                        </div>

                        {/* ===== Mentors Card ===== */}
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between min-h-[300px]">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        👨‍🏫 Mentors
                                        <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                                            Assign
                                        </span>
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-400">
                                    Upload an Excel file mapping students to
                                    their assigned mentors:
                                </p>

                                <input
                                    type="file"
                                    accept=".xlsx"
                                    onChange={(e) =>
                                        setMentorFile(e.target.files[0])
                                    }
                                    className="w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                                />

                                <div className="bg-zinc-700 h-px my-2" />

                                <div className="text-sm text-gray-400">
                                    <span>ℹ️ Required CSV Headers:</span>
                                    <table className="mt-1 border border-gray-500 text-left text-gray-300 w-full text-xs">
                                        <thead>
                                            <tr className="border-b border-gray-600">
                                                <th className="px-2 py-1">
                                                    Column Name
                                                </th>
                                                <th className="px-2 py-1">
                                                    Description
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b border-gray-700">
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
                                className="bg-purple-600 text-white w-full py-2 rounded-lg hover:bg-purple-700"
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
