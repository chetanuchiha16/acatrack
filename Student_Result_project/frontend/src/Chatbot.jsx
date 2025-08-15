import React, { useState, useEffect, useRef } from "react";
import "./ChatBot.css"; // We'll style it like WhatsApp
import API_BASE from "./config";
import LogoutButton from "./LogoutButton";
export default function ChatBot() {
    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "👋 Welcome to Student Result Chatbot! \nPlease type your ward's name [along with initials] or say 'list' to see all students.",
        },
    ]);
    const [input, setInput] = useState("");
    const [students, setStudents] = useState([]);
    const messagesEndRef = useRef(null);

    // Scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Fetch student list when requested
    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_BASE}/students`);
            const data = await res.json();
            if (data.students) {
                setStudents(data.students);
                setMessages((prev) => [
                    ...prev,
                    {
                        sender: "bot",
                        text: "📋 Students: " + data.students.join(", "),
                    },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { sender: "bot", text: "⚠️ Unable to fetch students." },
                ]);
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "❌ Error fetching student list." },
            ]);
        }
    };

    // Fetch report for a student
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
            } else {
                const summaryText = Object.entries(data.summary)
                    .map(([sem, val]) =>
                        sem !== "CGPA"
                            ? `${sem}: ${val.percentage}% (SGPA: ${val.sgpa})`
                            : `🎓 CGPA: ${val}`
                    )
                    .join("\n");
                setMessages((prev) => [
                    ...prev,
                    {
                        sender: "bot",
                        text: `📄 Report for ${data.student_name}:\n${summaryText}`,
                    },
                    {
                        sender: "bot",
                        text: "Download your report here:",
                        isDownload: true,
                        downloadUrl: `${API_BASE}/report/${encodeURIComponent(
                            data.student_name
                        )}/pdf`,
                    },
                ]);
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "❌ Error fetching report." },
            ]);
        }
    };

    // Handle sending a message
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
        <div className="chat-container md:w-[500px]">
            <LogoutButton/>
            <div className="chat-box m-l-[50%]">
                {messages.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.sender}`}>
                        <div className="message-bubble">
                            {msg.isDownload ? (
                                <button
                                    className="download-btn"
                                    onClick={() => {
                                        // Trigger browser download
                                        const link =
                                            document.createElement("a");
                                        link.href = msg.downloadUrl;
                                        link.download = ""; // Use filename from server header
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                >
                                    📥 Download Report Pdf
                                </button>
                            ) : (
                                msg.text
                                    .split("\n")
                                    .map((line, idx) => <p key={idx}>{line}</p>)
                            )}
                        </div>
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <button onClick={handleSend}>Send</button>
            </div>
        </div>
    );
}
