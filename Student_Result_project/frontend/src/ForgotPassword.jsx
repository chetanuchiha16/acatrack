import { useState } from "react";

export default function ForgotPassword({ onSubmit, onClose }) {
    const [email, setEmail] = useState("");

    function handleSubmit(e) {
        e.preventDefault();
        onSubmit(email);
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className=" dark:bg-black p-6 rounded-xl w-[350px]">
                <h2 className="text-xl font-bold mb-4">Reset Password</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Enter your registered email. We’ll send you a reset link.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                            Send Link
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
