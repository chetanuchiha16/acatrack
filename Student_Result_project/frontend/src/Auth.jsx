import { useState, useEffect } from "react";
import jssLogo from "./assets/jssLogo.png";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import ForgotPassword from "./ForgotPassword";

export default function Auth() {
    let { who } = useParams();
    who = who || "Student";
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        document.body.style.backgroundImage = "url('/jss-1.jpeg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
        return () => {
            document.body.style.backgroundImage = "none";
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        axios
            .post(
                "http://localhost:5000/auth",
                { who, username, password },
                { withCredentials: true }
            )
            .then((res) => {
                const { data, status } = res;
                if (data.message) {
                    navigate(`/auth/${who}/${data.id}`, {
                        state: { who, id: data.id, name: data.name },
                    });
                } else {
                    alert(`${data.error} ${status}`);
                }
            });
    };

    const [showForgot, setShowForgot] = useState(false);

    function handleForgot(email) {
        axios
            .post("http://localhost:5000/auth/forgot-password", { email })
            .then((res) => alert(res.data.message))
            .catch((err) => alert(err.response.data.error));
        setShowForgot(false);
    }

    return (
        <div className="w-full h-screen flex items-center justify-center  bg-opacity-30 backdrop-blur-sm">
            <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl p-8 w-[90%] max-w-md relative animate-fadeIn">
                {/* Logo & Title */}
                <div className="flex flex-col items-center mb-6">
                    <img
                        src={jssLogo}
                        alt="JSS Logo"
                        className="w-24 drop-shadow-lg"
                    />
                    <h1 className="text-lg font-bold text-white text-center drop-shadow-md">
                        JSS Academy of Technical Education
                    </h1>
                    <p className="text-sm text-white/80">Bengaluru</p>
                </div>

                {/* Role Selector */}
                <div className="flex bg-white/30 backdrop-blur-md rounded-full p-1 mb-6 border border-white/20">
                    {["Student", "Staff", "Parent"].map((role) => (
                        <button
                            key={role}
                            onClick={() => navigate(`/auth/${role}`)}
                            className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${
                                who === role
                                    ? "bg-blue-500 text-white shadow-md"
                                    : "text-white hover:bg-white/20"
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
                            className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                    </div>

                    <div className="relative">
                        <FaLock className="absolute left-3 top-3 bg-transparent text-white/70" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 inset-y-0 flex items-center !bg-transparent text-white/70 focus:outline-none"
                            tabIndex={-1}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800 transition-all shadow-lg"
                    >
                        Login
                    </button>
                </form>

                {/* Optional Links */}
                <div className="mt-4 flex justify-between text-sm text-white/70">
                    <p
                        onClick={() => setShowForgot(true)}
                        className="text-sm text-blue-300 hover:underline cursor-pointer"
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
