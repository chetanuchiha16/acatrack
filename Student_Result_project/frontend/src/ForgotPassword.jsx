import { useState } from "react";

export default function ForgotPassword({ onSubmit, onClose }) {
    const [email, setEmail] = useState("");

    function handleSubmit(e) {
        e.preventDefault();
        onSubmit(email);
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-black p-6 sm:p-8 rounded-xl w-full max-w-sm sm:max-w-md md:max-w-lg">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3">
                    Reset Password
                </h2>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 mb-4">
                    Enter your registered email. We’ll send you a reset link.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-2 sm:p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                        required
                    />
                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-gray-300 hover:bg-gray-400 text-sm sm:text-base"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-3 py-2 sm:px-4 sm:py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm sm:text-base"
                        >
                            Send Link
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
