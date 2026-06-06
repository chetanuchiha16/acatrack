import { useState, type FormEvent } from "react";
import { FaUser } from "react-icons/fa";
import { requestResetAuthForgotRequestPost } from "../../client/sdk.gen";
import { parseApiError } from "../../utils/errorHandler";

interface ForgotPasswordProps {
    onClose: () => void;
}

interface StatusMessage {
    type: "success" | "error";
    message: string;
}

export default function ForgotPassword({ onClose }: ForgotPasswordProps) {
    const [username, setUsername] = useState<string>("");
    const [status, setStatus] = useState<StatusMessage | null>(null);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setStatus(null); // clear previous messages

        try {
            const { data } = await requestResetAuthForgotRequestPost({
                body: { username }
            });
            
            if (data && typeof data === "object" && 'message' in data) {
                setStatus({
                    type: "success",
                    message: (data as { message: string }).message,
                });
            } else {
                setStatus({
                    type: "success",
                    message: "Reset link sent successfully!",
                });
            }
            setUsername("");
        } catch (err: unknown) {
            setStatus({
                type: "error",
                message: parseApiError(err),
            });
        }
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center rounded-3xl justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-900/80 via-slate-950/70 to-slate-950/90 backdrop-blur-2xl backdrop-saturate-200 border border-white/15 border-t-white/30 border-l-white/30 rounded-3xl shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.2),0_12px_40px_rgba(0,0,0,0.5)] p-6 sm:p-8 w-full max-w-md animate-fadeIn">
                {/* Heading */}
                <div className="flex flex-col items-center mb-4">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        Reset Password
                    </h2>
                    <p className="text-xs sm:text-sm md:text-base text-slate-200 mt-2 text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-medium">
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
                        <FaUser className="absolute left-3 top-3.5 text-slate-300" />
                        <input
                            type="text"
                            placeholder="USN / Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-black/45 text-white placeholder-slate-400 border border-white/10 focus:border-white/30 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-white/20 text-sm sm:text-base transition-all font-medium"
                            required
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-black/40 text-slate-300 hover:text-white border border-white/10 hover:bg-black/60 transition-all text-sm sm:text-base font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 border border-white/15 text-white hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-black/25 text-sm sm:text-base font-bold"
                        >
                            Send Link
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
