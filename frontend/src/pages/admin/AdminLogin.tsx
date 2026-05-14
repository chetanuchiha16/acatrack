import React, { useState } from "react";
import { useNavigate } from "react-router-dom";


const AdminLogin: React.FC = () => {
  const [secret, setSecret] = useState<string>("");
  const navigate = useNavigate();

  const handleLogin = (): void => {
    if (!secret) {
        alert("Enter admin secret");
        return;
    }
    localStorage.setItem("admin_secret", "supersecretkey");
    void navigate("/admin/panel");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors">
      <div className="p-6 rounded-2xl shadow-lg w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Admin Login</h1>
        <input
          type="password"
          placeholder="Enter secret"
          value={secret}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecret(e.target.value)}
          className="w-full border rounded p-2 mb-4 bg-gray-50 dark:bg-[#0f1720] border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default AdminLogin;
