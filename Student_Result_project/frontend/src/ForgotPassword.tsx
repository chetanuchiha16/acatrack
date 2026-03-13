import { useState } from "react";
import { FaUser } from "react-icons/fa";
import axios from "axios";
import axiosInstance from "./axiosInstance";
import API_BASE from "./config"; // make sure this is correct

export default function ForgotPassword({ onClose }) {
    const [username, setUsername] = useState("");
    const [status, setStatus] = useState(null); // { type: "success" | "error", message: string }

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus(null); // clear previous messages

        try {
            const res = await axiosInstance.post(
                `${API_BASE}/auth/forgot/request`,
                {
                    username,
                }
            );
            setStatus({
                type: "success",
                message: res.data.message || "Reset link sent successfully!",
            });
            setUsername(""); // optional: clear input
        } catch (err) {
            setStatus({
                type: "error",
                message:
                    err.response?.data?.error ||
                    "Something went wrong. Please try again.",
            });
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center rounded-3xl justify-center z-50 p-4">
            <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md animate-fadeIn">
                {/* Heading */}
                <div className="flex flex-col items-center mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                        Reset Password
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-white/80 mt-2 text-center">
                        Enter your username (USN). We’ll send a reset link to
                        your registered email.
                    </p>
                </div>

                {/* Status message */}
                {status && (
                    <p
                        className={`text-sm mb-3 text-center ${
                            status.type === "success"
                                ? "text-green-400"
                                : "text-red-400"
                        }`}
                    >
                        {status.message}
                    </p>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <FaUser className="absolute left-3 top-3 text-white/70" />
                        <input
                            type="text"
                            placeholder="USN / Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-gray-500/50 text-white hover:bg-gray-600/70 text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 shadow-lg text-sm sm:text-base"
                        >
                            Send Link
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
