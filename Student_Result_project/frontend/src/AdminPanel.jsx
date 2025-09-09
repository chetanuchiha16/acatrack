import { useState, useEffect } from "react";
import API_BASE from "./config";
import { useNavigate } from "react-router-dom";
import { FaDownload, FaUpload, FaPlus, FaRedo } from "react-icons/fa";

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
  <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* VTU Results Fetch */}
    <div className="shadow-lg rounded-xl p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Fetch VTU Results</h2>
      <p className="text-gray-500">Enter USN range and semester. CAPTCHA may appear for each student.</p>
      <div className="grid grid-cols-1 gap-2">
        <input
          type="text"
          placeholder="USN Prefix"
          value={usnPrefix}
          onChange={(e) => setUsnPrefix(e.target.value)}
          className="border rounded p-2 w-full"
        />
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Start USN"
            value={usnStart}
            onChange={(e) => setUsnStart(e.target.value)}
            className="flex-1 border rounded p-2"
          />
          <input
            type="number"
            placeholder="End USN"
            value={usnEnd}
            onChange={(e) => setUsnEnd(e.target.value)}
            className="flex-1 border rounded p-2"
          />
        </div>
        <select
          value={sem}
          onChange={(e) => setSem(e.target.value)}
          className="border rounded p-2"
        >
          <option value="">Select Semester</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Optional Download Directory"
          value={downloadDir}
          onChange={(e) => setDownloadDir(e.target.value)}
          className="border rounded p-2 w-full"
        />
      </div>
      <button
        onClick={fetchResults}
        className="w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700"
      >
        Fetch Results
      </button>
    </div>

    {/* Admin Secret */}
    {!savedSecret && (
      <div className="shadow-lg rounded-xl p-6 space-y-4">
        <h2 className="text-2xl font-semibold">Enter Admin Secret</h2>
        <p className="text-gray-500">Required to access admin functions.</p>
        <div className="flex gap-2">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Admin Secret"
            className="flex-1 border rounded p-2"
          />
          <button
            onClick={handleSecretSubmit}
            className="bg-yellow-600 text-white px-4 rounded hover:bg-yellow-700"
          >
            Save
          </button>
        </div>
      </div>
    )}

    {/* Batch Management */}
    <div className="shadow-lg rounded-xl p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Batch Management</h2>
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="font-medium">Select Batch:</label>
          <select
            value={batchYear || ""}
            onChange={(e) => setBatchYear(parseInt(e.target.value))}
            className="border rounded p-2"
          >
            {availableBatches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <button
            onClick={refreshBatch}
            className="flex items-center gap-1 bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700"
          >
            <FaRedo /> Refresh
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="New Batch Year"
            value={newBatchYear}
            onChange={(e) => setNewBatchYear(e.target.value)}
            className="border rounded p-2"
          />
          <button
            onClick={createBatch}
            className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <FaPlus /> Create Batch
          </button>
        </div>
      </div>
    </div>

    {/* Mentor Upload */}
    <div className="shadow-lg rounded-xl p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Upload Mentors & Auto-Create Teachers</h2>
      <p className="text-gray-500">Upload mentor Excel → maps students → auto creates teacher accounts for each mentor. CSV of teachers will be auto downloaded.</p>
      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => setMentorFile(e.target.files[0])}
        className="border rounded p-2 w-full"
      />
      <button
        onClick={uploadMentors}
        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
      >
        <FaUpload /> Upload Mentors & Generate Teachers
      </button>
    </div>

    {/* Student/Parent Account Generation */}
    <div className="shadow-lg rounded-xl p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Generate Student & Parent Accounts</h2>
      <p className="text-gray-500">Generates accounts. CSV download for credentials.</p>
      <div className="flex items-center gap-2">
        <label>Mode:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="border rounded p-2"
        >
          <option value="missing">Only Missing Accounts</option>
          <option value="all">Recreate All Accounts</option>
        </select>
        <button
          onClick={generateAccounts}
          className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <FaDownload /> Generate & Download
        </button>
      </div>
    </div>

    {/* Emails Upload */}
    <div className="shadow-lg rounded-xl p-6 space-y-4">
      <h2 className="text-2xl font-semibold">Upload Student Emails</h2>
      <p className="text-gray-500">Upload email Excel/CSV. Batch must be selected first.</p>
      <input
        type="file"
        accept=".xlsx,.csv"
        onChange={(e) => setEmailFile(e.target.files[0])}
        className="border rounded p-2 w-full"
      />
      <button
        onClick={uploadEmails}
        className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        <FaUpload /> Upload Emails
      </button>
    </div>
  </div>
</div>

    );
}
