import React, { useState, useEffect } from "react";
import axiosInstance from "./axiosInstance";
import API_BASE from "./config";
import type { SentMessage } from "./types";

export default function SendEmails() {
    // Everyone email states
    const [subjectAll, setSubjectAll] = useState("");
    const [messageAll, setMessageAll] = useState("");
    const [feedbackAll, setFeedbackAll] = useState({ text: "", type: "" });

    // Individual email states
    const [usn, setUsn] = useState("");
    const [subjectInd, setSubjectInd] = useState("");
    const [messageInd, setMessageInd] = useState("");
    const [feedbackInd, setFeedbackInd] = useState({ text: "", type: "" });

    // Stored messages
    const [messages, setMessages] = useState<SentMessage[]>([]);

    // fetch messages initially
    useEffect(() => {
        void fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const res = await axiosInstance.get(`${API_BASE}/messages`, {
                withCredentials: true,
            });
            setMessages(res.data);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    const saveMessage = async (data: Partial<SentMessage>) => {
        try {
            await axiosInstance.post(`${API_BASE}/messages`, data, {
                withCredentials: true,
            });
            await fetchMessages(); // refresh after saving
        } catch (err) {
            console.error("Failed to save message", err);
        }
    };

    const deleteMessage = async (id: string | number) => {
        try {
            await axiosInstance.delete(`${API_BASE}/messages/${id}`, {
                withCredentials: true,
            });
            setMessages(messages.filter((m) => m.id !== id));
        } catch (err) {
            console.error("Failed to delete message", err);
        }
    };

    const sendEmailToAllStudents = async () => {
        if (!subjectAll.trim() || !messageAll.trim()) {
            setFeedbackAll({
                text: "Subject and message are required.",
                type: "error",
            });
            return;
        }
        try {
            await axiosInstance.post(`${API_BASE}/send-email/all`, {
                recipientType: "student",
                subject: subjectAll,
                message: messageAll,
            });
            await saveMessage({
                recipientType: "student",
                subject: subjectAll,
                message: messageAll,
            });
            setFeedbackAll({
                text: "Email sent to all students successfully!",
                type: "success",
            });
        } catch (err) {
            setFeedbackAll({
                text: "Failed to send email to all students.",
                type: "error",
            });
            console.error(err);
        }
    };

    const sendEmailToAllParents = async () => {
        if (!subjectAll.trim() || !messageAll.trim()) {
            setFeedbackAll({
                text: "Subject and message are required.",
                type: "error",
            });
            return;
        }
        try {
            await axiosInstance.post(`${API_BASE}/send-email/all`, {
                recipientType: "parent",
                subject: subjectAll,
                message: messageAll,
            });
            await saveMessage({
                recipientType: "parent",
                subject: subjectAll,
                message: messageAll,
            });
            setFeedbackAll({
                text: "Email sent to all parents successfully!",
                type: "success",
            });
        } catch (err) {
            setFeedbackAll({
                text: "Failed to send email to all parents.",
                type: "error",
            });
            console.error(err);
        }
    };

    const sendEmailToStudent = async () => {
        if (!usn.trim()) {
            setFeedbackInd({
                text: "Please enter a valid USN.",
                type: "error",
            });
            return;
        }
        if (!subjectInd.trim() || !messageInd.trim()) {
            setFeedbackInd({
                text: "Subject and message are required.",
                type: "error",
            });
            return;
        }
        try {
            await axiosInstance.post(`${API_BASE}/send-email/student`, {
                usn,
                recipientType: "student",
                subject: subjectInd,
                message: messageInd,
            });
            await saveMessage({
                usn,
                recipientType: "student",
                subject: subjectInd,
                message: messageInd,
            });
            setFeedbackInd({
                text: `Email sent to student with USN: ${usn}`,
                type: "success",
            });
        } catch (err) {
            setFeedbackInd({
                text: `Failed to send email to student with USN: ${usn}`,
                type: "error",
            });
            console.error(err);
        }
    };

    const sendEmailToParent = async () => {
        if (!usn.trim()) {
            setFeedbackInd({
                text: "Please enter a valid USN.",
                type: "error",
            });
            return;
        }
        if (!subjectInd.trim() || !messageInd.trim()) {
            setFeedbackInd({
                text: "Subject and message are required.",
                type: "error",
            });
            return;
        }
        try {
            await axiosInstance.post(`${API_BASE}/send-email/student`, {
                usn,
                recipientType: "parent",
                subject: subjectInd,
                message: messageInd,
            });
            await saveMessage({
                usn,
                recipientType: "parent",
                subject: subjectInd,
                message: messageInd,
            });
            setFeedbackInd({
                text: `Email sent to parent of student with USN: ${usn}`,
                type: "success",
            });
        } catch (err) {
            setFeedbackInd({
                text: `Failed to send email to parent of student with USN: ${usn}`,
                type: "error",
            });
            console.error(err);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-10 shadow-2xl mt-10">
            <div className="flex flex-col md:flex-row gap-10">
                {/* Left: Email to Everyone */}
                <section className="flex-1 rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold mb-6">
                        Send Email to Everyone
                    </h2>

                    <label className="block mb-2 font-medium">Subject</label>
                    <input
                        type="text"
                        placeholder="Enter email subject"
                        value={subjectAll}
                        onChange={(e) => setSubjectAll(e.target.value)}
                        className="w-full mb-4 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />

                    <label className="block mb-2 font-medium">Message</label>
                    <textarea
                        placeholder="Enter your message here..."
                        value={messageAll}
                        onChange={(e) => setMessageAll(e.target.value)}
                        rows={7}
                        className="w-full mb-4 px-4 py-2 border rounded-md resize-y h-70 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />

                    <div className="flex gap-4">
                        <button
                            onClick={sendEmailToAllStudents}
                            className="flex-1 bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 transition"
                        >
                            Send Email to All Students
                        </button>

                        <button
                            onClick={sendEmailToAllParents}
                            className="flex-1 bg-yellow-600 text-white py-3 rounded-md hover:bg-yellow-700 transition"
                        >
                            Send Email to All Parents
                        </button>
                    </div>

                    {feedbackAll.text && (
                        <div
                            className={`mt-6 p-4 rounded-md text-center font-medium ${
                                feedbackAll.type === "success"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                            }`}
                            role="alert"
                        >
                            {feedbackAll.text}
                        </div>
                    )}
                </section>

                {/* Right: Email to Individual Student */}
                <section className="flex-1 rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold mb-6">
                        Send Email to Individual Student
                    </h2>

                    <label className="block mb-2 font-medium">USN</label>
                    <input
                        type="text"
                        placeholder="Enter USN"
                        value={usn}
                        onChange={(e) => setUsn(e.target.value)}
                        className="w-full mb-4 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />

                    <label className="block mb-2 font-medium">Subject</label>
                    <input
                        type="text"
                        placeholder="Enter email subject"
                        value={subjectInd}
                        onChange={(e) => setSubjectInd(e.target.value)}
                        className="w-full mb-4 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />

                    <label className="block mb-2 font-medium">Message</label>
                    <textarea
                        placeholder="Enter your message here..."
                        value={messageInd}
                        onChange={(e) => setMessageInd(e.target.value)}
                        rows={7}
                        className="w-full mb-4 px-4 py-2 border rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />

                    <div className="flex gap-4">
                        <button
                            onClick={sendEmailToStudent}
                            className="flex-1 bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition"
                        >
                            Send Email to Student
                        </button>

                        <button
                            onClick={sendEmailToParent}
                            className="flex-1 bg-yellow-600 text-white py-3 rounded-md hover:bg-yellow-700 transition"
                        >
                            Send Email to Parent
                        </button>
                    </div>

                    {feedbackInd.text && (
                        <div
                            className={`mt-6 p-4 rounded-md text-center font-medium ${
                                feedbackInd.type === "success"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                            }`}
                            role="alert"
                        >
                            {feedbackInd.text}
                        </div>
                    )}
                </section>
            </div>

            {/* Message Manager Section */}
            <section className="rounded-lg p-6">
                <h2 className="text-2xl font-semibold mb-6">Message Manager</h2>
                {messages.length === 0 ? (
                    <p className="text-gray-500">No messages yet.</p>
                ) : (
                    <ul className="space-y-4">
                        {messages.map((msg) => (
                            <li
                                key={msg.id}
                                className="border p-4 rounded-lg flex justify-between items-start"
                            >
                                <div>
                                    <h3 className="font-semibold">
                                        {msg.subject}
                                    </h3>
                                    <p className="text-gray-700">
                                        {msg.message}
                                    </p>
                                    <span className="text-xs text-gray-500">
                                        To: {msg.recipientType}{" "}
                                        {msg.usn ? `(USN: ${msg.usn})` : ""}
                                    </span>
                                </div>
                                <button
                                    onClick={() => deleteMessage(msg.id)}
                                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
