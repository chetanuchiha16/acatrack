import { useState, useEffect } from "react";
import jssLogo from "./assets/jssLogo.png";
import axios from "axios";
import axiosInstance from "./axiosInstance";
import { useParams, useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import ForgotPassword from "./ForgotPassword";
import API_BASE from "./config";
import { requestForToken } from "./firebase";

export default function Auth() {
    let { who } = useParams();
    who = who || "Student";
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [batchYear, setBatchYear] = useState("");
    const [user, setUser] = useState(null);
    const [showForgot, setShowForgot] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.body.style.backgroundImage = "url('/jss-1.jpeg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
        return () => {
            document.body.style.backgroundImage = "none";
        };
    }, []);

    // check if already logged in
    useEffect(() => {
        const token = sessionStorage.getItem("jwt_token");
        if (!token) return setLoading(false);

        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                sessionStorage.removeItem("jwt_token");
            } else {
                navigate(`/auth/${payload.who}/${payload.id}`, {
                    state: payload,
                    replace: true,
                });
            }
        } catch (err) {
            console.warn("Invalid token:", err);
            sessionStorage.removeItem("jwt_token");
        }

        setLoading(false);
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (who === "Staff" && !batchYear) {
            alert("Please select a batch year");
            return;
        }

        try {
            const res = await axiosInstance.post(`${API_BASE}/auth`, {
                who,
                username,
                password,
                batch_year: who === "Staff" ? batchYear : null,
            });

            const token = res.data.token;
            if (!token) {
                alert("Login failed");
                return;
            }

            sessionStorage.setItem("jwt_token", token);

            const payload = JSON.parse(atob(token.split(".")[1]));
            const { id, name, mentor_id } = payload;
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                sessionStorage.removeItem("jwt_token");
                return;
            }

            // 🔹 request FCM token
            try {
                const fcmToken = await requestForToken();
                if (fcmToken) {
                    await axiosInstance.post(
                        `${API_BASE}/student/${id}/fcm-token`,
                        { fcm_token: fcmToken },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                }
            } catch (err) {
                console.warn("Failed to save FCM token:", err);
            }

            navigate(`/auth/${who}/${id}`, {
                state: { who, id, name, mentor_id },
            });
        } catch (err) {
            alert(err.response?.data?.error || "Login failed");
        }
    };
    const [batches, setBatches] = useState([]);

    // fetch batches if staff
    useEffect(() => {
        if (who === "Staff") {
            axios
                .get(`${API_BASE}/batches`)
                .then((res) => setBatches(res.data.batches))
                .catch(() => setBatches([]));
        }
    }, [who]);

    if (loading) {
        return <div className="text-white text-center mt-10">Loading...</div>;
    }

    return (
        <div className="w-full min-h-screen relative bg-opacity-30 backdrop-blur-sm px-4 sm:px-6 md:px-8 flex items-center justify-center">
            {/* Top Section with Logo & Title */}
            <div className="absolute top-4 sm:top-6 w-full flex flex-col items-center">
                {/* Logo pinned left */}
                <div className="absolute left-1/2 xl:left-25 transform -translate-x-1/2">
                    <img
                        src={jssLogo}
                        alt="JSS Logo"
                        className="w-33 sm:w-33 md:w-37 lg:w-39 h-auto drop-shadow-lg"
                    />
                </div>

                {/* Title centered */}
                <div className="text-center mt-10">
                    <div className="text-4xl mt-2.5 sm:text-4xl sm:mt-2.5 md:text-5xl md:mt-5 xl:-mt-11 lg:text-5xl lg:mt-5 font-bold text-red-700 drop-shadow-md">
                        JSS Academy of Technical Education
                    </div>
                    <p className="text-base sm:text-lg md:text-xl text-red-600">
                        Bengaluru
                    </p>
                </div>
            </div>

            {/* Login Card */}
            <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative animate-fadeIn mt-28 sm:mt-32">
                {/* Login Heading */}
                <div className="flex flex-col items-center mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-white drop-shadow-md">
                        Login to JssTrack360
                    </h2>
                </div>

                {/* Role Selector */}
                <div className="flex bg-white/30 backdrop-blur-md rounded-full p-1 mb-6 border border-white/20">
                    {["Student", "Staff", "Parent"].map((role) => (
                        <button
                            key={role}
                            onClick={() => navigate(`/auth/${role}`)}
                            className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-medium transition-all mx-0.5 ${
                                who === role
                                    ? "!bg-blue-500 !text-white !shadow-md"
                                    : "!text-white !hover:bg-white/20"
                            }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        {who === "Staff" && (
                            <select
                                value={batchYear}
                                onChange={(e) => setBatchYear(e.target.value)}
                                className="mb-2 w-full rounded-lg bg-white/20 text-white p-2"
                            >
                                <option value="">Select Batch</option>
                                {batches.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        )}
                        <FaUser className="absolute left-3 top-3 text-white/70" />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                        />
                    </div>

                    <div className="relative">
                        <FaLock className="absolute left-3 top-3 text-white/70" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                        />
                        <div
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 inset-y-0 flex items-center text-white/70 rounded-xl"
                            tabIndex={-1}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800 transition-all shadow-lg text-sm sm:text-base"
                    >
                        Login
                    </button>
                </form>

                {/* Links */}
                <div className="mt-4 flex flex-col sm:flex-row sm:justify-between items-center text-xs sm:text-sm text-white/70 gap-2">
                    <p
                        onClick={() => setShowForgot(true)}
                        className="text-indigo-700 hover:underline cursor-pointer font-medium"
                    >
                        Forgot password?
                    </p>

                    {showForgot && (
                        <ForgotPassword onClose={() => setShowForgot(false)} />
                    )}
                    <a href="#" className="hover:text-white text-indigo-700">
                        Need help?
                    </a>
                </div>
            </div>
        </div>
    );
}
