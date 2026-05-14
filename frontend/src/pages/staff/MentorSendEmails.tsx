import { useEffect, useState, useCallback } from "react";
import { 
    Send, 
    Users, 
    Search, 
    Trash2, 
    History, 
    Mail, 
    ChevronRight, 
    CheckCircle2, 
    AlertCircle,
    UserCircle,
    MessageSquare,
    Megaphone,
    Clock,
    Phone,
    MoreVertical
} from "lucide-react";
import { 
    getMentorStudentsMentorMentorIdStudentsGet, 
    getMessagesMentorMentorIdMessagesGet, 
    sendMentorMessageMentorMentorIdMessagesPost, 
    sendEmailStudentMentorMentorIdSendEmailStudentPost, 
    sendEmailAllMentorMentorIdSendEmailAllPost, 
    deleteMessageMentorMentorIdMessagesMsgIdDelete 
} from "../../client/sdk.gen";

interface MentorSendEmailsProps {
    mentorId: string;
    batchYear: string;
}

interface StudentEntry {
    usn: string;
    name: string;
    parent_name?: string;
    parent_email?: string;
    parent_phone?: string;
    [key: string]: unknown;
}

interface ReadStatus {
    usn: string;
    read: boolean;
}

interface MessageEntry {
    id: number | string;
    subject: string;
    message: string;
    student_usn?: string;
    created_at: string;
    email_failed?: boolean;
    read_status?: ReadStatus[];
    [key: string]: unknown;
}

interface StudentInput {
    subject: string;
    message: string;
}

export default function MentorSendEmails({ mentorId, batchYear }: MentorSendEmailsProps) {
    const [viewMode, setViewMode] = useState<"individual" | "broadcast">("individual");
    const [students, setStudents] = useState<StudentEntry[]>([]);
    const [selectedUsn, setSelectedUsn] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [studentMessages, setStudentMessages] = useState<Record<string, MessageEntry[]>>({});
    const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
    const [feedback, setFeedback] = useState<{ text: string; type: "" | "success" | "error" }>({ text: "", type: "" });
    const [search, setSearch] = useState<string>("");
    
    // Inputs
    const [broadcastSubject, setBroadcastSubject] = useState<string>("");
    const [broadcastMsg, setBroadcastMsg] = useState<string>("");
    const [studentInputs, setStudentInputs] = useState<Record<string, StudentInput>>({});

    const batch_year_num = Number(batchYear);

    const fetchStudents = useCallback(async () => {
        if (!mentorId) return;
        setLoading(true);
        try {
            const { data } = await getMentorStudentsMentorMentorIdStudentsGet({
                path: { mentor_id: Number(mentorId) },
                query: { batch_year: batch_year_num }
            });
            if (data?.students) {
                const fetchedStudents = data.students as unknown as StudentEntry[];
                setStudents(fetchedStudents);
                if (fetchedStudents.length > 0 && !selectedUsn) {
                    setSelectedUsn(fetchedStudents[0].usn);
                }
            }
        } catch (err) {
            console.error("Failed to fetch students", err);
        } finally {
            setLoading(false);
        }
    }, [mentorId, batch_year_num, selectedUsn]);

    const fetchMessages = useCallback(async () => {
        if (!mentorId) return;
        try {
            const { data } = await getMessagesMentorMentorIdMessagesGet({
                path: { mentor_id: Number(mentorId) },
                query: { batch_year: batch_year_num }
            });
            const grouped: Record<string, MessageEntry[]> = {};
            if (data) {
                (data as unknown as MessageEntry[]).forEach((msg: MessageEntry) => {
                    const usn = (msg.student_usn as string | undefined) || "all";
                    if (!grouped[usn]) grouped[usn] = [];
                    grouped[usn].push(msg);
                });
            }
            setStudentMessages(grouped);
        } catch (err) {
            console.error("Failed to fetch messages", err);
        } finally {
            setLoadingMessages(false);
        }
    }, [mentorId, batch_year_num]);

    useEffect(() => {
        if (mentorId && batchYear) {
            void fetchStudents();
            void fetchMessages();
        }
    }, [mentorId, batchYear, fetchStudents, fetchMessages]);

    const sendEmail = async (
        recipientType: string,
        usn: string | null,
        subject: string,
        message: string
    ) => {
        if (!subject.trim() || !message.trim()) {
            setFeedback({ text: "Subject and message are required.", type: "error" });
            return;
        }

        setLoading(true);
        try {
            const { data: stored } = await sendMentorMessageMentorMentorIdMessagesPost({
                path: { mentor_id: Number(mentorId) },
                query: { batch_year: batch_year_num },
                body: { usn, recipientType: recipientType as "student" | "parent", subject, message }
            });
            
            if (stored) {
                setStudentMessages((prev) => {
                    const key = usn || "all";
                    const dataObj = stored as MessageEntry;
                    return {
                        ...prev,
                        [key]: [dataObj, ...(prev[key] || [])],
                    };
                });
            }

            let response;
            if (usn) {
                response = await sendEmailStudentMentorMentorIdSendEmailStudentPost({
                    path: { mentor_id: Number(mentorId) },
                    query: { batch_year: batch_year_num },
                    body: { usn, recipientType: recipientType as "student" | "parent", subject, message }
                });
            } else {
                response = await sendEmailAllMentorMentorIdSendEmailAllPost({
                    path: { mentor_id: Number(mentorId) },
                    query: { batch_year: batch_year_num },
                    body: { recipientType: recipientType as "student" | "parent", subject, message }
                });
            }

            if (response) {
                setFeedback({ text: `Message sent to ${recipientType} successfully!`, type: "success" });
                if (usn) {
                    setStudentInputs(prev => ({ ...prev, [usn]: { subject: "", message: "" } }));
                } else {
                    setBroadcastSubject("");
                    setBroadcastMsg("");
                }
            }
        } catch (err) {
            console.error("Email sending failed", err);
            setFeedback({ text: "Recorded in history, but email delivery failed.", type: "error" });
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback({ text: "", type: "" }), 5000);
        }
    };

    const deleteMessage = async (msgId: number | string, usn: string | null) => {
        try {
            await deleteMessageMentorMentorIdMessagesMsgIdDelete({
                path: { mentor_id: Number(mentorId), msg_id: Number(msgId) },
                query: { batch_year: batch_year_num }
            });
            setStudentMessages((prev) => {
                const key = usn || "all";
                return { ...prev, [key]: prev[key].filter((m) => m.id !== msgId) };
            });
        } catch (err) {
            console.error("Failed to delete message", err);
        }
    };

    const filteredStudents = students.filter(
        (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.usn.toLowerCase().includes(search.toLowerCase())
    );

    const activeStudent = students.find(s => s.usn === selectedUsn);
    const activeMessages = selectedUsn ? studentMessages[selectedUsn] || [] : [];

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Top Navigation / Toggle */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800/40 p-2 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
                <div className="flex gap-1">
                    <button 
                        onClick={() => setViewMode("individual")}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            viewMode === "individual" 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Direct Messages
                    </button>
                    <button 
                        onClick={() => setViewMode("broadcast")}
                        className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                            viewMode === "broadcast" 
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        }`}
                    >
                        <Megaphone className="w-4 h-4" />
                        Announcements
                    </button>
                </div>

                {feedback.text && (
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl animate-in fade-in slide-in-from-right-4 duration-300 ${
                        feedback.type === "success" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    }`}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase">{feedback.text}</span>
                    </div>
                )}
            </div>

            {viewMode === "individual" ? (
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* Sidebar: Student List */}
                    <div className="w-80 flex flex-col gap-4 overflow-hidden">
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search mentees..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm outline-none focus:ring-4 focus:ring-blue-500/10"
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {loading ? (
                                <div className="flex justify-center py-10"><Clock className="w-6 h-6 animate-spin text-blue-500" /></div>
                            ) : filteredStudents.map((s) => (
                                <button
                                    key={s.usn}
                                    onClick={() => setSelectedUsn(s.usn)}
                                    className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all text-left border ${
                                        selectedUsn === s.usn 
                                            ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20" 
                                            : "bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-600"
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${
                                        selectedUsn === s.usn ? "bg-white/20 text-white" : "bg-blue-500 text-white"
                                    }`}>
                                        {s.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold truncate ${selectedUsn === s.usn ? "text-white" : "text-gray-900 dark:text-white"}`}>{s.name}</p>
                                        <p className={`text-[10px] font-medium uppercase tracking-tighter ${selectedUsn === s.usn ? "text-blue-100" : "text-gray-400"}`}>{s.usn}</p>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 ${selectedUsn === s.usn ? "text-white" : "text-gray-300"}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
                        {activeStudent ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white text-xl font-black shadow-lg shadow-blue-500/10">
                                            {activeStudent.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 dark:text-white text-lg leading-tight">{activeStudent.name}</h3>
                                            <div className="flex gap-4 mt-1">
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                                    <UserCircle className="w-3.5 h-3.5" />
                                                    {activeStudent.parent_name || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {activeStudent.parent_email || 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {activeStudent.parent_phone || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"><MoreVertical className="w-5 h-5" /></button>
                                </div>

                                {/* Message History */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-gray-50/30 dark:bg-transparent">
                                    {loadingMessages ? (
                                        <div className="flex justify-center py-20"><Clock className="w-8 h-8 animate-spin text-blue-500 opacity-20" /></div>
                                    ) : activeMessages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center opacity-40">
                                            <MessageSquare className="w-12 h-12 mb-4" />
                                            <p className="font-bold text-sm">Start a conversation with {activeStudent.name.split(' ')[0]}</p>
                                        </div>
                                    ) : (
                                        [...activeMessages].reverse().map((msg) => {
                                            const status = msg.read_status?.find(rs => rs.usn === activeStudent.usn);
                                            return (
                                                <div key={msg.id} className="flex flex-col items-end group animate-in slide-in-from-bottom-2 duration-300">
                                                    <div className="max-w-[80%] relative">
                                                        <div className={`p-4 rounded-3xl rounded-tr-none shadow-sm ${
                                                            msg.email_failed ? "bg-rose-500 text-white" : "bg-blue-600 text-white"
                                                        }`}>
                                                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">{msg.subject}</p>
                                                            <p className="text-sm leading-relaxed">{msg.message}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-2 mr-1">
                                                            <span className="text-[9px] font-bold text-gray-400 uppercase">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-wider ${status?.read ? "text-emerald-500" : "text-gray-400"}`}>
                                                                {status?.read ? "Read" : "Delivered"}
                                                            </span>
                                                            <button 
                                                                onClick={() => deleteMessage(msg.id, activeStudent.usn)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition-all"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Compose Bar */}
                                <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 bg-white dark:bg-gray-800">
                                    <div className="flex flex-col gap-3">
                                        <input
                                            type="text"
                                            placeholder="Subject (e.g., IA Marks Update)"
                                            value={studentInputs[activeStudent.usn]?.subject || ""}
                                            onChange={(e) => setStudentInputs(prev => ({
                                                ...prev,
                                                [activeStudent.usn]: { ...prev[activeStudent.usn], subject: e.target.value } as StudentInput
                                            }))}
                                            className="w-full px-5 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        />
                                        <div className="flex gap-3">
                                            <textarea
                                                placeholder={`Write a message to ${activeStudent.name.split(' ')[0]}...`}
                                                rows={2}
                                                value={studentInputs[activeStudent.usn]?.message || ""}
                                                onChange={(e) => setStudentInputs(prev => ({
                                                    ...prev,
                                                    [activeStudent.usn]: { ...prev[activeStudent.usn], message: e.target.value } as StudentInput
                                                }))}
                                                className="flex-1 px-5 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                                            />
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => void sendEmail("student", activeStudent.usn, studentInputs[activeStudent.usn]?.subject || "", studentInputs[activeStudent.usn]?.message || "")}
                                                    disabled={loading}
                                                    className="flex-1 px-6 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white transition-all disabled:opacity-50"
                                                >
                                                    Student
                                                </button>
                                                <button
                                                    onClick={() => void sendEmail("parent", activeStudent.usn, studentInputs[activeStudent.usn]?.subject || "", studentInputs[activeStudent.usn]?.message || "")}
                                                    disabled={loading}
                                                    className="flex-1 px-6 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50"
                                                >
                                                    Parent
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-10">
                                <Users className="w-16 h-16 text-gray-200 mb-4" />
                                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No Mentee Selected</h3>
                                <p className="text-sm text-gray-500 max-w-xs">Select a student from the list to view your communication history and send messages.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    {/* Broadcast View */}
                    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 overflow-hidden">
                        <div className="bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-3 bg-amber-50/50 dark:bg-amber-500/10">
                                <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
                                    <Megaphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">Mass Announcement</h3>
                                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Broadcast to all mentees or parents</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Announcement Subject..."
                                        value={broadcastSubject}
                                        onChange={(e) => setBroadcastSubject(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-base font-bold outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                                    />
                                    <textarea
                                        placeholder="Write your announcement here..."
                                        rows={6}
                                        value={broadcastMsg}
                                        onChange={(e) => setBroadcastMsg(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-base outline-none focus:ring-4 focus:ring-amber-500/10 transition-all resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => void sendEmail("student", null, broadcastSubject, broadcastMsg)}
                                        disabled={loading}
                                        className="py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50"
                                    >
                                        Send to All Students
                                    </button>
                                    <button
                                        onClick={() => void sendEmail("parent", null, broadcastSubject, broadcastMsg)}
                                        disabled={loading}
                                        className="py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-black uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-xl shadow-gray-900/20 dark:shadow-white/10 disabled:opacity-50"
                                    >
                                        Send to All Parents
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Broadcast History */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <History className="w-4 h-4 text-gray-400" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Announcement History</h3>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar space-y-4 pb-10">
                                {loadingMessages ? (
                                    <div className="flex justify-center py-20"><Clock className="w-8 h-8 animate-spin text-amber-500 opacity-20" /></div>
                                ) : !studentMessages["all"] || studentMessages["all"].length === 0 ? (
                                    <div className="text-center py-10 opacity-30 text-sm font-bold">No announcements yet.</div>
                                ) : (
                                    studentMessages["all"].map((msg) => (
                                        <div key={msg.id} className="p-6 rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/40 shadow-sm flex justify-between items-start group hover:border-amber-500/30 transition-all">
                                            <div className="flex-1 min-w-0 pr-10">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{msg.subject}</h4>
                                                    <span className="text-[10px] font-bold text-gray-400">{new Date(msg.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{msg.message}</p>
                                            </div>
                                            <button 
                                                onClick={() => void deleteMessage(msg.id, null)}
                                                className="p-2 text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
