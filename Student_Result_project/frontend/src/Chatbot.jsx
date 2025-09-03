import React, { useState, useEffect, useRef } from "react";
import API_BASE from "./config";
import LogoutButton from "./LogoutButton";
import Confetti from "react-confetti";


export default function ChatBot() {
    const [messages, setMessages] = useState([
        { sender: "bot", text: "👋 Welcome to JssTrack360 ChatBot🤖! You can type a student's name or 'list' to see all students." }
    ]);
    const [input, setInput] = useState("");
    const [listening, setListening] = useState(false);
    const [introPlayed, setIntroPlayed] = useState(false);
    const [recognitionRef, setRecognitionRef] = useState(null);
    const messagesEndRef = useRef(null);

    const [openSemesters, setOpenSemesters] = useState({});
    const [openBacklogs, setOpenBacklogs] = useState({});
    const [openAlphabet, setOpenAlphabet] = useState({});
    //new confetti
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- SPEECH FUNCTION ---
    const speak = (text, callback = null) => {
        if (!text) return;
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1;
        if (callback) utter.onend = callback;
        window.speechSynthesis.speak(utter);
    };

    // --- VOICE INTRO & LISTENING ---
    const startVoiceFlow = () => {
        if (!introPlayed) {
            const introText = "🙏Welcome to JSSTrack360 🎓, and I'm here to help you with your ward's report. Please tell me your ward's name to get the full report.📖";
            setMessages(prev => [...prev, { sender: "bot", text: introText }]);
            setIntroPlayed(true);
            speak(introText, startListening);
        } else {
            startListening();
        }
    };

    const startListening = () => {
        if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
            alert("Speech Recognition not supported");
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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

            setMessages(prev => [...prev, { sender: "user", text: `You said: ${transcript}` }]);
            handleSend(transcript);
        };

        recognition.onerror = (e) => { console.error(e.error); setListening(false); };
        recognition.onend = () => setListening(false);
    };

    const stopListening = () => {
        if (recognitionRef) recognitionRef.stop();
        setListening(false);
    };

    // --- FETCH STUDENTS ---
    const fetchStudents = async () => {
        try {
            const res = await fetch(`${API_BASE}/students`);
            const data = await res.json();
            if (data.students) {
                setMessages(prev => [...prev, { sender: "bot", type: "students", data: data.students }]);
                speak("Here is the list of students.");
            }
        } catch {
            setMessages(prev => [...prev, { sender: "bot", text: "❌ Error fetching students" }]);
            speak("Sorry, I could not fetch the students.");
        }
    };

    // --- FETCH REPORT ---
    const fetchReport = async (name) => {
        try {
            const res = await fetch(`${API_BASE}/report/${encodeURIComponent(name)}`);
            const data = await res.json();

            if (data.error) {
                setMessages(prev => [...prev, { sender: "bot", text: data.error }]);
                speak(data.error);
                return;
            }
            if (totalBacklogCredits === 0) {
                speechText += "No backlogs. Excellent!";
                setShowConfetti(true);

                // stop after 2 seconds
                setTimeout(() => setShowConfetti(false), 2000);
            }

            // Add report, semesters, backlogs, downloads
            setMessages(prev => [...prev,
            { sender: "bot", type: "header", text: `📄 Report for ${data.student_name}` },
            { sender: "bot", type: "semesters", data: data.semester_results },
            { sender: "bot", type: "backlogs", data: data.backlogs, totalCredits: data.total_backlog_credits },
            {
                sender: "bot", type: "downloads", downloadUrls: {
                    full: `${API_BASE}/report/${encodeURIComponent(data.student_name)}/pdf?type=full`,
                    backlog: `${API_BASE}/report/${encodeURIComponent(data.student_name)}/pdf?type=backlog`
                }
            },
            { sender: "bot", type: "thank", text: "The reports have been generated successfully. Thank you for using JssTrack360 chatbot. Have a great day!!" }
            ]);

            // Speak once for report + backlog
            let speechText = `Here is the report for ${data.student_name}. `;
            const totalBacklogCredits = data.total_backlog_credits;
            if (totalBacklogCredits === 0) speechText += "No backlogs. Excellent!";
            else if (totalBacklogCredits > 18) speechText += `⚠️ Backlog credits exceed 18. Risk of year back.`;
            else speechText += `Some backlogs are present. Total credits: ${totalBacklogCredits}.`;
            speechText += " The reports have been generated successfully. Thank you for using JssTrack360 chatbot. Have a great day!!";
            speak(speechText);

        } catch {
            setMessages(prev => [...prev, { sender: "bot", text: "❌ Error fetching report" }]);
            speak("Sorry, there was an error fetching the report.");
        }
    };

    // --- HANDLE USER INPUT ---
    const handleSend = (msgText = null) => {
        const text = msgText || input.trim();
        if (!text) return;

        if (!msgText) setMessages(prev => [...prev, { sender: "user", text: `You said: ${text}` }]);
        setInput("");

        const lcText = text.toLowerCase();
        if (lcText === "list") {
            speak("Fetching all students...");
            fetchStudents();
        } else {
            speak(`Fetching report for ${text}...`);
            fetchReport(text);
        }
    };

    // --- COLLAPSIBLE HANDLERS ---
    const toggleSemester = (sem) => setOpenSemesters(prev => ({ ...prev, [sem]: !prev[sem] }));
    const toggleBacklog = (sem) => setOpenBacklogs(prev => ({ ...prev, [sem]: !prev[sem] }));
    const toggleAlphabet = (letter) => setOpenAlphabet(prev => ({ ...prev, [letter]: !prev[letter] }));

    // --- DOWNLOAD SECTION COMPONENT ---
    const DownloadSection = ({ downloadUrls }) => (
        <div className="flex gap-2 mt-2">
            <a href={downloadUrls.full} target="_blank" className="bg-blue-500 px-3 py-1 rounded text-white hover:bg-blue-600 transition-transform transform hover:scale-105">Download Full Report🔽</a>
            <a href={downloadUrls.backlog} target="_blank" className="bg-red-500 px-3 py-1 rounded text-white hover:bg-red-600 transition-transform transform hover:scale-105">Download Backlog Report🔽</a>
        </div>
    );

    return (
        <div className="flex flex-col items-center w-full h-screen">
            {showConfetti && <Confetti width={window.innerWidth} height={window.innerHeight} />}
            <div className="flex justify-between w-full max-w-3xl p-2 shadow-sm">
                <h1 className="font-semibold text-lg">🎓 Student Result Chatbot</h1>
                <LogoutButton />
            </div>

            <div className="flex flex-col flex-1 w-full max-w-3xl overflow-y-auto px-3 py-4 space-y-3">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`rounded-2xl px-4 py-2 shadow-md max-w-[85%] whitespace-pre-line transition-all duration-300 ${msg.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-800 text-white"}`}>
                            {/* Normal messages */}
                            {!msg.type && msg.text && msg.text.split("\n").map((line, idx) => <p key={idx}>{line}</p>)}

                            {/* Report header */}
                            {msg.type === "header" && <h3 className="font-bold mb-2 text-lg">{msg.text}</h3>}

                            {/* Download links */}
                            {msg.type === "downloads" && <DownloadSection downloadUrls={msg.downloadUrls} />}

                            {/* Thank note */}
                            {msg.type === "thank" && <p className="mt-2 font-semibold text-white">{msg.text}</p>}

                            {/* Student List */}
                            {msg.type === "students" && (
                                <div className="mt-2">
                                    {Object.entries(
                                        msg.data.reduce((acc, name) => {
                                            const letter = name.charAt(0).toUpperCase();
                                            if (!acc[letter]) acc[letter] = [];
                                            acc[letter].push(name);
                                            return acc;
                                        }, {})
                                    ).map(([letter, names]) => (
                                        <div key={letter} className="mb-2">
                                            <button
                                                onClick={() => toggleAlphabet(letter)}
                                                className="w-full text-left bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mb-1 transition-transform transform hover:scale-105"
                                            >
                                                {letter} {openAlphabet[letter] ? "▲" : "▼"}
                                            </button>
                                            {openAlphabet[letter] && (
                                                <div className="grid grid-cols-4 gap-2 p-2 bg-gray-100 rounded">
                                                    {names.map((s, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={() => fetchReport(s)}
                                                            className="cursor-pointer border border-gray-300 rounded px-2 py-1 text-sm text-gray-700 bg-white hover:bg-blue-100 shadow transition-transform transform hover:scale-105"
                                                        >
                                                            {s}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Semesters */}
                            {msg.type === "semesters" && Object.entries(msg.data).map(([sem, subjects]) => (
                                <div key={sem} className="mb-2">
                                    <button onClick={() => toggleSemester(sem)} className="w-full text-left bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 mb-1 transition-transform transform hover:scale-105">
                                        {sem} {openSemesters[sem] ? "▲" : "▼"}
                                    </button>
                                    {openSemesters[sem] && (
                                        <table className="table-auto border-collapse border border-gray-500 w-full text-sm mb-2">
                                            <thead>
                                                <tr className="bg-blue-300">
                                                    <th className="border border-gray-400 px-3 py-2">Subject</th>
                                                    <th className="border border-gray-400 px-3 py-2">Internal</th>
                                                    <th className="border border-gray-400 px-3 py-2">External</th>
                                                    <th className="border border-gray-400 px-3 py-2">Total</th>
                                                    <th className="border border-gray-400 px-3 py-2">Credits</th>
                                                    <th className="border border-gray-400 px-3 py-2">Result</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {subjects.map((sub, idx) => {
                                                    const internal = sub.internal ?? 0;
                                                    const external = sub.external ?? 0;
                                                    const result = (internal >= 18 && external >= 18) || external === 0 ? "Pass" : "Fail";
                                                    return (
                                                        <tr key={idx} className={result === "Fail" ? "bg-red-200" : ""}>
                                                            <td className="border border-gray-400 px-3 py-2">{sub.subject}</td>
                                                            <td className="border border-gray-400 px-3 py-2">{internal}</td>
                                                            <td className="border border-gray-400 px-3 py-2">{external}</td>
                                                            <td className="border border-gray-400 px-3 py-2">{sub.total ?? "-"}</td>
                                                            <td className="border border-gray-400 px-3 py-2">{sub.credits}</td>
                                                            <td className="border border-gray-400 px-3 py-2">{result}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ))}

                            {/* Backlogs */}
                            {msg.type === "backlogs" && (
                                <div className="mt-2">
                                    <h4 className="font-semibold underline">Backlogs</h4>
                                    {msg.totalCredits === 0 ? (
                                        <p className="font-bold text-green-600">✅ No backlogs</p>
                                    ) : (
                                        <>
                                            {msg.totalCredits > 18 && <p className="text-red-600 font-bold">⚠️ Backlog credits exceed 18. Risk of year back</p>}
                                            {Object.entries(msg.data).map(([sem, subjects]) => (
                                                <div key={sem} className="mb-2">
                                                    <button onClick={() => toggleBacklog(sem)} className="w-full text-left bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 mb-1 transition-transform transform hover:scale-105">
                                                        {sem} {openBacklogs[sem] ? "▲" : "▼"}
                                                    </button>
                                                    {openBacklogs[sem] && (
                                                        <table className="table-auto border-collapse border border-gray-500 w-full text-sm mb-2">
                                                            <thead>
                                                                <tr className="bg-red-300">
                                                                    <th className="border border-gray-400 px-3 py-2">Subject</th>
                                                                    <th className="border border-gray-400 px-3 py-2">Internal</th>
                                                                    <th className="border border-gray-400 px-3 py-2">External</th>
                                                                    <th className="border border-gray-400 px-3 py-2">Credits</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {subjects.map((sub, idx) => (
                                                                    <tr key={idx}>
                                                                        <td className="border border-gray-400 px-3 py-2">{sub.subject}</td>
                                                                        <td className="border border-gray-400 px-3 py-2">{sub.internal}</td>
                                                                        <td className="border border-gray-400 px-3 py-2">{sub.external}</td>
                                                                        <td className="border border-gray-400 px-3 py-2">{sub.credits}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            ))}
                                            <p><b>Total Backlog Credits:</b> {msg.totalCredits}</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input + Buttons */}
            <div className="w-full max-w-3xl p-3 border-t flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Type a message..."
                    className="flex-1 border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                    onClick={() => handleSend()}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-transform transform hover:scale-105"
                >
                    Send
                </button>
                {/* Voice button + listening indicator inline */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={startVoiceFlow}
                        className={`px-4 py-2 rounded-xl ${listening ? "bg-red-500" : "bg-green-500"} text-white`}
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
