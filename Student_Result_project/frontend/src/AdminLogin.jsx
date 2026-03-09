import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [secret, setSecret] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!secret) return alert("Enter admin secret");
    localStorage.setItem("admin_secret", "supersecretkey");
    navigate("/admin/panel");
  };

  return (
    <div className="min-h-screen flex items-center justify-center ">
      <div className=" p-6 rounded-2xl shadow-md w-80">
        <h1 className="text-xl font-bold mb-4">Admin Login</h1>
        <input
          type="password"
          placeholder="Enter secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          className="w-full border rounded p-2 mb-4"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}
