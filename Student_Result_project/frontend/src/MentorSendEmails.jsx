import React, { useEffect, useState } from "react";
import axios from "axios";
import API_BASE from "./config";

export default function MentorSendEmails({ mentorId }) {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState({});
    const [studentMessages, setStudentMessages] = useState({});
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [feedback, setFeedback] = useState({ text: "", type: "" });
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (mentorId) {
            fetchStudents();
            fetchMessages();
        }
    }, [mentorId]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `${API_BASE}/mentor/${mentorId}/students`
            );
            setStudents(res.data.students || []);
        } catch (err) {
            console.error("Failed to fetch students", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await axios.get(
                `${API_BASE}/mentor/${mentorId}/messages`
            );
            const grouped = {};
            res.data.forEach((msg) => {
                const usn = msg.student_usn || "all";
                if (!grouped[usn]) grouped[usn] = [];
                grouped[usn].push(msg);
            });
            setStudentMessages(grouped);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            setLoadingMessages(false);
        }
    };

    const toggleExpand = (usn) => {
        setExpanded((prev) => ({ ...prev, [usn]: !prev[usn] }));
    };

    const sendEmail = async (recipientType, usn, subject, message) => {
        if (!subject.trim() || !message.trim()) {
            setFeedback({
                text: "Subject and message are required.",
                type: "error",
            });
            return;
        }

        try {
            // Always store message first
            const stored = await axios.post(
                `${API_BASE}/mentor/${mentorId}/messages`,
                {
                    usn,
                    recipientType,
                    subject,
                    message,
                }
            );

            setStudentMessages((prev) => {
                const key = usn || "all";
                return {
                    ...prev,
                    [key]: [stored.data, ...(prev[key] || [])],
                };
            });

            let emailRes;
            if (usn) {
                emailRes = await axios.post(
                    `${API_BASE}/mentor/${mentorId}/send-email/student`,
                    {
                        usn,
                        recipientType,
                        subject,
                        message,
                    }
                );
            } else {
                emailRes = await axios.post(
                    `${API_BASE}/mentor/${mentorId}/send-email/all`,
                    {
                        recipientType,
                        subject,
                        message,
                    }
                );
            }

            if (emailRes.status >= 200 && emailRes.status < 300) {
                setFeedback({
                    text: `Email sent to ${
                        usn || "all"
                    } ${recipientType}(s) successfully!`,
                    type: "success",
                });
            } else {
                throw new Error("Email failed");
            }
        } catch (err) {
            console.error("Email sending failed", err);
            setFeedback({
                text: `Message stored but email failed for ${
                    usn || "all"
                } ${recipientType}(s).`,
                type: "error",
            });

            // Mark the latest stored message as "failed"
            setStudentMessages((prev) => {
                const key = usn || "all";
                const updated = [...(prev[key] || [])];
                if (updated.length > 0) {
                    updated[0] = { ...updated[0], email_failed: true };
                }
                return { ...prev, [key]: updated };
            });
        }
    };

    const deleteMessage = async (msgId, usn) => {
        try {
            await axios.delete(
                `${API_BASE}/mentor/${mentorId}/messages/${msgId}`
            );
            setStudentMessages((prev) => {
                const key = usn || "all";
                return {
                    ...prev,
                    [key]: prev[key].filter((m) => m.id !== msgId),
                };
            });
        } catch (err) {
            console.error("Failed to delete message", err);
        }
    };

    // Filter students by name or USN (case-insensitive)
    const filteredStudents = students.filter(
        (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.usn.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-bold mb-4">Mentor Email Panel</h2>

            {feedback.text && (
                <p
                    className={`p-2 rounded text-center ${
                        feedback.type === "success"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                    }`}
                >
                    {feedback.text}
                </p>
            )}

            {/* Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT: Broadcast Section */}
                <div className="border rounded p-4 shadow space-y-3">
                    <h2 className="text-xl font-semibold">Broadcast to All</h2>
                    <input
                        type="text"
                        placeholder="Subject"
                        className="border px-3 py-2 w-full rounded"
                        id="subject-all"
                    />
                    <textarea
                        placeholder="Message..."
                        rows={3}
                        className="border px-3 py-2 w-full rounded"
                        id="msg-all"
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={() =>
                                sendEmail(
                                    "student",
                                    null,
                                    document.getElementById("subject-all").value,
                                    document.getElementById("msg-all").value
                                )
                            }
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                        >
                            Email All Students
                        </button>
                        <button
                            onClick={() =>
                                sendEmail(
                                    "parent",
                                    null,
                                    document.getElementById("subject-all").value,
                                    document.getElementById("msg-all").value
                                )
                            }
                            className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                        >
                            Email All Parents
                        </button>
                    </div>

                    {/* All Messages */}
                    <div>
                        <h3 className="font-medium mt-4 mb-2">
                            Broadcast History
                        </h3>
                        {loadingMessages ? (
                            <p>Loading...</p>
                        ) : !studentMessages["all"] ||
                          studentMessages["all"].length === 0 ? (
                            <p className="text-gray-500">
                                No broadcast messages yet.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {studentMessages["all"].map((msg) => (
                                    <li
                                        key={msg.id}
                                        className="border rounded p-2 flex justify-between"
                                    >
                                        <div>
                                            <p className="text-sm">
                                                <strong>{msg.subject}</strong>{" "}
                                                {msg.email_failed && (
                                                    <span className="text-red-600 ml-2">
                                                        (Email Failed)
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-gray-700 text-sm whitespace-pre-line">
                                                {msg.message}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() =>
                                                deleteMessage(msg.id, null)
                                            }
                                            className="ml-2 text-red-600 hover:text-red-800 text-sm"
                                        >
                                            Delete
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* RIGHT: Student List */}
                <div>
                    {/* Search bar */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search students by name or USN..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border px-3 py-2 w-full rounded"
                        />
                    </div>

                    <h2 className="text-xl font-semibold mb-4">Students</h2>
                    {loading ? (
                        <p>Loading students...</p>
                    ) : filteredStudents.length === 0 ? (
                        <p>No students match your search.</p>
                    ) : (
                        <div className="space-y-4">
                            {filteredStudents.map((s) => (
                                <div
                                    key={s.usn}
                                    className="border rounded p-4 shadow hover:shadow-lg transition"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">
                                                {s.name}
                                            </p>
                                            <p className="text-gray-600">
                                                USN: {s.usn}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => toggleExpand(s.usn)}
                                            className="text-sm text-gray-800 bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
                                        >
                                            {expanded[s.usn] ? "Hide" : "Show"}
                                        </button>
                                    </div>

                                    {expanded[s.usn] && (
                                        <div className="mt-4 space-y-4">
                                            {/* Individual Form */}
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Subject"
                                                    className="border px-3 py-2 w-full rounded"
                                                    id={`subject-${s.usn}`}
                                                />
                                                <textarea
                                                    placeholder="Message..."
                                                    rows={3}
                                                    className="border px-3 py-2 w-full rounded"
                                                    id={`msg-${s.usn}`}
                                                />
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() =>
                                                            sendEmail(
                                                                "student",
                                                                s.usn,
                                                                document.getElementById(
                                                                    `subject-${s.usn}`
                                                                ).value,
                                                                document.getElementById(
                                                                    `msg-${s.usn}`
                                                                ).value
                                                            )
                                                        }
                                                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                                    >
                                                        Email Student
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            sendEmail(
                                                                "parent",
                                                                s.usn,
                                                                document.getElementById(
                                                                    `subject-${s.usn}`
                                                                ).value,
                                                                document.getElementById(
                                                                    `msg-${s.usn}`
                                                                ).value
                                                            )
                                                        }
                                                        className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                                                    >
                                                        Email Parent
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Student History */}
                                            <div>
                                                <h3 className="font-medium mb-2">
                                                    Messages
                                                </h3>
                                                {loadingMessages ? (
                                                    <p>Loading...</p>
                                                ) : !studentMessages[s.usn] ||
                                                  studentMessages[s.usn]
                                                      .length === 0 ? (
                                                    <p className="text-gray-500">
                                                        No messages yet.
                                                    </p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {studentMessages[
                                                            s.usn
                                                        ].map((msg) => (
                                                            <li
                                                                key={msg.id}
                                                                className="border rounded p-2 flex justify-between"
                                                            >
                                                                <div>
                                                                    <p className="text-sm">
                                                                        <strong>
                                                                            {
                                                                                msg.subject
                                                                            }
                                                                        </strong>{" "}
                                                                        {msg.email_failed && (
                                                                            <span className="text-red-600 ml-2">
                                                                                (Email
                                                                                Failed)
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    <p className="text-gray-700 text-sm whitespace-pre-line">
                                                                        {
                                                                            msg.message
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={() =>
                                                                        deleteMessage(
                                                                            msg.id,
                                                                            s.usn
                                                                        )
                                                                    }
                                                                    className="ml-2 text-red-600 hover:text-red-800 text-sm"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
