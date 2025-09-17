import React, { useState, useEffect, useRef } from "react";
import API_BASE from "./config";
import Confetti from "react-confetti";
import {
    detectIntent,
    extractStudentName,
    extractSemester,
    isBacklogRequest,
    isAiSummaryRequest,
} from "./nlp";
// import React, { useState } from react;
import { HelpCircle } from "lucide-react";
import HelpCard from "./helpcard";

export default function ChatBot() {
    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "👋 Welcome to JssTrack360 ChatBot🤖! You can type a student's name or 'list' to see all students.",
        },
    ]);
    const [input, setInput] = useState("");
    const [listening, setListening] = useState(false);
    const [introPlayed, setIntroPlayed] = useState(false);
    const [recognitionRef, setRecognitionRef] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);
    const messagesEndRef = useRef(null);
    const [openSemesters, setOpenSemesters] = useState({});
    const [openBacklogs, setOpenBacklogs] = useState({});
    const [openAlphabet, setOpenAlphabet] = useState({});

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const speak = (text, callback = null) => {
        if (!text) return;
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        if (callback) utter.onend = callback;
        window.speechSynthesis.speak(utter);
    };

    const startVoiceFlow = () => {
        if (!introPlayed) {
            const introText =
                "🙏 Welcome to JSSTrack360 🎓. Please tell me your ward's name to get the full report. 📖";
            const speechText =
                "Welcome to JSSTrack360. Please tell me your ward's name to get the full report.";
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: introText },
            ]);
            setIntroPlayed(true);
            speak(speechText, startListening);
        } else {
            startListening();
        }
    };

    const startListening = () => {
        if (
            !(
                "webkitSpeechRecognition" in window ||
                "SpeechRecognition" in window
            )
        ) {
            alert("Speech Recognition not supported");
            return;
        }
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "en-US";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.start();
        setListening(true);
        setRecognitionRef(recognition);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            setListening(false);

            // Show user message
            setMessages((prev) => [
                ...prev,
                { sender: "user", text: `You said: ${transcript}` },
            ]);

            // Process via NLP
            handleSend(transcript);
        };

        recognition.onerror = (e) => {
            console.error(e.error);
            setListening(false);
        };
        recognition.onend = () => setListening(false);
    };

    const stopListening = () => {
        if (recognitionRef) recognitionRef.stop();
        setListening(false);
    };

    const [students, setStudents] = useState([]);
    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_BASE}/students`, {
                credentials: "include",
            });
            const data = await res.json();
            if (data.students) {
                setStudents(data.students.map((s) => s.student_name)); // store only names for suggestions
                setMessages((prev) => [
                    ...prev,
                    { sender: "bot", type: "students", data: data.students },
                ]);
                speak("Here is the list of students.");
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "❌ Error fetching students" },
            ]);
            speak("Sorry, I could not fetch the students.");
        }
    };

    useEffect(() => {
        const fetchAllStudents = async () => {
            try {
                const res = await fetch(`${API_BASE}/students`, {
                    credentials: "include",
                });
                const data = await res.json();
                if (data.students) {
                    setStudents(data.students.map((s) => s.student_name)); // for auto-suggestions
                }
            } catch (err) {
                console.error("Error fetching students:", err);
            }
        };
        fetchAllStudents();
    }, []);

    const [disambiguationOptions, setDisambiguationOptions] = useState([]);

    const fetchReport = async (
        name,
        semester = null,
        intent = "fetch_report"
    ) => {
        try {
            let url = `${API_BASE}/report/${encodeURIComponent(name)}`;
            if (semester) url += `?semester=${encodeURIComponent(semester)}`;

            const res = await fetch(url, { credentials: "include" });
            const data = await res.json();

            if (data.error) {
                setMessages((prev) => [
                    ...prev,
                    { sender: "bot", text: data.error },
                ]);
                speak(data.error);
                return;
            }

            // Handle disambiguation
            if (data.type === "disambiguation" && data.options?.length > 0) {
                setMessages((prev) => [
                    ...prev,
                    {
                        sender: "bot",
                        text: data.message,
                        options: data.options,
                    },
                ]);
                speak(
                    data.message ||
                        "Multiple students found. Please select from the options displayed."
                );
                return;
            }

            setDisambiguationOptions([]);
            const newMessages = [];

            // -----------------------------
            // AI Insights
            // -----------------------------
            if (intent === "ai_summary") {
                newMessages.push({
                    sender: "bot",
                    type: "header",
                    text: `🤖 AI Insights for ${data.student_name}`,
                });
                newMessages.push({
                    sender: "bot",
                    type: "ai_insights",
                    data: {
                        ai_summary: data.ai_summary,
                        ai_profile: data.ai_profile,
                        trend: data.trend,
                        cgpa_prediction: data.cgpa_prediction,
                    },
                });
                newMessages.push({
                    sender: "bot",
                    type: "thank",
                    text: "✅ AI insights generated!",
                });
                setMessages((prev) => [...prev, ...newMessages]);
                speak(`Here are the AI insights for ${data.student_name}.`);
                return;
            }

            // -----------------------------
            // Backlogs
            // -----------------------------
            if (intent === "check_backlogs") {
                let backlogData = data.backlogs || {};
                let totalCredits = data.total_backlog_credits || 0;

                if (semester) {
                    if (data.backlogs?.[semester]) {
                        backlogData = { [semester]: data.backlogs[semester] };
                        totalCredits =
                            data.backlogs[semester].semester_backlog_credits ||
                            0;
                    } else {
                        backlogData = {};
                        totalCredits = 0;
                    }
                }

                newMessages.push({
                    sender: "bot",
                    type: "backlogs",
                    data: backlogData,
                    total_backlog_credits: totalCredits,
                });

                newMessages.push({
                    sender: "bot",
                    type: "downloads",
                    downloadUrls: {
                        backlog: `${API_BASE}/report/${encodeURIComponent(
                            name
                        )}/pdf?type=backlog${
                            semester
                                ? `&semester=${encodeURIComponent(semester)}`
                                : ""
                        }`,
                    },
                });

                let speechText = `Here is the backlog report for ${
                    data.student_name
                }${semester ? ` (${semester})` : ""}.`;
                if (totalCredits === 0) {
                    speechText += " ✅ No backlogs.";
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 5000);
                } else if (totalCredits > 18) {
                    speechText +=
                        " ⚠️ Backlog credits exceed 18. Risk of year back.";
                } else {
                    speechText += ` Some backlogs are present. Total credits: ${totalCredits}.`;
                }
                speechText +=
                    " Thank you for using JssTrack360 chatbot. Have a great day!";
                speak(speechText);

                // -----------------------------
                // Semester Report
                // -----------------------------
            } else if (intent === "fetch_semester_report") {
                if (semester && data.semesters?.[semester]) {
                    newMessages.push({
                        sender: "bot",
                        type: "semesters",
                        data: { [semester]: data.semesters[semester] },
                    });

                    const semBacklog = data.backlogs?.[semester];
                    const hasFailedSubjects =
                        semBacklog?.failed_subjects?.length > 0;
                    if (hasFailedSubjects) {
                        const totalCredits =
                            semBacklog.semester_backlog_credits || 0;
                        newMessages.push({
                            sender: "bot",
                            type: "backlogs",
                            data: { [semester]: semBacklog },
                            total_backlog_credits: totalCredits,
                        });
                    }

                    const downloadUrls = {
                        semester_report: `${API_BASE}/report/${encodeURIComponent(
                            name
                        )}/pdf?type=semester&semester=${encodeURIComponent(
                            semester
                        )}`,
                    };
                    if (hasFailedSubjects) {
                        downloadUrls.semester_backlog = `${API_BASE}/report/${encodeURIComponent(
                            name
                        )}/pdf?type=backlog&semester=${encodeURIComponent(
                            semester
                        )}`;
                    }

                    newMessages.push({
                        sender: "bot",
                        type: "downloads",
                        downloadUrls,
                    });

                    let speechText = `Here is the report for ${data.student_name} for ${semester}.`;
                    if (hasFailedSubjects) {
                        const totalCredits =
                            semBacklog.semester_backlog_credits || 0;
                        if (totalCredits > 18)
                            speechText +=
                                " ⚠️ Backlog credits exceed 18. Risk of year back.";
                        else
                            speechText += ` Some backlogs are present. Total credits: ${totalCredits}.`;
                    } else {
                        speechText += " ✅ No backlogs.";
                        setShowConfetti(true);
                        setTimeout(() => setShowConfetti(false), 5000);
                    }
                    speechText +=
                        " Thank you for using JssTrack360 chatbot. Have a great day!";
                    speak(speechText);
                } else {
                    newMessages.push({
                        sender: "bot",
                        type: "semesters",
                        data: { [semester]: {} },
                    });
                    speak(
                        `No data found for ${semester} for ${data.student_name}. ✅ No backlogs.`
                    );
                }

                // -----------------------------
                // Full Report
                // -----------------------------
            } else {
                newMessages.push({
                    sender: "bot",
                    type: "semesters",
                    data: data.semesters,
                });

                const flattenedBacklogs = {};
                Object.entries(data.backlogs || {}).forEach(
                    ([sem, semData]) => {
                        flattenedBacklogs[sem] = {
                            ...semData,
                            summary: `${semData.failed_subjects.length} failed subjects, ${semData.semester_backlog_credits} credits`,
                        };
                    }
                );

                newMessages.push({
                    sender: "bot",
                    type: "backlogs",
                    data: flattenedBacklogs,
                    total_backlog_credits: data.total_backlog_credits || 0,
                });

                newMessages.push({
                    sender: "bot",
                    type: "ai_insights",
                    data: {
                        ai_summary: data.ai_summary,
                        ai_profile: data.ai_profile,
                        trend: data.trend,
                        cgpa_prediction: data.cgpa_prediction,
                    },
                });

                newMessages.push({
                    sender: "bot",
                    type: "downloads",
                    downloadUrls: {
                        full: `${API_BASE}/report/${encodeURIComponent(
                            name
                        )}/pdf`,
                        backlog: `${API_BASE}/report/${encodeURIComponent(
                            name
                        )}/pdf?type=backlog`,
                    },
                });

                let speechText = `Here is the full report for ${data.student_name}.`;
                const totalBacklogCredits = data.total_backlog_credits || 0;
                if (totalBacklogCredits === 0) {
                    speechText += "No backlogs.";
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 7000);
                } else if (totalBacklogCredits > 18) {
                    speechText +=
                        " ⚠️ Backlog credits exceed 18. Risk of year back.";
                } else {
                    speechText += ` Some backlogs are present. Total Backlog credits: ${totalBacklogCredits}.`;
                }
                speechText +=
                    " Thank you for using JssTrack360 chatbot. Have a great day!";
                speak(speechText);
            }

            newMessages.push({
                sender: "bot",
                type: "thank",
                text: "✅ Generated! Thank you for using JssTrack360 chatbot.",
            });
            setMessages((prev) => [...prev, ...newMessages]);
        } catch (err) {
            console.error(err);
            setMessages((prev) => [
                ...prev,
                { sender: "bot", text: "❌ Error fetching report" },
            ]);
            speak("Sorry, there was an error fetching the report.");
        }
    };

    const [pendingStudent, setPendingStudent] = useState(null);

    const handleSend = (msgText = null) => {
        const text = msgText || input.trim();
        if (!text) return;

        if (!msgText)
            setMessages((prev) => [
                ...prev,
                { sender: "user", text: `You said: ${text}` },
            ]);
        setInput("");

        // Clear old disambiguation options
        setDisambiguationOptions([]);

        // Detect intent
        let intent = detectIntent(text);

        // NLP overrides for robust intent detection
        if (isBacklogRequest(text)) intent = "check_backlogs";
        if (isAiSummaryRequest(text)) intent = "ai_summary";

        // Extract student name and optional semester
        const studentName = extractStudentName(text, students);
        const semester = extractSemester(text);

        // Adjust intent for semester-specific requests
        if (intent === "fetch_report" && semester) {
            intent = "fetch_semester_report";
        }

        // -----------------------------
        // Handle AI summary first (independent of semester)
        // -----------------------------
        if (intent === "ai_summary") {
            if (studentName) {
                speak(`Fetching AI summary for ${studentName}...`);
                // setMessages(prev => [...prev, { sender: "bot", text: `Fetching AI summary for ${studentName}...` }]);
                fetchReport(studentName, null, "ai_summary"); // Always null for semester
            } else {
                speak("Please provide a student name to see AI summary.");
                setMessages((prev) => [
                    ...prev,
                    {
                        sender: "bot",
                        text: "Please provide a student name to see AI summary.",
                    },
                ]);
            }
            return; // Important: prevent fallback logic from running
        }

        // -----------------------------
        // Switch case for other intents
        // -----------------------------
        switch (intent) {
            case "list_students":
                speak("Fetching all students...");
                fetchStudents();
                break;

            case "fetch_report":
                if (studentName) {
                    speak(`Fetching full report for ${studentName}...`);
                    fetchReport(studentName, null, "fetch_report");
                } else {
                    speak("Please provide a valid student name.");
                    setMessages((prev) => [
                        ...prev,
                        {
                            sender: "bot",
                            text: "Please provide a valid student name.",
                        },
                    ]);
                }
                break;

            case "fetch_semester_report":
                if (studentName && semester) {
                    speak(`Fetching ${semester} report for ${studentName}...`);
                    fetchReport(studentName, semester, "fetch_semester_report");
                } else if (!studentName) {
                    speak("Please provide a valid student name.");
                    setMessages((prev) => [
                        ...prev,
                        {
                            sender: "bot",
                            text: "Please provide a valid student name.",
                        },
                    ]);
                } else {
                    speak("Please provide a semester to fetch the report for.");
                    setMessages((prev) => [
                        ...prev,
                        {
                            sender: "bot",
                            text: "Please provide a semester to fetch the report for.",
                        },
                    ]);
                }
                break;

            case "check_backlogs":
                if (studentName) {
                    if (semester) {
                        speak(
                            `Fetching backlog report for ${studentName} in ${semester}...`
                        );
                        fetchReport(studentName, semester, "check_backlogs");
                    } else {
                        speak(`Fetching backlog report for ${studentName}...`);
                        fetchReport(studentName, null, "check_backlogs");
                    }
                } else {
                    speak("Please provide a student name to check backlogs.");
                    setMessages((prev) => [
                        ...prev,
                        {
                            sender: "bot",
                            text: "Please provide a student name to check backlogs.",
                        },
                    ]);
                }
                break;

            case "download_pdf":
                if (studentName) {
                    speak(`Preparing download links for ${studentName}...`);
                    fetchReport(studentName, semester, "download_pdf");
                } else {
                    speak(
                        "Please provide the student name to download the report."
                    );
                    setMessages((prev) => [
                        ...prev,
                        {
                            sender: "bot",
                            text: "Please provide the student name to download the report.",
                        },
                    ]);
                }
                break;

            default:
                // Fallback logic: full or semester report
                if (studentName) {
                    if (semester) {
                        speak(
                            `Fetching ${semester} report for ${studentName}...`
                        );
                        fetchReport(
                            studentName,
                            semester,
                            "fetch_semester_report"
                        );
                    } else {
                        speak(`Fetching full report for ${studentName}...`);
                        fetchReport(studentName, null, "fetch_report");
                    }
                } else {
                    speak(
                        "Sorry, I did not understand that. You can type 'list' to see all students."
                    );
                    setMessages((prev) => [
                        ...prev,
                        {
                            sender: "bot",
                            text: "❌ Sorry, I did not understand that. You can type 'list' to see all students.",
                        },
                    ]);
                }
                break;
        }
    };

    const toggleSemester = (sem) =>
        setOpenSemesters((prev) => ({ ...prev, [sem]: !prev[sem] }));
    const toggleBacklog = (sem) =>
        setOpenBacklogs((prev) => ({ ...prev, [sem]: !prev[sem] }));
    const toggleAlphabet = (letter) =>
        setOpenAlphabet((prev) => ({ ...prev, [letter]: !prev[letter] }));

    const DownloadSection = ({ downloadUrls }) => (
        <div className="flex gap-2 mt-2 flex-wrap">
            {downloadUrls.full && (
                <a
                    href={downloadUrls.full}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 text-white px-3 py-1 rounded 
           hover:bg-blue-600 
           transition-all duration-200 ease-in-out 
           transform hover:scale-105 active:scale-95
           shadow hover:shadow-lg">
                    Download Full Report 🔽
                </a>
            )}
            {downloadUrls.backlog && (
                <a
                    href={downloadUrls.backlog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-500 text-white px-3 py-1 rounded 
           hover:bg-red-600 
           transition-all duration-200 ease-in-out 
           transform hover:scale-105 active:scale-95
           shadow hover:shadow-lg">
                    Download Backlog Report 🔽
                </a>
            )}
            {downloadUrls.semester_report && (
                <a
                    href={downloadUrls.semester_report}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 px-3 py-1 rounded text-white 
           hover:bg-blue-600 hover:shadow-lg 
           transition-all duration-200 ease-in-out 
           transform hover:scale-105 active:scale-95">
                    Download Semester Report 🔽
                </a>
            )}
            {downloadUrls.semester_backlog && (
                <a
                    href={downloadUrls.semester_backlog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-red-500 px-3 py-1 rounded text-white 
           hover:bg-red-600 hover:shadow-lg 
           transition-all duration-200 ease-in-out 
           transform hover:scale-105 active:scale-95"
                >
                    Download Semester Backlog 🔽
                </a>
            )}
        </div>
    );

    const [suggestions, setSuggestions] = useState([]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setInput(value);

        if (value.length > 0) {
            const matches = students.filter(
                (name) => name.toLowerCase().startsWith(value.toLowerCase()) // only match names starting with input
            );
            setSuggestions(matches.slice(0, 5)); // show only top 5 matches
        } else {
            setSuggestions([]);
        }
    };

    const [showHelp, setShowHelp] = useState(false);
    const helpRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (helpRef.current && !helpRef.current.contains(event.target)) {
                setShowHelp(false);
            }
        };

        if (showHelp) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showHelp]);

    return (
        <div className="flex flex-col items-center w-full h-screen">
            {showConfetti && (
                <Confetti
                    width={window.innerWidth}
                    height={window.innerHeight}
                />
            )}

            <div className="flex items-center justify-between w-full max-w-3xl p-2 shadow-sm">
                <div className="w-1/3"></div>
                <h1 className="w-1/3 text-center font-semibold text-lg">
                    🎓 Student Result Chatbot
                </h1>
                <div className="w-1/3 flex justify-end">
                    <button
                        onClick={() => {
                            window.speechSynthesis.cancel();
                            const currentPath = window.location.pathname;
                            const newPath = currentPath.replace(
                                /\/ChatBot$/,
                                ""
                            );
                            window.location.href = newPath;
                        }}
                        className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-900 transition-transform transform hover:scale-105"
                    >
                        ⬅ Back
                    </button>
                </div>
            </div>
            {/* Help button fixed at top-right */}
            <div ref={helpRef} className="fixed top-4 right-4 z-50">
                <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="px-3 py-2 bg-purple-500 text-white rounded-xl shadow-lg hover:bg-purple-600 transition-transform transform hover:scale-105"
                >
                    Help❓
                </button>

                {/* Show Help card when toggled */}
                {showHelp && (
                    <div className="absolute right-0 mt-2 w-72  border rounded-xl shadow-lg p-4">
                        <HelpCard />
                    </div>
                )}
            </div>

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
                            className={`rounded-2xl px-4 py-2 shadow-md max-w-[85%] whitespace-pre-line transition-all duration-300 ${
                                msg.sender === "user"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-800 text-white"
                            }`}
                        >
                            {!msg.type &&
                                msg.text &&
                                msg.text
                                    .split("\n")
                                    .map((line, idx) => (
                                        <p key={idx}>{line}</p>
                                    ))}
                            {msg.type === "header" && (
                                <h3 className="font-bold mb-2 text-lg">
                                    {msg.text}
                                </h3>
                            )}
                            {msg.type === "downloads" && (
                                <DownloadSection
                                    downloadUrls={msg.downloadUrls}
                                />
                            )}
                            {msg.type === "thank" && (
                                <p className="mt-2 font-semibold text-white">
                                    {msg.text}
                                </p>
                            )}

                            {/* Students list rendering */}
                            {msg.type === "students" && (
                                <div className="mt-2">
                                    {Object.entries(
                                        msg.data.reduce((acc, student) => {
                                            const letter = student.student_name
                                                .charAt(0)
                                                .toUpperCase();
                                            if (!acc[letter]) acc[letter] = [];
                                            acc[letter].push(
                                                student.student_name
                                            );
                                            return acc;
                                        }, {})
                                    )
                                        .sort(([a], [b]) => a.localeCompare(b)) // Sort letters A-Z
                                        .map(([letter, names]) => (
                                            <div key={letter} className="mb-2">
                                                <button
                                                    onClick={() =>
                                                        toggleAlphabet(letter)
                                                    }
                                                    className="w-full text-left bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mb-1 transition-transform transform hover:scale-105"
                                                >
                                                    {letter}{" "}
                                                    {openAlphabet[letter]
                                                        ? "▲"
                                                        : "▼"}
                                                </button>
                                                {openAlphabet[letter] && (
                                                    <div className="grid grid-cols-4 gap-2 p-2  rounded">
                                                        {names
                                                            .sort((a, b) =>
                                                                a.localeCompare(
                                                                    b
                                                                )
                                                            )
                                                            .map(
                                                                (
                                                                    s,
                                                                    idx // Sort names A-Z
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        onClick={() =>
                                                                            fetchReport(
                                                                                s
                                                                            )
                                                                        }
                                                                        className="cursor-pointer border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 dark:text-white hover:bg-blue-100 dark:hover:text-black shadow transition-transform transform hover:scale-105"
                                                                    >
                                                                        {s}
                                                                    </div>
                                                                )
                                                            )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}

                            {/* Disambiguation options rendering */}
                            {msg.options && msg.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {msg.options.map((name, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => fetchReport(name)}
                                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-transform transform hover:scale-105"
                                        >
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {msg.type === "semesters" &&
                                Object.entries(msg.data).map(([sem, data]) => (
                                    <div key={sem} className="mb-2">
                                        {/* Semester toggle button */}
                                        <button
                                            onClick={() => toggleSemester(sem)}
                                            className="w-full text-left bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mb-1 transition-transform transform hover:scale-105"
                                        >
                                            {sem}{" "}
                                            {openSemesters[sem] ? "▲" : "▼"}
                                        </button>

                                        {openSemesters[sem] && (
                                            <>
                                                {/* Subjects Table */}
                                                <table className="table-auto border-collapse border  w-full text-sm mb-2">
                                                    <thead>
                                                        <tr className="bg-blue-300  border">
                                                            <th className="border  px-3 py-2">
                                                                Subject
                                                            </th>
                                                            <th className="border  px-3 py-2">
                                                                Internal
                                                            </th>
                                                            <th className="border  px-3 py-2">
                                                                External
                                                            </th>
                                                            <th className="border  px-3 py-2">
                                                                Total
                                                            </th>
                                                            <th className="border  px-3 py-2">
                                                                Credits
                                                            </th>
                                                            <th className="border  px-3 py-2">
                                                                Result
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className=" border">
                                                        {data.subject_names.map(
                                                            (subject, idx) => {
                                                                const internal =
                                                                    data
                                                                        .ia_marks[
                                                                        idx
                                                                    ] ?? 0;
                                                                const external =
                                                                    data
                                                                        .see_marks[
                                                                        idx
                                                                    ] ?? 0;
                                                                const total =
                                                                    internal +
                                                                    external;
                                                                const credits =
                                                                    data
                                                                        .credits[
                                                                        idx
                                                                    ] ?? 0;
                                                                const result =
                                                                    data
                                                                        .pass_fail[
                                                                        idx
                                                                    ] ?? "Pass";
                                                                return (
                                                                    <tr
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className={
                                                                            result ===
                                                                            "Fail"
                                                                                ? "bg-red-200"
                                                                                : ""
                                                                        }
                                                                    >
                                                                        <td className="border  px-3 py-2">
                                                                            {
                                                                                subject
                                                                            }{" "}
                                                                            (
                                                                            {
                                                                                data
                                                                                    .subject_codes[
                                                                                    idx
                                                                                ]
                                                                            }
                                                                            )
                                                                        </td>
                                                                        <td className="border  px-3 py-2">
                                                                            {
                                                                                internal
                                                                            }
                                                                        </td>
                                                                        <td className="border  px-3 py-2">
                                                                            {
                                                                                external
                                                                            }
                                                                        </td>
                                                                        <td className="border  px-3 py-2">
                                                                            {
                                                                                total
                                                                            }
                                                                        </td>
                                                                        <td className="border  px-3 py-2">
                                                                            {
                                                                                credits
                                                                            }
                                                                        </td>
                                                                        <td className="border  px-3 py-2">
                                                                            {
                                                                                result
                                                                            }
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                        )}
                                                    </tbody>
                                                </table>

                                                {/* Dynamic Download Buttons */}
                                                {msg.downloadUrls && (
                                                    <DownloadSection
                                                        downloadUrls={Object.fromEntries(
                                                            Object.entries(
                                                                msg.downloadUrls
                                                            ).filter(
                                                                ([key, url]) =>
                                                                    url
                                                            ) // Only include URLs that exist
                                                        )}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                ))}

                            {msg.type === "backlogs" && (
                                <div className="mt-2">
                                    <h4 className="font-semibold underline">
                                        Backlogs
                                    </h4>

                                    {msg.total_backlog_credits === 0 ? (
                                        <p className="font-bold text-green-600 mt-2">
                                            ✅ No backlogs
                                        </p>
                                    ) : (
                                        <>
                                            {msg.total_backlog_credits > 18 && (
                                                <p className="text-red-600 font-bold mt-2">
                                                    ⚠️ Backlog credits exceed
                                                    18. Risk of year back
                                                </p>
                                            )}

                                            {Object.entries(msg.data).map(
                                                ([sem, semData]) => (
                                                    <div
                                                        key={sem}
                                                        className="mb-4"
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                toggleBacklog(
                                                                    sem
                                                                )
                                                            }
                                                            className="w-full text-left bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 mb-1 transition-transform transform hover:scale-105"
                                                        >
                                                            {sem}{" "}
                                                            {openBacklogs[sem]
                                                                ? "▲"
                                                                : "▼"}
                                                        </button>

                                                        {openBacklogs[sem] && (
                                                            <div className="pl-2">
                                                                <h5 className="font-semibold mb-1">
                                                                    {sem}
                                                                </h5>

                                                                {semData
                                                                    .failed_subjects
                                                                    .length ===
                                                                0 ? (
                                                                    <p className="px-3 py-2 font-bold text-green-600 mb-2">
                                                                        ✅ No
                                                                        backlogs
                                                                        for{" "}
                                                                        {sem}
                                                                    </p>
                                                                ) : (
                                                                    <table className="table-auto border-collapse border border-gray-500 w-full text-sm mb-2">
                                                                        <thead>
                                                                            <tr className="bg-red-300">
                                                                                <th className="border  px-3 py-2">
                                                                                    Subject
                                                                                </th>
                                                                                <th className="border  px-3 py-2">
                                                                                    Internal
                                                                                </th>
                                                                                <th className="border  px-3 py-2">
                                                                                    External
                                                                                </th>
                                                                                <th className="border  px-3 py-2">
                                                                                    Credits
                                                                                </th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {semData.failed_subjects.map(
                                                                                (
                                                                                    s,
                                                                                    idx
                                                                                ) => (
                                                                                    <tr
                                                                                        key={
                                                                                            idx
                                                                                        }
                                                                                    >
                                                                                        <td className="border  px-3 py-2">
                                                                                            {
                                                                                                s.subject
                                                                                            }
                                                                                        </td>
                                                                                        <td className="border  px-3 py-2">
                                                                                            {
                                                                                                s.internal
                                                                                            }
                                                                                        </td>
                                                                                        <td className="border  px-3 py-2">
                                                                                            {
                                                                                                s.external
                                                                                            }
                                                                                        </td>
                                                                                        <td className="border  px-3 py-2">
                                                                                            {
                                                                                                s.credits
                                                                                            }
                                                                                        </td>
                                                                                    </tr>
                                                                                )
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            )}

                                            <p className="font-semibold mt-2">
                                                <b>Total Backlog Credits:</b>{" "}
                                                {msg.total_backlog_credits}
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}

                            {msg.type === "ai_insights" && (
                                <div className="p-2 rounded mb-2">
                                    <button
                                        onClick={() =>
                                            setOpenSemesters((prev) => ({
                                                ...prev,
                                                ai: !prev.ai,
                                            }))
                                        }
                                        className="w-full text-left bg-white/10 backdrop-blur-md 
           text-purple-300 px-3 py-2 rounded 
           hover:bg-white/15 hover:border hover:border-purple-400 
           transition-all duration-200 ease-in-out transform hover:scale-105"
                                    >
                                        ✨ AI Insights{" "}
                                        {openSemesters.ai ? "▲" : "▼"}
                                    </button>

                                    {openSemesters.ai && (
                                        <div className="mt-3 space-y-4 bg-gray-50 dark:bg-[#2a3447] p-4 rounded-lg shadow-inner text-gray-800 dark:text-gray-200">
                                            {/* AI Summary */}
                                            <div className="bg-white dark:bg-[#2a3447] p-4 rounded-lg shadow mt-4">
                                                <h4 className="font-semibold text-purple-300 mb-2">
                                                    🧠 AI Summary
                                                </h4>

                                                {msg.data.ai_summary ? (
                                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                                        {/* Student Name */}
                                                        <div className="bg-gray-100 dark:bg-[#38455c] text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                                            <span className="font-semibold">
                                                                Student:
                                                            </span>{" "}
                                                            {
                                                                msg.data
                                                                    .ai_summary
                                                                    .student_name
                                                            }
                                                        </div>

                                                        {/* USN */}
                                                        <div className="bg-gray-100 dark:bg-[#38455c] text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                                            <span className="font-semibold">
                                                                USN:
                                                            </span>{" "}
                                                            {
                                                                msg.data
                                                                    .ai_summary
                                                                    .usn
                                                            }
                                                        </div>

                                                        {/* Semester */}
                                                        <div className="bg-gray-100 dark:bg-[#38455c] text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                                            <span className="font-semibold">
                                                                Current
                                                                Semester:
                                                            </span>{" "}
                                                            {
                                                                msg.data
                                                                    .ai_summary
                                                                    .semester
                                                            }
                                                        </div>

                                                        {/* Total Marks */}
                                                        <div className="bg-gray-100 dark:bg-[#38455c] text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                                            <span className="font-semibold">
                                                                Marks:
                                                            </span>{" "}
                                                            {
                                                                msg.data
                                                                    .ai_summary
                                                                    .total_marks
                                                            }
                                                        </div>

                                                        {/* Percentage */}
                                                        <div className="bg-gray-100 dark:bg-[#38455c] text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                                            <span className="font-semibold">
                                                                Percentage:
                                                            </span>{" "}
                                                            {
                                                                msg.data
                                                                    .ai_summary
                                                                    .percentage
                                                            }
                                                        </div>

                                                        {/* Obtained Credits */}
                                                        <div className="bg-gray-100 dark:bg-[#38455c] text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                                            <span className="font-semibold">
                                                                Obtained
                                                                Credits:
                                                            </span>{" "}
                                                            {
                                                                msg.data
                                                                    .ai_summary
                                                                    .obtained_credits
                                                            }
                                                        </div>

                                                        {/* SGPA */}
                                                        <div className="bg-gray-100 dark:bg-[#38455c] text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                                            <span className="font-semibold">
                                                                SGPA:
                                                            </span>{" "}
                                                            {
                                                                msg.data
                                                                    .ai_summary
                                                                    .sgpa
                                                            }
                                                        </div>

                                                        {/* CGPA */}
                                                        <div className="bg-gray-100 dark:bg-[#38455c] text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                                                            <span className="font-semibold">
                                                                CGPA:
                                                            </span>{" "}
                                                            {
                                                                msg.data
                                                                    .ai_summary
                                                                    .cgpa
                                                            }
                                                        </div>

                                                        {/* Backlog Status */}
                                                        <div
                                                            className={`col-span-2 px-2 py-1 rounded font-semibold text-center ${
                                                                msg.data.ai_summary.backlog_status.includes(
                                                                    "No backlogs"
                                                                )
                                                                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                                                    : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                                            }`}
                                                        >
                                                            {
                                                                msg.data
                                                                    .ai_summary
                                                                    .backlog_status
                                                            }
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p>No summary available</p>
                                                )}
                                            </div>

                                            {/* AI Profile */}
                                            <div className="bg-white dark:bg-[#2a3447] p-3 rounded-lg shadow space-y-2">
                                                <h4 className="font-semibold text-purple-300">
                                                    📊 AI Profile
                                                </h4>

                                                {/* Subject-level Strengths & Weaknesses */}
                                                <div className="mt-4">
                                                    <b>
                                                        📌 Subject-level
                                                        Strengths & Weaknesses:
                                                    </b>
                                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                                        {/* Strengths */}
                                                        {(
                                                            msg.data.ai_profile
                                                                ?.latest_strong_subjects ||
                                                            []
                                                        ).length > 0 ? (
                                                            msg.data.ai_profile.latest_strong_subjects.map(
                                                                (subj, i) => (
                                                                    <div
                                                                        key={`strong-${i}`}
                                                                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded text-sm"
                                                                    >
                                                                        {subj}
                                                                    </div>
                                                                )
                                                            )
                                                        ) : (
                                                            <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded text-sm">
                                                                None
                                                            </div>
                                                        )}

                                                        {/* Weaknesses */}
                                                        {(
                                                            msg.data.ai_profile
                                                                ?.latest_weak_subjects ||
                                                            []
                                                        ).length > 0 ? (
                                                            msg.data.ai_profile.latest_weak_subjects.map(
                                                                (subj, i) => (
                                                                    <div
                                                                        key={`weak-${i}`}
                                                                        className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded text-sm"
                                                                    >
                                                                        {subj}
                                                                    </div>
                                                                )
                                                            )
                                                        ) : (
                                                            <div className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded text-sm">
                                                                None
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Tag-level Strengths & Weaknesses */}
                                                <div className="mt-4">
                                                    <b>
                                                        📚 Tag-level Strengths &
                                                        Weaknesses:
                                                    </b>
                                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                                        {/* Strong Tags */}
                                                        {(
                                                            msg.data.ai_profile
                                                                ?.strong_tags ||
                                                            []
                                                        ).length > 0 ? (
                                                            msg.data.ai_profile.strong_tags.map(
                                                                (tag, i) => (
                                                                    <div
                                                                        key={`tag-strong-${i}`}
                                                                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded text-sm"
                                                                    >
                                                                        {tag}
                                                                    </div>
                                                                )
                                                            )
                                                        ) : (
                                                            <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded text-sm">
                                                                None
                                                            </div>
                                                        )}

                                                        {/* Moderate Tags */}
                                                        {(
                                                            msg.data.ai_profile
                                                                ?.mid_tags || []
                                                        ).length > 0 ? (
                                                            msg.data.ai_profile.mid_tags.map(
                                                                (tag, i) => (
                                                                    <div
                                                                        key={`tag-mid-${i}`}
                                                                        className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded text-sm"
                                                                    >
                                                                        {tag}
                                                                    </div>
                                                                )
                                                            )
                                                        ) : (
                                                            <div className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded text-sm">
                                                                None
                                                            </div>
                                                        )}

                                                        {/* Weak Tags */}
                                                        {(
                                                            msg.data.ai_profile
                                                                ?.weak_tags ||
                                                            []
                                                        ).length > 0 ? (
                                                            msg.data.ai_profile.weak_tags.map(
                                                                (tag, i) => (
                                                                    <div
                                                                        key={`tag-weak-${i}`}
                                                                        className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded text-sm"
                                                                    >
                                                                        {tag}
                                                                    </div>
                                                                )
                                                            )
                                                        ) : (
                                                            <div className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded text-sm">
                                                                None
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Subject Averages */}
                                                {msg.data.ai_profile
                                                    ?.tag_avgs && (
                                                    <div>
                                                        <b>
                                                            📚 Subject Area
                                                            Averages:
                                                        </b>
                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                            {Object.entries(
                                                                msg.data
                                                                    .ai_profile
                                                                    .tag_avgs
                                                            ).map(
                                                                (
                                                                    [tag, avg],
                                                                    i
                                                                ) => (
                                                                    <div
                                                                        key={i}
                                                                        className="bg-gray-100 dark:bg-[#38455c] px-2 py-1 rounded text-sm"
                                                                    >
                                                                        {tag}:{" "}
                                                                        <span className="font-semibold">
                                                                            {avg.toFixed(
                                                                                2
                                                                            )}
                                                                            %
                                                                        </span>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Learning Plan */}
                                                {msg.data.ai_profile
                                                    ?.learning_plan?.length >
                                                    0 && (
                                                    <div className="mt-4">
                                                        <b>📝 Learning Plan:</b>
                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                            {msg.data.ai_profile.learning_plan.map(
                                                                (
                                                                    tip,
                                                                    index
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            index
                                                                        }
                                                                        className="bg-gray-100 dark:bg-[#38455c] px-2 py-1 rounded text-sm"
                                                                    >
                                                                        {tip}
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Placement Advice */}
                                                {msg.data.ai_profile
                                                    ?.placement_advice && (
                                                    <div className="mt-4">
                                                        <b>
                                                            🎯 Placement Advice:
                                                        </b>
                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                            {msg.data.ai_profile
                                                                .placement_advice
                                                                .length > 0 ? (
                                                                msg.data.ai_profile.placement_advice.map(
                                                                    (
                                                                        advice,
                                                                        index
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                index
                                                                            }
                                                                            className="bg-gray-100 dark:bg-[#38455c] px-2 py-1 rounded text-sm"
                                                                        >
                                                                            {
                                                                                advice
                                                                            }
                                                                        </div>
                                                                    )
                                                                )
                                                            ) : (
                                                                <div className="bg-gray-100 dark:bg-[#38455c] px-2 py-1 rounded text-sm">
                                                                    None
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Trend Section */}
                                            <div className="bg-white dark:bg-[#2a3447] p-3 rounded-lg shadow mt-4">
                                                <h4 className="font-semibold text-purple-300">
                                                    📈 SGPA Trend
                                                </h4>

                                                {/* Trend & Average SGPA */}
                                                <div className="mt-2 space-y-1">
                                                    <p>
                                                        <b>Trend:</b>{" "}
                                                        {msg.data.trend
                                                            ?.trend || "N/A"}
                                                    </p>
                                                    <p>
                                                        <b>
                                                            Average SGPA (CGPA):
                                                        </b>{" "}
                                                        {msg.data.trend
                                                            ?.avg_sgpa !==
                                                        undefined
                                                            ? Number(
                                                                  msg.data.trend
                                                                      .avg_sgpa
                                                              ).toFixed(2)
                                                            : "N/A"}
                                                    </p>
                                                </div>

                                                {/* Conditional Advice based on Trend */}
                                                {msg.data.trend?.trend && (
                                                    <div className="mt-2">
                                                        {msg.data.trend
                                                            .trend ===
                                                        "Declining" ? (
                                                            <div className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 p-2 rounded">
                                                                ⚠️ SGPA is
                                                                declining —
                                                                identify root
                                                                causes
                                                                (attendance,
                                                                exam prep,
                                                                fundamentals).
                                                                <br />
                                                                📝 Recommended:
                                                                Strengthen
                                                                fundamentals,
                                                                follow
                                                                structured
                                                                weekly study
                                                                plan, seek
                                                                mentoring or
                                                                extra classes.
                                                            </div>
                                                        ) : msg.data.trend
                                                              .trend ===
                                                          "Improving" ? (
                                                            <div className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 p-2 rounded">
                                                                ✅ SGPA is
                                                                improving —
                                                                maintain study
                                                                routine and
                                                                strengthen
                                                                project-based
                                                                learning.
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}

                                                {/* Trend History */}
                                                {msg.data.trend?.history &&
                                                    Object.keys(
                                                        msg.data.trend.history
                                                    ).length > 0 && (
                                                        <div className="mt-3">
                                                            <b>History:</b>
                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                {Object.entries(
                                                                    msg.data
                                                                        .trend
                                                                        .history
                                                                ).map(
                                                                    ([
                                                                        sem,
                                                                        sgpa,
                                                                    ]) => (
                                                                        <div
                                                                            key={
                                                                                sem
                                                                            }
                                                                            className="bg-gray-100 dark:bg-[#38455c] px-2 py-1 rounded text-sm"
                                                                        >
                                                                            {
                                                                                sem
                                                                            }
                                                                            :{" "}
                                                                            <span className="font-semibold">
                                                                                {Number(
                                                                                    sgpa
                                                                                ).toFixed(
                                                                                    2
                                                                                )}
                                                                            </span>
                                                                        </div>
                                                                    )
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                            </div>

                                            {/* Prediction */}
                                            <div className="bg-white dark:bg-[#2a3447] p-3 rounded-lg shadow">
                                                <h4 className="font-semibold text-purple-300">
                                                    🔮 CGPA Prediction
                                                </h4>
                                                <p>
                                                    <b>Predicted Next SGPA:</b>{" "}
                                                    {msg.data.cgpa_prediction
                                                        ?.predicted_next_sgpa ||
                                                        "N/A"}
                                                </p>
                                                <p>
                                                    <b>Predicted Final CGPA:</b>{" "}
                                                    {msg.data.cgpa_prediction
                                                        ?.predicted_final_cgpa ||
                                                        "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef}></div>
            </div>

            {/* Input + Buttons */}
            <div className="w-full max-w-3xl p-3 border-t flex gap-2 items-center">
                <div className="relative flex-1">
                    {/* Suggestions dropdown above input */}
                    {suggestions.length > 0 && (
                        <ul className="absolute left-0 right-0 bottom-full mb-1  border rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                            {suggestions.map((s, idx) => (
                                <li
                                    key={idx}
                                    onClick={() => {
                                        setInput(s); // fill input with selected suggestion
                                        setSuggestions([]); // hide suggestions
                                        // Do NOT call handleSend here
                                    }}
                                    className="px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:text-black"
                                >
                                    {s}
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Single input box */}
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleSend(); // send report using current input
                                setSuggestions([]); // clear suggestions on enter
                            }
                        }}
                        placeholder="Type student name or 'list' to see all"
                        className="w-full border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>

                {/* Send button */}
                <button
                    onClick={() => {
                        handleSend(); // send report using current input
                        setSuggestions([]); // clear suggestions on send
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-transform transform hover:scale-105"
                >
                    Send
                </button>

                {/* Voice button + listening indicator */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={startVoiceFlow}
                        className={`px-4 py-2 rounded-xl text-white ${
                            listening ? "bg-red-500" : "bg-green-500"
                        } transition-colors duration-200`}
                    >
                        {listening ? "🎙️ Listening..." : "🎤 Voice"}
                    </button>

                    {listening && (
                        <div
                            onClick={stopListening}
                            className="flex items-center justify-center w-12 h-12 bg-red-500 rounded-full shadow-md animate-pulse cursor-pointer"
                        >
                            <span className="text-white text-xl">🎙️</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
