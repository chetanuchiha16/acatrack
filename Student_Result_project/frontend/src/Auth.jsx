import { useState, useEffect } from "react";
import jssLogo from "./assets/jssLogo.png";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import ForgotPassword from "./ForgotPassword";
import API_BASE from "./config";

export default function Auth() {
    let { who } = useParams();
    who = who || "Student";
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [user, setUser] = useState(null);
    const [showForgot, setShowForgot] = useState(false);
    const [loading, setLoading] = useState(true); // new: loading state

    useEffect(() => {
        document.body.style.backgroundImage = "url('/jss-1.jpeg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
        return () => {
            document.body.style.backgroundImage = "none";
        };
    }, []);

    // On mount, check if session exists, then redirect
    useEffect(() => {
        axios
            .get(`${API_BASE}/auth/status`, { withCredentials: true })
            .then((res) => {
                if (res.data.logged_in) {
                    navigate(`/auth/${res.data.who}/${res.data.id}`, {
                        state: {
                            who: res.data.who,
                            id: res.data.id,
                            name: res.data.name,
                        },
                        replace: true,
                    });
                }
            })
            .catch(() => {
                // Not logged in, stay on login form
            })
            .finally(() => setLoading(false));
    }, [navigate, who]);

    const handleSubmit = (e) => {
        e.preventDefault();
        axios
            .post(
                `${API_BASE}/auth`,
                { who, username, password },
                { withCredentials: true } // important!
            )
            .then((res) => {
                const { data } = res;
                if (data.message) {
                    setUser({ username: data.id, name: data.name, role: who });
                    navigate(`/auth/${who}/${data.id}`, {
                        state: { who, id: data.id, name: data.name },
                    });
                } else {
                    alert(`${data.error}`);
                }
            })
            .catch((err) => {
                alert(err.response?.data?.error || "Login failed");
            });
    };

    function handleForgot(email) {
        axios
            .post(`${API_BASE}/auth/forgot-password`, { email })
            .then((res) => alert(res.data.message))
            .catch((err) => alert(err.response?.data?.error || "Error"));
        setShowForgot(false);
    }

    if (loading) {
        // Optionally show loading spinner
        return <div className="text-white text-center mt-10">Loading...</div>;
    }

    // If not logged in, show login form
    return (
        <div className="w-full min-h-screen relative bg-opacity-30 backdrop-blur-sm px-4 sm:px-6 md:px-8 flex items-center justify-center">
            {/* Top Heading */}
            <div className="absolute top-4 sm:top-6 w-full text-center">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-black drop-shadow-md">
                    JSS Academy of Technical Education
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-black/80">
                    Bengaluru
                </p>
            </div>

            {/* Centered Login Card */}
            <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md relative animate-fadeIn mt-20 sm:mt-28">
                {/* Logo */}
                <div className="flex flex-col items-center mb-6">
                    <img
                        src={jssLogo}
                        alt="JSS Logo"
                        className="w-20 sm:w-24 drop-shadow-lg"
                    />
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
                                    : "!text-white hover:bg-white/20"
                            }`}
                        >
                            {role}
                        </button>
                    ))}
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
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
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 inset-y-0 flex items-center !border-0 !bg-transparent hover:!border-0 focus:!outline-0 text-white/70 focus:!outline-none"
                            tabIndex={-1}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
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
                        className="text-blue-300 hover:underline cursor-pointer"
                    >
                        Forgot password?
                    </p>

                    {showForgot && (
                        <ForgotPassword
                            onSubmit={handleForgot}
                            onClose={() => setShowForgot(false)}
                        />
                    )}
                    <a href="#" className="hover:text-white">
                        Need help?
                    </a>
                </div>
            </div>
        </div>
    );
}
