import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { resetPasswordAuthForgotResetTokenPost } from "./client/sdk.gen";
import { parseApiError } from "./utils/errorHandler";

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
        document.body.style.backgroundImage = "url('/jss-1.jpeg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
        return () => {
            document.body.style.backgroundImage = "none";
        };
    }, []);

    return (
        <div className="w-full min-h-screen relative bg-opacity-30 backdrop-blur-sm px-4 sm:px-6 md:px-8 flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-md animate-fadeIn">
                <h2 className="text-2xl font-bold text-white drop-shadow-md text-center mb-6">
                    Set New Password
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <FaLock className="absolute left-3 top-3 text-white/70" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="New Password"
                            value={password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <div
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 inset-y-0 flex items-center text-white/70 cursor-pointer"
                        >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </div>
                    </div>

                    <div className="relative">
                        <FaLock className="absolute left-3 top-3 text-white/70" />
                        <input
                            type={showConfirm ? "text" : "password"}
                            placeholder="Confirm Password"
                            value={confirm}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value)}
                            className="w-full pl-10 pr-10 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 border border-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <div
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 inset-y-0 flex items-center text-white/70 cursor-pointer"
                        >
                            {showConfirm ? <FaEyeSlash /> : <FaEye />}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-blue-800 transition-all shadow-lg"
                    >
                        Reset Password
                    </button>
                </form>

                {status && (
                    <p className="mt-4 text-sm text-center text-white/80">
                        {status}
                    </p>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
