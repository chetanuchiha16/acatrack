import { useEffect, useState } from "react";
import API_BASE from "./config";

export default function MenteeRecieveEmails({ usn }) {
    const [messages, setMessages] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch all messages
    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/student/${usn}/messages`);
            const data = await res.json();
            setMessages(data);
        } catch (err) {
            console.error("Error fetching messages:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch single message detail
    const fetchMessageDetail = async (msgId) => {
        try {
            const res = await fetch(
                `${API_BASE}/student/${usn}/messages/${msgId}`
            );
            if (res.ok) {
                const data = await res.json();
                setSelectedMessage(data);
            }
        } catch (err) {
            console.error("Error fetching message detail:", err);
        }
    };

    // Mark message as read
    const markAsRead = async (msgId) => {
        try {
            await fetch(`${API_BASE}/student/${usn}/messages/${msgId}/read`, {
                method: "POST",
            });
            fetchMessages(); // refresh list
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, [usn]);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col border-4 border-black rounded-xl dark:text-white dark:bg-[#1a1a1a] backdrop-blur-sm p-4 h-[80vh]">
            <div className="flex flex-col md:flex-row gap-6 p-6 min-h-full bg-gradient-to-br from-gray-900 via-gray-950 to-black">
                {/* Left: Messages list */}
                <div className="w-full md:w-1/3 rounded-2xl backdrop-blur-md bg-gray-800/30 shadow-xl border border-gray-700/50 overflow-hidden">
                    <h2 className="text-xl font-semibold p-4 border-b border-gray-700/40 text-gray-100">
                        Inbox
                    </h2>
                    {loading ? (
                        <p className="p-4 text-gray-400">Loading messages...</p>
                    ) : messages.length === 0 ? (
                        <p className="p-4 text-gray-400">No messages yet</p>
                    ) : (
                        <ul className="divide-y divide-gray-700/40">
                            {messages.map((msg) => (
                                <li
                                    key={msg.id}
                                    className={`p-4 cursor-pointer transition ${
                                        selectedMessage?.id === msg.id
                                            ? "bg-emerald-500/20 border-l-4 border-emerald-400"
                                            : "hover:bg-gray-700/30"
                                    }`}
                                    onClick={() => fetchMessageDetail(msg.id)}
                                >
                                    <p className="font-medium text-gray-100 truncate">
                                        {msg.subject || "No subject"}
                                    </p>
                                    <p className="text-sm text-gray-400 truncate">
                                        {msg.message?.slice(0, 50) || "No content"}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Right: Message detail */}
                <div className="w-full md:flex-1 rounded-2xl backdrop-blur-md bg-gray-800/30 shadow-xl border border-gray-700/50 p-8 flex flex-col justify-between">
                    {selectedMessage ? (
                        <>
                            <div>
                                <h3 className="text-2xl font-bold mb-2 text-gray-100">
                                    {selectedMessage.subject || "No subject"}
                                </h3>
                                <p className="text-sm text-gray-400 mb-6">
                                    From:{" "}
                                    {selectedMessage.mentor_name || "Unknown"}
                                </p>
                                <div className="bg-gray-900/40 p-4 rounded-xl text-gray-200 whitespace-pre-line shadow-inner">
                                    {selectedMessage.message}
                                </div>
                            </div>
                            <div className="mt-6">
                                <button
                                    onClick={() =>
                                        markAsRead(selectedMessage.id)
                                    }
                                    className="px-6 py-3 rounded-xl bg-emerald-500/80 text-white font-semibold hover:bg-emerald-600 transition shadow-lg"
                                >
                                    Mark as Read
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-gray-500 flex-1 flex items-center justify-center">
                            <p>Select a message to view</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
