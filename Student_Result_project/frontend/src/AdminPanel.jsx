import { useState, useEffect } from "react";
import API_BASE from "./config";
import { useNavigate } from "react-router-dom";

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

    // Redirect if no secret
    useEffect(() => {
        if (!secret) {
            navigate("/admin");
        }
    }, [navigate, secret]);

    // Fetch available batches from backend
    const fetchBatches = () => {
        if (!secret) return;
        fetch(`${API_BASE}/admin/list-batches`, {
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
            const res = await fetch(
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
            const res = await fetch(
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
                `✅ Uploaded emails. Inserted ${data.emails_inserted} records.`
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
            const res = await fetch(
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

            // auto-download teacher CSV
            if (data.csv_download_url) {
                const csvRes = await fetch(
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
            const res = await fetch(`${API_BASE}/admin/create-batch`, {
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
            const res = await fetch(`${API_BASE}/admin/refresh-batch`, {
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
            const res = await fetch(`${API_BASE}/webscrape/fetch-results`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usn_prefix: usnPrefix,
                    usn_start: parseInt(usnStart, 10),
                    usn_end: parseInt(usnEnd, 10),
                    sem: parseInt(sem, 10),
                    download_dir: downloadDir || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unknown error");
            setStatus(`✅ Fetch started: ${data.message}`);
        } catch (err) {
            setStatus("❌ Error: " + err.message);
        }
    };

    return (
        <div className="min-h-screen p-6 flex flex-col items-center">
            <div className="shadow-lg rounded-2xl p-6 w-full max-w-xl">
                <h1 className="text-2xl font-bold mb-4">Admin Control Panel</h1>

                {!savedSecret && (
                    <>
                        <label className="block mb-2 font-medium">
                            Admin Secret
                        </label>
                        <input
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            placeholder="Enter admin secret"
                            className="w-full border rounded p-2 mb-4"
                        />
                        <button
                            onClick={handleSecretSubmit}
                            className="w-full bg-yellow-600 text-white py-2 rounded-xl mb-6 hover:bg-yellow-700"
                        >
                            Save Secret
                        </button>
                    </>
                )}

                <label className="block mb-2 font-medium">Select Batch</label>
                <select
                    value={batchYear || ""}
                    onChange={(e) => setBatchYear(parseInt(e.target.value, 10))}
                    className="w-full border rounded p-2 mb-4"
                >
                    {availableBatches.map((b) => (
                        <option key={b} value={b}>
                            {b}
                        </option>
                    ))}
                </select>

                <label className="block mb-2 font-medium">
                    Create New Batch
                </label>
                <div className="flex gap-2 mb-4">
                    <input
                        type="number"
                        value={newBatchYear}
                        onChange={(e) => setNewBatchYear(e.target.value)}
                        placeholder="Enter new batch year"
                        className="flex-1 border rounded p-2"
                    />
                    <button
                        onClick={createBatch}
                        className="bg-orange-600 text-white py-2 px-4 rounded-xl hover:bg-orange-700"
                    >
                        Create Batch
                    </button>
                </div>

                <label className="block mb-2 font-medium">Refresh Batch</label>
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={refreshBatch}
                        className="bg-orange-600 text-white py-2 px-4 rounded-xl hover:bg-orange-700"
                    >
                        Refresh Selected Batch
                    </button>
                </div>

                <label className="block mb-2 font-medium">
                    Account Generation Mode
                </label>
                <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value)}
                    className="w-full border rounded p-2 mb-4"
                >
                    <option value="missing">Only Missing Accounts</option>
                    <option value="all">Recreate All Accounts</option>
                </select>

                <button
                    onClick={generateAccounts}
                    className="w-full bg-blue-600 text-white py-2 rounded-xl mb-6 hover:bg-blue-700"
                >
                    Generate Accounts & Download CSV
                </button>

                <label className="block mb-2 font-medium">
                    Upload Email File (.xlsx or .csv)
                </label>
                <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(e) => setEmailFile(e.target.files[0])}
                    className="w-full mb-4"
                />
                <button
                    onClick={uploadEmails}
                    className="w-full bg-green-600 text-white py-2 rounded-xl mb-6 hover:bg-green-700"
                >
                    Upload Emails
                </button>

                <label className="block mb-2 font-medium">
                    Upload Mentor File (.xlsx)
                </label>
                <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setMentorFile(e.target.files[0])}
                    className="w-full mb-4"
                />
                <button
                    onClick={uploadMentors}
                    className="w-full bg-purple-600 text-white py-2 rounded-xl hover:bg-purple-700"
                >
                    Upload Mentors
                </button>

                {/* New Section: Fetch VTU Results */}
                <h2 className="text-xl font-semibold mb-2 mt-6">
                    Fetch VTU Results
                </h2>
                <div className="flex flex-col gap-2 mb-4">
                    <input
                        type="text"
                        value={usnPrefix}
                        onChange={(e) => setUsnPrefix(e.target.value)}
                        placeholder="USN Prefix (e.g., 1JS23CS)"
                        className="w-full border rounded p-2"
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={usnStart}
                            onChange={(e) => setUsnStart(e.target.value)}
                            placeholder="Start USN"
                            className="flex-1 border rounded p-2"
                        />
                        <input
                            type="number"
                            value={usnEnd}
                            onChange={(e) => setUsnEnd(e.target.value)}
                            placeholder="End USN"
                            className="flex-1 border rounded p-2"
                        />
                    </div>
                    <select
                        value={sem}
                        onChange={(e) => setSem(e.target.value)}
                        className="w-full border rounded p-2"
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
                        className="w-full border rounded p-2"
                    />
                    <button
                        onClick={fetchResults}
                        className="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700"
                    >
                        Fetch Results
                    </button>
                </div>

                {status && (
                    <p className="mt-4 text-sm text-gray-700">{status}</p>
                )}
            </div>
        </div>
    );
}
