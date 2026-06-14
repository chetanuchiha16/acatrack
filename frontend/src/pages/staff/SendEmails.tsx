import React, { useState, useEffect } from "react";
import { 
    Send, 
    Users, 
    Trash2, 
    History, 
    Mail, 
    CheckCircle2, 
    AlertCircle,
    MessageSquare,
    Megaphone,
    Clock,
    User,
    ListTodo,
    Loader2
} from "lucide-react";
import { 
    getMessagesMessagesGet, 
    saveMessageMessagesPost, 
    deleteMessageMessagesMsgIdDelete,
    sendEmailToAllSendEmailAllPost,
    sendEmailToStudentSendEmailStudentPost
} from "../../client/sdk.gen";
import type { SentMessage } from "../../types";

export default function SendEmails() {
    const [viewMode, setViewMode] = useState<"individual" | "broadcast">("broadcast");
    
    // Everyone email states
    const [subjectAll, setSubjectAll] = useState("");
    const [messageAll, setMessageAll] = useState("");
    
    // Individual email states
    const [usn, setUsn] = useState("");
    const [subjectInd, setSubjectInd] = useState("");
    const [messageInd, setMessageInd] = useState("");
    
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ text: string; type: "" | "success" | "error" }>({ text: "", type: "" });

    // Stored messages
    const [messages, setMessages] = useState<SentMessage[]>([]);

    useEffect(() => {
        void fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const res = await getMessagesMessagesGet();
            if (res.data) setMessages(res.data as SentMessage[]);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        }
    };

    const saveMessage = async (data: Partial<SentMessage>) => {
        try {
            await saveMessageMessagesPost({ body: data as SentMessage });
            await fetchMessages();
        } catch (err) {
            console.error("Failed to save message", err);
        }
    };

    const deleteMessage = async (id: string | number) => {
        try {
            await deleteMessageMessagesMsgIdDelete({ path: { msg_id: id as number } });
            setMessages(prev => prev.filter((m) => m.id !== id));
        } catch (err) {
            console.error("Failed to delete message", err);
        }
    };

    const handleSend = async (type: "all" | "individual", recipient: "student" | "parent") => {
        const subject = type === "all" ? subjectAll : subjectInd;
        const message = type === "all" ? messageAll : messageInd;

        if (type === "individual" && !usn.trim()) {
            setFeedback({ text: "Please enter a valid USN.", type: "error" });
            return;
        }
        if (!subject.trim() || !message.trim()) {
            setFeedback({ text: "Subject and message are required.", type: "error" });
            return;
        }

        setLoading(true);
        setFeedback({ text: "", type: "" });

        try {
            if (type === "all") {
                await sendEmailToAllSendEmailAllPost({
                    body: { recipientType: recipient, subject, message }
                });
            } else {
                await sendEmailToStudentSendEmailStudentPost({
                    body: { usn, recipientType: recipient, subject, message }
                });
            }

            await saveMessage({
                usn: type === "individual" ? usn : undefined,
                recipientType: recipient,
                subject,
                message,
            });

            setFeedback({ text: `Message sent to ${recipient}s successfully!`, type: "success" });
            
            if (type === "all") {
                setSubjectAll("");
                setMessageAll("");
            } else {
                setSubjectInd("");
                setMessageInd("");
                setUsn("");
            }
        } catch (err) {
            setFeedback({ text: "Failed to send email.", type: "error" });
            console.error(err);
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback({ text: "", type: "" }), 5000);
        }
    };

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Top Navigation */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800/40 p-2 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setViewMode("broadcast")}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            viewMode === "broadcast" 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        }`}
                    >
                        <Megaphone className="w-4 h-4" />
                        Mass Announcements
                    </button>
                    <button 
                        onClick={() => setViewMode("individual")}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            viewMode === "individual" 
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Direct Message
                    </button>
                </div>

                {feedback.text && (
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl animate-in fade-in slide-in-from-right-4 duration-300 ${
                        feedback.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    }`}>
                        {feedback.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span className="text-[10px] font-black uppercase">{feedback.text}</span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 lg:overflow-hidden">
                {/* Left: Compose Form (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
                        <div className={`p-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-3 ${
                            viewMode === "broadcast" ? "bg-indigo-50/50 dark:bg-indigo-500/10" : "bg-emerald-50/50 dark:bg-emerald-500/10"
                        }`}>
                            <div className={`p-2 rounded-xl text-white shadow-lg ${
                                viewMode === "broadcast" ? "bg-indigo-600 shadow-indigo-500/20" : "bg-emerald-600 shadow-emerald-500/20"
                            }`}>
                                {viewMode === "broadcast" ? <Megaphone className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                    {viewMode === "broadcast" ? "New Announcement" : "Single Message"}
                                </h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    {viewMode === "broadcast" ? "Send to entire cohort" : "Send to specific student"}
                                </p>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            {viewMode === "individual" && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Student USN</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Enter USN (e.g., 1MS20CS001)"
                                            value={usn}
                                            onChange={(e) => setUsn(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Subject</label>
                                <div className="relative">
                                    <ListTodo className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Email Subject..."
                                        value={viewMode === "broadcast" ? subjectAll : subjectInd}
                                        onChange={(e) => viewMode === "broadcast" ? setSubjectAll(e.target.value) : setSubjectInd(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Message Content</label>
                                <textarea
                                    placeholder="Write your message here..."
                                    rows={8}
                                    value={viewMode === "broadcast" ? messageAll : messageInd}
                                    onChange={(e) => viewMode === "broadcast" ? setMessageAll(e.target.value) : setMessageInd(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleSend(viewMode === "broadcast" ? "all" : "individual", "student")}
                                    disabled={loading}
                                    className={`py-4 rounded-2xl text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 ${
                                        viewMode === "broadcast" ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                                    }`}
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                                    <span>{viewMode === "broadcast" ? "To All Students" : "Send to Student"}</span>
                                </button>
                                <button
                                    onClick={() => handleSend(viewMode === "broadcast" ? "all" : "individual", "parent")}
                                    disabled={loading}
                                    className="py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                    <span>{viewMode === "broadcast" ? "To All Parents" : "Send to Parent"}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Message History (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6 h-[500px] lg:h-auto overflow-hidden">
                    <div className="flex-1 bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-gray-500/10 text-gray-500 rounded-lg">
                                    <History className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Recent Communication</h3>
                            </div>
                            <span className="text-[10px] font-black px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-lg uppercase tracking-wider">
                                {messages.length} Logs
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-20">
                                    <Clock className="w-12 h-12 mb-4" />
                                    <p className="text-sm font-bold">No communication history found.</p>
                                </div>
                            ) : (
                                [...messages].reverse().map((msg) => (
                                    <div key={msg.id} className="group p-5 rounded-3xl border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/30 hover:border-indigo-500/30 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-2 flex-1 min-w-0 pr-6">
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                                                        msg.recipientType === "parent" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" : "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                                                    }`}>
                                                        {msg.recipientType}
                                                    </span>
                                                    {msg.usn && (
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            USN: {msg.usn}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight truncate">{msg.subject}</h4>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">{msg.message}</p>
                                            </div>
                                            <button 
                                                onClick={() => deleteMessage(msg.id)}
                                                className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
