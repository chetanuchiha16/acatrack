import { useState, useEffect } from "react";
import API_BASE from "./config";
import { useNavigate } from "react-router-dom";

export default function AdminPanel() {
  const navigate = useNavigate();
  const savedSecret = localStorage.getItem("admin_secret");

  const [secret, setSecret] = useState(savedSecret || "");
  const [mode, setMode] = useState("missing");
  const [status, setStatus] = useState("");

  const [emailFile, setEmailFile] = useState(null);
  const [mentorFile, setMentorFile] = useState(null);

  useEffect(() => {
    if (!secret) {
      navigate("/admin");
    }
  }, [navigate, secret]);

  const handleSecretSubmit = () => {
    if (!secret) return alert("Enter admin secret");
    localStorage.setItem("admin_secret", secret);
    setStatus("✅ Secret saved. You can now generate accounts or upload files.");
  };

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

  const uploadEmails = async () => {
    if (!emailFile) {
      setStatus("Please select an email file first.");
      return;
    }
    if (!secret) return alert("Admin secret missing");

    setStatus("Uploading emails...");
    const formData = new FormData();
    formData.append("file", emailFile);

    try {
      const res = await fetch(`${API_BASE}/admin/upload-emails`, {
        method: "POST",
        headers: { "X-Admin-Secret": secret },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setStatus(`✅ Uploaded emails. Inserted ${data.emails_inserted} records.`);
    } catch (err) {
      setStatus("❌ Error: " + err.message);
    }
  };

  const uploadMentors = async () => {
    if (!mentorFile) {
      setStatus("Please select a mentor file first.");
      return;
    }
    if (!secret) return alert("Admin secret missing");

    setStatus("Uploading mentors...");
    const formData = new FormData();
    formData.append("file", mentorFile);

    try {
      const res = await fetch(`${API_BASE}/admin/upload-mentors`, {
        method: "POST",
        headers: { "X-Admin-Secret": secret },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setStatus(
        `✅ Uploaded mentors. Inserted ${data.mentors_inserted} mentors and ${data.mappings_inserted} mappings.`
      );
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

        {/* File upload - Emails */}
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

        {/* File upload - Mentors */}
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
