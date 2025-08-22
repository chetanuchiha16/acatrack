import React, { useState, useEffect } from "react";
import axios from "axios";
import API_BASE from "./config";

export default function MentorSendEmails({ mentorId = 3 }) {
  // States for student list
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Everyone email states
  const [subjectAll, setSubjectAll] = useState("");
  const [messageAll, setMessageAll] = useState("");
  const [feedbackAll, setFeedbackAll] = useState({ text: "", type: "" });

  // Individual email states
  const [usn, setUsn] = useState("");
  const [subjectInd, setSubjectInd] = useState("");
  const [messageInd, setMessageInd] = useState("");
  const [feedbackInd, setFeedbackInd] = useState({ text: "", type: "" });

  // Messages history
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // ---------------- Fetch Students ----------------
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axios.get(`${API_BASE}/mentor/${mentorId}/students`);
        setStudents(res.data.students || []);
      } catch (err) {
        console.error("Failed to fetch mentor students", err);
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [mentorId]);

  // ---------------- Fetch Messages ----------------
  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API_BASE}/mentor/${mentorId}/messages`);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [mentorId]);

  // ---------------- Send Emails ----------------
  const sendEmailToAll = async (recipientType) => {
    if (!subjectAll.trim() || !messageAll.trim()) {
      setFeedbackAll({ text: "Subject and message are required.", type: "error" });
      return;
    }
    try {
      await axios.post(`${API_BASE}/mentor/${mentorId}/send-email/all`, {
        recipientType,
        subject: subjectAll,
        message: messageAll,
      });
      setFeedbackAll({ text: `Email sent to all ${recipientType}s successfully!`, type: "success" });
      fetchMessages(); // refresh history
    } catch (err) {
      setFeedbackAll({ text: `Failed to send email to ${recipientType}s.`, type: "error" });
      console.error(err);
    }
  };

  const sendEmailToIndividual = async (recipientType) => {
    if (!usn) {
      setFeedbackInd({ text: "Please select a student USN.", type: "error" });
      return;
    }
    if (!subjectInd.trim() || !messageInd.trim()) {
      setFeedbackInd({ text: "Subject and message are required.", type: "error" });
      return;
    }
    try {
      await axios.post(`${API_BASE}/mentor/${mentorId}/send-email/student`, {
        usn,
        recipientType,
        subject: subjectInd,
        message: messageInd,
      });
      setFeedbackInd({
        text: `Email sent to ${recipientType} (${usn}) successfully!`,
        type: "success",
      });
      fetchMessages(); // refresh history
    } catch (err) {
      setFeedbackInd({ text: `Failed to send email to ${recipientType} (${usn})`, type: "error" });
      console.error(err);
    }
  };

  // ---------------- Delete Message ----------------
  const deleteMessage = async (msgId) => {
    try {
      await axios.delete(`${API_BASE}/mentor/${mentorId}/messages/${msgId}`);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error("Failed to delete message", err);
    }
  };

  // ---------------- Render ----------------
  return (
    <div className="max-w-7xl mx-auto p-6 mt-10">
      <div className="flex flex-col md:flex-row gap-10">
        {/* Left: Email to All */}
        <section className="flex-1 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-6">Send Email to All</h2>
          <label className="block mb-2 font-medium">Subject</label>
          <input
            type="text"
            value={subjectAll}
            onChange={(e) => setSubjectAll(e.target.value)}
            placeholder="Enter email subject"
            className="w-full mb-4 px-4 py-2 border rounded-md"
          />
          <label className="block mb-2 font-medium">Message</label>
          <textarea
            value={messageAll}
            onChange={(e) => setMessageAll(e.target.value)}
            placeholder="Enter your message..."
            rows={7}
            className="w-full mb-4 px-4 py-2 border rounded-md"
          />
          <div className="flex gap-4">
            <button
              onClick={() => sendEmailToAll("student")}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700"
            >
              Email All Students
            </button>
            <button
              onClick={() => sendEmailToAll("parent")}
              className="flex-1 bg-yellow-600 text-white py-3 rounded-md hover:bg-yellow-700"
            >
              Email All Parents
            </button>
          </div>
          {feedbackAll.text && (
            <p
              className={`mt-4 p-3 rounded-md text-center ${
                feedbackAll.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {feedbackAll.text}
            </p>
          )}
        </section>

        {/* Right: Email Individual */}
        <section className="flex-1 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-6">Send Email to Individual</h2>
          {loadingStudents ? (
            <p>Loading students...</p>
          ) : (
            <>
              <label className="block mb-2 font-medium">Select Student (USN)</label>
              <select
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                className="w-full mb-4 px-4 py-2 border rounded-md"
              >
                <option value="">-- Select Student --</option>
                {students.map((s) => (
                  <option key={s.usn} value={s.usn}>
                    {s.usn} - {s.name}
                  </option>
                ))}
              </select>

              <label className="block mb-2 font-medium">Subject</label>
              <input
                type="text"
                value={subjectInd}
                onChange={(e) => setSubjectInd(e.target.value)}
                placeholder="Enter subject"
                className="w-full mb-4 px-4 py-2 border rounded-md"
              />

              <label className="block mb-2 font-medium">Message</label>
              <textarea
                value={messageInd}
                onChange={(e) => setMessageInd(e.target.value)}
                placeholder="Enter your message..."
                rows={7}
                className="w-full mb-4 px-4 py-2 border rounded-md"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => sendEmailToIndividual("student")}
                  className="flex-1 bg-green-600 text-white py-3 rounded-md hover:bg-green-700"
                >
                  Email Student
                </button>
                <button
                  onClick={() => sendEmailToIndividual("parent")}
                  className="flex-1 bg-yellow-600 text-white py-3 rounded-md hover:bg-yellow-700"
                >
                  Email Parent
                </button>
              </div>
            </>
          )}

          {feedbackInd.text && (
            <p
              className={`mt-4 p-3 rounded-md text-center ${
                feedbackInd.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {feedbackInd.text}
            </p>
          )}
        </section>
      </div>

      {/* Messages History */}
      <section className="mt-12 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold mb-6">Sent Messages</h2>
        {loadingMessages ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-600">No messages yet.</p>
        ) : (
          <ul className="space-y-4">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className="border rounded-md p-4 flex justify-between items-start"
              >
                <div>
                  <p className="font-semibold">
                    To:{" "}
                    {msg.student_usn
                      ? `${msg.recipient_type} (${msg.student_usn})`
                      : `All ${msg.recipient_type}s`}
                  </p>
                  <p className="text-gray-700">
                    <strong>Subject:</strong> {msg.subject}
                  </p>
                  <p className="text-gray-600 mt-1 whitespace-pre-line">
                    {msg.message}
                  </p>
                </div>
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="ml-4 text-red-600 hover:text-red-800"
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
