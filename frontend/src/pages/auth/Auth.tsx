import React, { useState, useEffect } from "react";
import { brandingConfig } from "../../config";
import { useParams, useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash, FaGraduationCap } from "react-icons/fa";
import ForgotPassword from "./ForgotPassword";
import { requestForToken } from "../../firebase";
import LoadingSpinner from "../../components/LoadingSpinner";
import { parseJwt } from "../../utils/auth";
import { getToken, setToken, clearToken } from "../../utils/storage";
import { authAuthPost, saveFcmTokenStudentUsnFcmTokenPost } from "../../client/sdk.gen";
import { parseApiError } from "../../utils/errorHandler";

const Auth: React.FC = () => {
    let { who } = useParams<{ who?: string }>();
    who = who || "Student";
    const navigate = useNavigate();

    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showForgot, setShowForgot] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        document.body.style.backgroundImage = "url('/anime-classroom.jpeg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
        return () => {
            document.body.style.backgroundImage = "none";
        };
    }, []);

    // check if already logged in
    useEffect(() => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        const payload = parseJwt(token);
        if (payload) {
            void navigate(`/auth/${payload.who}/${payload.id}`, {
                state: payload,
                replace: true,
            });
        } else {
            clearToken();
        }

        setLoading(false);
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        try {
            const { data: authData } = await authAuthPost({
                body: {
                    who,
                    username,
                    password,
                }
            });

            const token = authData?.token;
            if (!token) {
                alert("Login failed: No token received");
                return;
            }

            setToken(token);

            const payload = parseJwt(token);
            if (!payload) {
                clearToken();
                return;
            }
            
            const id = payload.id as string;
            const name = payload.name as string;
            const mentor_id = payload.mentor_id as string;

            // 🔹 request FCM token (Only for Students)
            if (who === "Student") {
                try {
                    const fcmToken = await requestForToken();
                    if (fcmToken) {
                        await saveFcmTokenStudentUsnFcmTokenPost({
                            path: { usn: id },
                            body: { fcm_token: fcmToken }
                        });
                    }
                } catch (err) {
                    console.warn("Failed to save FCM token:", err);
                }
            }

            void navigate(`/auth/${who}/${id}`, {
                state: { who, id, name, mentor_id },
            });
        } catch (err: unknown) {
            const apiErrorMsg = parseApiError(err) || "Login failed";
            alert(apiErrorMsg);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Checking authentication status..." fullScreen={true} />;
    }

    return (
        <div className="w-full min-h-screen relative bg-opacity-30 backdrop-blur-sm px-4 sm:px-6 md:px-8 flex items-center justify-center">
            {/* Top Section with Logo & Title */}
            <div className="absolute top-4 sm:top-6 w-full flex flex-col items-center">
                {/* Logo pinned left */}
                <div className="absolute left-1/2 xl:left-25 transform -translate-x-1/2">
                    {brandingConfig.collegeLogo ? (
                        <img
                            src={brandingConfig.collegeLogo}
                            alt="College Logo"
                            className="w-33 sm:w-33 md:w-37 lg:w-39 h-auto drop-shadow-lg"
                        />
                    ) : (
                        <FaGraduationCap className="text-blue-500 w-16 h-16 drop-shadow-lg" />
                    )}
                </div>

                {/* Title centered */}
                <div className="text-center mt-10">
                    <div className="text-4xl mt-2.5 sm:text-4xl sm:mt-2.5 md:text-5xl md:mt-5 xl:-mt-11 lg:text-5xl lg:mt-5 font-extrabold text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                        {brandingConfig.collegeName}
                    </div>
                    <p className="text-base sm:text-lg md:text-xl text-slate-100 font-medium drop-shadow-[0_1.5px_4px_rgba(0,0,0,0.8)]">
                        {brandingConfig.collegeTagline}
                    </p>
                </div>
            </div>

            {/* Login Card Container with Backlight Glow */}
            <div className="relative w-full max-w-md mt-28 sm:mt-32 animate-fadeIn">
                {/* Backlight Refraction Glow */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/25 via-indigo-500/20 to-purple-500/25 rounded-[36px] blur-3xl opacity-80 pointer-events-none" />

                {/* Main Glass Card */}
                <div className="bg-gradient-to-br from-white/10 via-slate-950/60 to-slate-950/80 backdrop-blur-3xl backdrop-saturate-200 border border-white/10 border-t-white/30 border-l-white/30 rounded-[32px] shadow-[inset_0_2px_3px_rgba(255,255,255,0.2),0_16px_40px_rgba(0,0,0,0.6)] p-6 sm:p-8 relative overflow-hidden">
                    {/* Glossy specular sheen reflections */}
                    <div className="absolute -top-[40%] -left-[30%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-white/15 to-transparent blur-xl pointer-events-none transform rotate-12" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

                    {/* Login Heading */}
                    <div className="flex flex-col items-center mb-6 relative z-10">
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                            Login to Acatrack
                        </h2>
                    </div>

                    {/* Role Selector */}
                    <div className="flex bg-black/40 backdrop-blur-md rounded-full p-1 mb-6 border border-white/10 relative z-10">
                        {["Student", "Staff", "Parent"].map((role) => (
                            <button
                                key={role}
                                onClick={() => navigate(`/auth/${role}`)}
                                className={`flex-1 py-2 rounded-full text-xs sm:text-sm font-bold transition-all mx-0.5 ${
                                    who === role
                                        ? "!bg-blue-600 !text-white !shadow-lg border border-white/15"
                                        : "!text-slate-300 hover:!text-white hover:bg-white/5"
                                }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <FaUser className="absolute left-3 top-3.5 text-slate-300" />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/45 text-white placeholder-slate-400 border border-white/10 focus:border-white/30 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm sm:text-base transition-all font-medium"
                        />
                    </div>

                    <div className="relative">
                        <FaLock className="absolute left-3 top-3.5 text-slate-300" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-black/45 text-white placeholder-slate-400 border border-white/10 focus:border-white/30 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm sm:text-base transition-all font-medium"
                        />
                        <div
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 inset-y-0 flex items-center text-slate-300 hover:text-white cursor-pointer transition-colors"
                            tabIndex={-1}
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 border border-white/15 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-black/25 text-sm sm:text-base"
                    >
                        Login
                    </button>
                </form>

                {/* Links */}
                <div className="mt-4 flex flex-col sm:flex-row sm:justify-between items-center text-xs sm:text-sm text-slate-300 gap-2">
                    <p
                        onClick={() => setShowForgot(true)}
                        className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer font-bold transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                    >
                        Forgot password?
                    </p>

                    {showForgot && (
                        <ForgotPassword onClose={() => setShowForgot(false)} />
                    )}
                    <a href="#" className="hover:text-white text-slate-300 transition-colors font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                        Need help?
                    </a>
                </div>
            </div>
        </div>
    </div>
);
};

export default Auth;
