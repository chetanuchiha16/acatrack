import React, { useState, useEffect, useRef } from "react";
import API_BASE from "./config";
import LogoutButton from "./LogoutButton";

export default function ChatBot() {
    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "👋 Welcome to Student Result Chatbot!\nType your ward's name (with initials), or type 'list' to see all students.",
        },
    ]);
    const [input, setInput] = useState("");
    const [students, setStudents] = useState([]);
    const messagesEndRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_BASE}/students`);
            const data = await res.json();
            if (data.students) {
                // Group by first letter
                const grouped = data.students.reduce((acc, name) => {
                    const letter = name[0].toUpperCase();
                    if (!acc[letter]) acc[letter] = [];
                    acc[letter].push(name);
                    return acc;
                }, {});

                setStudents(data.students);
                setMessages((prev) => [
                    ...prev,
                    {
                        sender: "bot",
                        type: "students",
                        data: grouped,
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { sender: "bot", text: "⚠️ Unable to fetch students." },
                ]);
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "❌ Error fetching student list." },
            ]);
        }
    };

    // Fetch student report
    const fetchReport = async (name) => {
        try {
            const res = await fetch(
                `${API_BASE}/report/${encodeURIComponent(name)}`
            );
            const data = await res.json();
            if (data.error) {
                setMessages((prev) => [
                    ...prev,
                    { sender: "bot", text: "🚫 " + data.error },
                ]);
                return;
            }

            setMessages((prev) => [
                ...prev,
                {
                    sender: "bot",
                    type: "header",
                    text: `📄 Report for ${data.student_name}`,
                },
                {
                    sender: "bot",
                    type: "semesters",
                    data: data.semester_results,
                },
                {
                    sender: "bot",
                    type: "backlogs",
                    data: data.backlogs,
                    totalCredits: data.total_backlog_credits,
                    concern:
                        data.total_backlog_credits > 18
                            ? "⚠️ Backlog credits exceed 18. Risk of year back"
                            : "",
                },
                {
                    sender: "bot",
                    type: "downloads",
                    downloadUrls: {
                        full: `${API_BASE}/report/${encodeURIComponent(
                            data.student_name
                        )}/pdf?type=full`,
                        backlog: `${API_BASE}/report/${encodeURIComponent(
                            data.student_name
                        )}/pdf?type=backlog`,
                    },
                },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "❌ Error fetching report." },
            ]);
        }
    };

    // Handle user message
    const handleSend = () => {
        if (!input.trim()) return;
        const userMessage = input.trim();
        setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
        setInput("");

        if (userMessage.toLowerCase() === "list") {
            fetchStudents();
        } else {
            fetchReport(userMessage);
        }
    };

    return (
        <div className="flex flex-col items-center w-full h-screen">
            {/* Header */}
            <div className="flex justify-between w-full max-w-3xl p-2 shadow-sm">
                <h1 className="font-semibold text-lg">
                    🎓 Student Result Chatbot
                </h1>
                <LogoutButton />
            </div>

            {/* Chat messages */}
            <div className="flex flex-col flex-1 w-full max-w-3xl overflow-y-auto px-3 py-4 space-y-3">
                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${
                            msg.sender === "user"
                                ? "justify-end"
                                : "justify-start"
                        }`}
                    >
                        <div
                            className={`rounded-2xl px-4 py-2 shadow-md max-w-[85%] whitespace-pre-line ${
                                msg.sender === "user"
                                    ? "bg-blue-500 text-white self-end"
                                    : "bg-gray-800 text-white"
                            }`}
                        >
                            {/* Header */}
                            {msg.type === "header" && (
                                <h3 className="font-bold mb-2 text-lg">
                                    {msg.text}
                                </h3>
                            )}

                            {/* Accordion for semesters */}
                            {msg.type === "semesters" && (
                                <div className="space-y-2">
                                    {Object.entries(msg.data).map(
                                        ([sem, subjects]) => (
                                            <details
                                                key={sem}
                                                className="bg-gray-700 rounded-lg p-2"
                                            >
                                                <summary className="cursor-pointer font-semibold text-yellow-300">
                                                    📚 {sem}
                                                </summary>
                                                <div className="overflow-x-auto mt-2">
                                                    <table className="min-w-full text-sm border border-gray-600 rounded-lg">
                                                        <thead className="bg-gray-600">
                                                            <tr>
                                                                <th className="px-2 py-1 text-left">
                                                                    Subject
                                                                </th>
                                                                <th className="px-2 py-1">
                                                                    Int
                                                                </th>
                                                                <th className="px-2 py-1">
                                                                    Ext
                                                                </th>
                                                                <th className="px-2 py-1">
                                                                    Total
                                                                </th>
                                                                <th className="px-2 py-1">
                                                                    Credits
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {subjects.map(
                                                                (s, idx) => (
                                                                    <tr
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="border-t border-gray-600"
                                                                    >
                                                                        <td className="px-2 py-1">
                                                                            {
                                                                                s.subject
                                                                            }
                                                                        </td>
                                                                        <td className="px-2 py-1 text-center">
                                                                            {
                                                                                s.internal
                                                                            }
                                                                        </td>
                                                                        <td className="px-2 py-1 text-center">
                                                                            {
                                                                                s.external
                                                                            }
                                                                        </td>
                                                                        <td className="px-2 py-1 text-center">
                                                                            {
                                                                                s.total
                                                                            }
                                                                        </td>
                                                                        <td className="px-2 py-1 text-center">
                                                                            {
                                                                                s.credits
                                                                            }
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </details>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Accordion for backlogs */}
                            {msg.type === "backlogs" && (
                                <details className="mt-2 bg-gray-700 rounded-lg p-2">
                                    <summary className="cursor-pointer font-semibold text-red-400">
                                        ⚠️ Backlogs{" "}
                                        {msg.totalCredits > 0 &&
                                            `(Credits: ${msg.totalCredits})`}
                                    </summary>
                                    <div className="mt-2">
                                        {Object.keys(msg.data).length === 0 ? (
                                            <p className="text-green-400">
                                                ✅ No backlogs!
                                            </p>
                                        ) : (
                                            Object.entries(msg.data).map(
                                                ([sem, subs]) => (
                                                    <div
                                                        key={sem}
                                                        className="mb-2"
                                                    >
                                                        <h5 className="font-medium text-yellow-300">
                                                            🔴 {sem}
                                                        </h5>
                                                        <ul className="list-disc list-inside text-sm">
                                                            {subs.map(
                                                                (s, idx) => (
                                                                    <li
                                                                        key={
                                                                            idx
                                                                        }
                                                                    >
                                                                        {
                                                                            s.subject
                                                                        }{" "}
                                                                        (Ext:{" "}
                                                                        {
                                                                            s.external
                                                                        }
                                                                        , Cr:{" "}
                                                                        {
                                                                            s.credits
                                                                        }
                                                                        )
                                                                    </li>
                                                                )
                                                            )}
                                                        </ul>
                                                    </div>
                                                )
                                            )
                                        )}
                                        {msg.concern && (
                                            <p className="text-red-400 font-semibold mt-1">
                                                {msg.concern}
                                            </p>
                                        )}
                                    </div>
                                </details>
                            )}

                            {/* Downloads */}
                            {msg.type === "downloads" && (
                                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                                    <button
                                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                        onClick={() =>
                                            window.open(
                                                msg.downloadUrls.full,
                                                "_blank"
                                            )
                                        }
                                    >
                                        📥 Semester Report
                                    </button>
                                    <button
                                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                        onClick={() =>
                                            window.open(
                                                msg.downloadUrls.backlog,
                                                "_blank"
                                            )
                                        }
                                    >
                                        📥 Backlog Report
                                    </button>
                                </div>
                            )}
                            {msg.type === "students" && (
                                <div className="space-y-2">
                                    {Object.entries(msg.data)
                                        .sort(([a], [b]) => a.localeCompare(b))
                                        .map(([letter, names]) => (
                                            <details
                                                key={letter}
                                                className="bg-gray-700 rounded-lg p-2"
                                            >
                                                <summary className="cursor-pointer font-semibold text-yellow-300">
                                                    {letter} ({names.length}{" "}
                                                    students)
                                                </summary>

                                                {/* Table */}
                                                <div className="overflow-x-auto mt-2">
                                                    <table className="min-w-full text-sm border border-gray-600 rounded-lg">
                                                        <tbody>
                                                            {Array.from(
                                                                {
                                                                    length: Math.ceil(
                                                                        names.length /
                                                                            4
                                                                    ),
                                                                }, // 4 columns
                                                                (_, rowIdx) => (
                                                                    <tr
                                                                        key={
                                                                            rowIdx
                                                                        }
                                                                        className="border-t border-gray-600"
                                                                    >
                                                                        {names
                                                                            .slice(
                                                                                rowIdx *
                                                                                    4,
                                                                                rowIdx *
                                                                                    4 +
                                                                                    4
                                                                            )
                                                                            .map(
                                                                                (
                                                                                    s,
                                                                                    idx
                                                                                ) => (
                                                                                    <td
                                                                                        key={
                                                                                            idx
                                                                                        }
                                                                                        className="px-2 py-1"
                                                                                    >
                                                                                        {
                                                                                            s
                                                                                        }
                                                                                    </td>
                                                                                )
                                                                            )}
                                                                    </tr>
                                                                )
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </details>
                                        ))}
                                </div>
                            )}

                            {/* Normal bot/user messages */}
                            {!msg.type &&
                                msg.text &&
                                msg.text.split("\n").map((line, idx) => (
                                    <p key={idx} className="leading-snug">
                                        {line}
                                    </p>
                                ))}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="w-full max-w-3xl p-3 border-t flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    className="flex-1 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                    onClick={handleSend}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                >
                    Send
                </button>
            </div>
        </div>
    );
}
