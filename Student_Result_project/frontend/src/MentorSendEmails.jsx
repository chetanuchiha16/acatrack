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

    // Controlled inputs
    const [broadcastSubject, setBroadcastSubject] = useState("");
    const [broadcastMsg, setBroadcastMsg] = useState("");
    const [studentInputs, setStudentInputs] = useState({});
    console.log(studentMessages);
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
            const stored = await axios.post(
                `${API_BASE}/mentor/${mentorId}/messages`,
                { usn, recipientType, subject, message }
            );

            setStudentMessages((prev) => {
                const key = usn || "all";
                const newMsg = {
                    ...stored.data,
                    read_status:
                        stored.data.read_status?.map((s) => ({
                            ...s,
                            read: false,
                        })) || [],
                };
                console.log(newMsg);
                return {
                    ...prev,
                    [key]: [newMsg, ...(prev[key] || [])],
                };
            });

            let emailRes;
            if (usn) {
                emailRes = await axios.post(
                    `${API_BASE}/mentor/${mentorId}/send-email/student`,
                    { usn, recipientType, subject, message }
                );
            } else {
                emailRes = await axios.post(
                    `${API_BASE}/mentor/${mentorId}/send-email/all`,
                    { recipientType, subject, message }
                );
            }

            if (emailRes.status >= 200 && emailRes.status < 300) {
                setFeedback({
                    text: `Email sent to ${
                        usn || "all"
                    } ${recipientType}(s) successfully!`,
                    type: "success",
                });

                // Clear input after success
                if (usn) {
                    setStudentInputs((prev) => ({
                        ...prev,
                        [usn]: { subject: "", message: "" },
                    }));
                } else {
                    setBroadcastSubject("");
                    setBroadcastMsg("");
                }
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

    const filteredStudents = students.filter(
        (s) =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.usn.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 ">
            <h2 className="text-2xl font-bold text-center">
                Mentor Email Panel
            </h2>

            {feedback.text && (
                <p
                    className={`p-3 rounded-xl text-center ${
                        feedback.type === "success"
                            ? "bg-green-100/70 text-green-900 backdrop-blur-md"
                            : "bg-red-100/70 text-red-900 backdrop-blur-md"
                    }`}
                >
                    {feedback.text}
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Broadcast */}
                <div className="rounded-2xl p-6 shadow-xl border border-white/20 bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg space-y-3">
                    <h2 className="text-xl font-semibold mb-[-4]">Broadcast to All</h2>
                    <input
                        type="text"
                        placeholder="Subject"
                        value={broadcastSubject}
                        onChange={(e) => setBroadcastSubject(e.target.value)}
                        className="border px-3 py-2 w-full rounded bg-white/50 dark:bg-gray-900/50 backdrop-blur-md"
                    />
                    <textarea
                        placeholder="Message..."
                        rows={3}
                        value={broadcastMsg}
                        onChange={(e) => setBroadcastMsg(e.target.value)}
                        className="border px-3 py-2 w-full rounded bg-white/50 dark:bg-gray-900/50 backdrop-blur-md"
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={() =>
                                sendEmail(
                                    "student",
                                    null,
                                    broadcastSubject,
                                    broadcastMsg
                                )
                            }
                            className="bg-green-600 text-white px-4 py-2 rounded-xl shadow hover:bg-green-700 transition"
                        >
                            Email All Students
                        </button>
                        <button
                            onClick={() =>
                                sendEmail(
                                    "parent",
                                    null,
                                    broadcastSubject,
                                    broadcastMsg
                                )
                            }
                            className="bg-yellow-600 text-white px-4 py-2 rounded-xl shadow hover:bg-yellow-700 transition"
                        >
                            Email All Parents
                        </button>
                    </div>

                    {/* History */}
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
                                {studentMessages["all"].map((msg) => {
                                    const total = msg.read_status?.length || 0;
                                    const readCount = msg.read_status
                                        ? msg.read_status.filter((s) => s.read)
                                              .length
                                        : 0;
                                    return (
                                        <li
                                            key={msg.id}
                                            className="border rounded-xl p-3 flex justify-between items-center bg-white/40 dark:bg-gray-900/40 backdrop-blur-md"
                                        >
                                            <div>
                                                <p className="text-sm font-semibold">
                                                    {msg.subject}{" "}
                                                    {msg.email_failed && (
                                                        <span className="text-red-600 ml-2">
                                                            (Email Failed)
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
                                                    {msg.message}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Seen by {readCount}/{total}{" "}
                                                    students
                                                </p>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    deleteMessage(msg.id, null)
                                                }
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                Delete
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Student List */}
                <div>
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search students by name or USN..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border px-3 py-2 w-full rounded bg-white/50 dark:bg-gray-900/50 backdrop-blur-md"
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
                                    className="rounded-2xl p-4 shadow-lg border border-white/20 bg-white/40 dark:bg-gray-800/40 backdrop-blur-lg transition"
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">
                                                {s.name}
                                            </p>
                                            <p className="text-gray-600 dark:text-gray-400">
                                                USN: {s.usn}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => toggleExpand(s.usn)}
                                            className="text-sm text-gray-800 dark:text-gray-200 bg-gray-200/60 dark:bg-gray-700/60 px-3 py-1 rounded-xl hover:bg-gray-300/60 dark:hover:bg-gray-600/60"
                                        >
                                            {expanded[s.usn] ? "Hide" : "Show"}
                                        </button>
                                    </div>

                                    {expanded[s.usn] && (
                                        <div className="mt-4 space-y-4">
                                            {/* Form */}
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    placeholder="Subject"
                                                    value={
                                                        studentInputs[s.usn]
                                                            ?.subject || ""
                                                    }
                                                    onChange={(e) =>
                                                        setStudentInputs(
                                                            (prev) => ({
                                                                ...prev,
                                                                [s.usn]: {
                                                                    ...(prev[
                                                                        s.usn
                                                                    ] || {}),
                                                                    subject:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            })
                                                        )
                                                    }
                                                    className="border px-3 py-2 w-full rounded bg-white/50 dark:bg-gray-900/50 backdrop-blur-md"
                                                />
                                                <textarea
                                                    placeholder="Message..."
                                                    rows={3}
                                                    value={
                                                        studentInputs[s.usn]
                                                            ?.message || ""
                                                    }
                                                    onChange={(e) =>
                                                        setStudentInputs(
                                                            (prev) => ({
                                                                ...prev,
                                                                [s.usn]: {
                                                                    ...(prev[
                                                                        s.usn
                                                                    ] || {}),
                                                                    message:
                                                                        e.target
                                                                            .value,
                                                                },
                                                            })
                                                        )
                                                    }
                                                    className="border px-3 py-2 w-full rounded bg-white/50 dark:bg-gray-900/50 backdrop-blur-md"
                                                />
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() =>
                                                            sendEmail(
                                                                "student",
                                                                s.usn,
                                                                studentInputs[
                                                                    s.usn
                                                                ]?.subject ||
                                                                    "",
                                                                studentInputs[
                                                                    s.usn
                                                                ]?.message || ""
                                                            )
                                                        }
                                                        className="bg-green-600 text-white px-4 py-2 rounded-xl shadow hover:bg-green-700"
                                                    >
                                                        Email Student
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            sendEmail(
                                                                "parent",
                                                                s.usn,
                                                                studentInputs[
                                                                    s.usn
                                                                ]?.subject ||
                                                                    "",
                                                                studentInputs[
                                                                    s.usn
                                                                ]?.message || ""
                                                            )
                                                        }
                                                        className="bg-yellow-600 text-white px-4 py-2 rounded-xl shadow hover:bg-yellow-700"
                                                    >
                                                        Email Parent
                                                    </button>
                                                </div>
                                            </div>

                                            {/* History */}
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
                                                        ].map((msg) => {
                                                            const status =
                                                                msg.read_status?.find(
                                                                    ({usn}) =>
                                                                        usn ===
                                                                        s.usn
                                                                );
                                                            return (
                                                                <li
                                                                    key={msg.id}
                                                                    className="border rounded-xl p-3 flex justify-between items-center bg-white/40 dark:bg-gray-900/40 backdrop-blur-md"
                                                                >
                                                                    <div>
                                                                        <p className="text-sm font-semibold">
                                                                            {
                                                                                msg.subject
                                                                            }{" "}
                                                                            {msg.email_failed && (
                                                                                <span className="text-red-600 ml-2">
                                                                                    (Email
                                                                                    Failed)
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                        <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
                                                                            {
                                                                                msg.message
                                                                            }
                                                                        </p>
                                                                        <p className="text-xs text-gray-500">
                                                                            {status
                                                                                ? status.read
                                                                                    ? "✅ Read"
                                                                                    : "📩 Unread"
                                                                                : "📩 Unread"}
                                                                        </p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() =>
                                                                            deleteMessage(
                                                                                msg.id,
                                                                                s.usn
                                                                            )
                                                                        }
                                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </li>
                                                            );
                                                        })}
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
