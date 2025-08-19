import { useState, useEffect } from "react";
import API_BASE from "./config";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const navigate = useNavigate();
  const savedSecret = localStorage.getItem("admin_secret");
  
  const [secret, setSecret] = useState(savedSecret || "");
  const [mode, setMode] = useState("missing");
  const [status, setStatus] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    // redirect if no secret
    if (!secret) {
      navigate("/admin");
    }
  }, [navigate, secret]);

  // Save entered secret to localStorage
  const handleSecretSubmit = () => {
    if (!secret) return alert("Enter admin secret");
    localStorage.setItem("admin_secret", secret);
    setStatus("✅ Secret saved. You can now generate accounts or upload emails.");
  };

  // Generate accounts and download CSV
  const generateAccounts = async () => {
    if (!secret) return alert("Admin secret missing");
    setStatus("Generating accounts...");
    try {
      const res = await fetch(
        `${API_BASE}/admin/generate-accounts?mode=${mode}`,
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

  // Upload email file
  const uploadEmails = async () => {
    if (!file) {
      setStatus("Please select a file first.");
      return;
    }
    if (!secret) return alert("Admin secret missing");
    setStatus("Uploading emails...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/admin/upload-emails`, {
        method: "POST",
        headers: { "X-Admin-Secret": secret },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setStatus(`✅ Uploaded. Inserted ${data.emails_inserted} records.`);
    } catch (err) {
      setStatus("❌ Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <div className="shadow-lg rounded-2xl p-6 w-full max-w-xl">
        <h1 className="text-2xl font-bold mb-4">Admin Control Panel</h1>

        {/* Only show secret input if not saved */}
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

        {/* Mode selection */}
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

        {/* File upload */}
        <label className="block mb-2 font-medium">Upload Email File (.xlsx or .csv)</label>
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full mb-4"
        />
        <button
          onClick={uploadEmails}
          className="w-full bg-green-600 text-white py-2 rounded-xl hover:bg-green-700"
        >
          Upload Emails
        </button>

        {status && <p className="mt-4 text-sm text-gray-700">{status}</p>}
      </div>
    </div>
  );
}
