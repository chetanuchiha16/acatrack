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
    setStatus("✅ Secret saved. You can now generate accounts or upload files.");
    fetchBatches();
  };

  const generateAccounts = async () => {
    if (!secret) return alert("Admin secret missing");
    if (!batchYear) return alert("Select a batch first");
    setStatus("Generating accounts...");
    try {
      const res = await fetch(
        `${API_BASE}/admin/generate-accounts?mode=${mode}&batch_year=${parseInt(batchYear, 10)}`,
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
        `${API_BASE}/admin/upload-emails?batch_year=${parseInt(batchYear, 10)}`,
        {
          method: "POST",
          headers: { "X-Admin-Secret": secret },
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setStatus(`✅ Uploaded emails. Inserted ${data.emails_inserted} records.`);
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
        `${API_BASE}/admin/upload-mentors?batch_year=${parseInt(batchYear, 10)}`,
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
    } catch (err) {
      setStatus("❌ Error: " + err.message);
    }
  };

  const createBatch = async () => {
    if (!newBatchYear) return setStatus("Enter a new batch year to create.");
    if (!secret) return alert("Admin secret missing");

    setStatus(`Creating batch ${newBatchYear}...`);
    try {
      const res = await fetch(`${API_BASE}/admin/create-batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Secret": secret,
        },
        body: JSON.stringify({ batch_year: parseInt(newBatchYear, 10) }),
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

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <div className="shadow-lg rounded-2xl p-6 w-full max-w-xl">

        <h1 className="text-2xl font-bold mb-4">Admin Control Panel</h1>

        {!savedSecret && (
          <>
            <label className="block mb-2 font-medium">Admin Secret</label>
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
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <label className="block mb-2 font-medium">Create New Batch</label>
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

        <label className="block mb-2 font-medium">Account Generation Mode</label>
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

        <label className="block mb-2 font-medium">Upload Email File (.xlsx or .csv)</label>
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

        <label className="block mb-2 font-medium">Upload Mentor File (.xlsx)</label>
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

        {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}
      </div>
    </div>
  );
}
