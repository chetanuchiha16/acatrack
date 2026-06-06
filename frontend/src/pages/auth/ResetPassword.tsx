import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { resetPasswordAuthForgotResetTokenPost } from "../../client/sdk.gen";
import { parseApiError } from "../../utils/errorHandler";

const ResetPassword: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [password, setPassword] = useState<string>("");
    const [confirm, setConfirm] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirm, setShowConfirm] = useState<boolean>(false);
    const [status, setStatus] = useState<string>("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (password !== confirm) {
            setStatus("Passwords do not match");
            return;
        }

        if (!token) {
            setStatus("Invalid token");
            return;
        }
        
        try {
            const { data } = await resetPasswordAuthForgotResetTokenPost({
                path: { token },
                body: { password }
            });
            
            const responseData = data as { message?: string };
            setStatus(responseData?.message || "Success");
            setTimeout(() => { void navigate("/auth"); }, 2000);
        } catch (err: unknown) {
            setStatus(parseApiError(err) || "Something went wrong");
        }
    };

    useEffect(() => {
        document.body.style.backgroundImage = "url('/anime-classroom.jpeg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
        return () => {
            document.body.style.backgroundImage = "none";
        };
    }, []);

    return (
        <div className="w-full min-h-screen relative bg-opacity-30 backdrop-blur-sm px-4 sm:px-6 md:px-8 flex items-center justify-center">
            {/* Card Container with Backlight Glow */}
            <div className="relative w-full max-w-md animate-fadeIn">
                {/* Backlight Refraction Glow */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-500/25 via-indigo-500/20 to-purple-500/25 rounded-[36px] blur-3xl opacity-80 pointer-events-none" />

                {/* Main Glass Card */}
                <div className="bg-gradient-to-br from-white/10 via-slate-950/60 to-slate-950/80 backdrop-blur-3xl backdrop-saturate-200 border border-white/10 border-t-white/30 border-l-white/30 rounded-[32px] shadow-[inset_0_2px_3px_rgba(255,255,255,0.2),0_16px_40px_rgba(0,0,0,0.6)] p-6 sm:p-8 relative overflow-hidden">
                    {/* Glossy specular sheen reflections */}
                    <div className="absolute -top-[40%] -left-[30%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-white/15 to-transparent blur-xl pointer-events-none transform rotate-12" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

                    <h2 className="text-2xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] text-center mb-6 relative z-10">
                        Set New Password
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
                        <div className="relative">
                            <FaLock className="absolute left-3 top-3.5 text-slate-300" />
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="New Password"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-black/45 text-white placeholder-slate-400 border border-white/10 focus:border-white/30 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                            />
                            <div
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 inset-y-0 flex items-center text-slate-300 hover:text-white cursor-pointer transition-colors"
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </div>
                        </div>

                        <div className="relative">
                            <FaLock className="absolute left-3 top-3.5 text-slate-300" />
                            <input
                                type={showConfirm ? "text" : "password"}
                                placeholder="Confirm Password"
                                value={confirm}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-black/45 text-white placeholder-slate-400 border border-white/10 focus:border-white/30 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium"
                            />
                            <div
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 inset-y-0 flex items-center text-slate-300 hover:text-white cursor-pointer transition-colors"
                            >
                                {showConfirm ? <FaEyeSlash /> : <FaEye />}
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 border border-white/15 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-black/25"
                        >
                            Reset Password
                        </button>
                    </form>

                    {status && (
                        <p className="mt-4 text-sm text-center text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-semibold relative z-10">
                            {status}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
