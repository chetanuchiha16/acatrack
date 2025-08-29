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
        <div className="w-full max-w-7xl mx-auto flex flex-col rounded-xl p-4 h-[80vh]">
            <div className="flex flex-col md:flex-row gap-6 p-6 min-h-full bg-white shadow-xl rounded-2xl">
                {/* Left: Messages list */}
                <div className="w-full md:w-1/3 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden">
                    <h2 className="text-lg font-semibold p-4 bg-gray-50 border-b border-gray-200 text-gray-800">
                        Inbox
                    </h2>
                    {loading ? (
                        <p className="p-4 text-gray-500">Loading messages...</p>
                    ) : messages.length === 0 ? (
                        <p className="p-4 text-gray-500">No messages yet</p>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {messages.map((msg) => (
                                <li
                                    key={msg.id}
                                    className={`p-4 cursor-pointer transition rounded-md ${
                                        selectedMessage?.id === msg.id
                                            ? "bg-emerald-50 border-l-4 border-emerald-400"
                                            : "hover:bg-gray-50"
                                    }`}
                                    onClick={() => fetchMessageDetail(msg.id)}
                                >
                                    <p className="font-medium text-gray-800 truncate">
                                        {msg.subject || "No subject"}
                                    </p>
                                    <p className="text-sm text-gray-500 truncate">
                                        {msg.message?.slice(0, 50) ||
                                            "No content"}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Right: Message detail */}
                <div className="w-full md:flex-1 rounded-2xl bg-white border border-gray-200 shadow-sm p-8 flex flex-col justify-between">
                    {selectedMessage ? (
                        <>
                            <div>
                                <h3 className="text-2xl font-bold mb-2 text-gray-900">
                                    {selectedMessage.subject || "No subject"}
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    From:{" "}
                                    {selectedMessage.mentor_name || "Unknown"}
                                </p>
                                <div className="bg-gray-50 p-4 rounded-xl text-gray-700 whitespace-pre-line shadow-inner">
                                    {selectedMessage.message}
                                </div>
                            </div>
                            <div className="mt-6">
                                <button
                                    onClick={() =>
                                        markAsRead(selectedMessage.id)
                                    }
                                    className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition shadow-md"
                                >
                                    Mark as Read
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-gray-400 flex-1 flex items-center justify-center">
                            <p>Select a message to view</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
