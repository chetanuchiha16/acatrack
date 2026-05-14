import { useEffect, useState, useCallback } from "react";
import { 
    Send, 
    Users, 
    Search, 
    Trash2, 
    History, 
    Mail, 
    ChevronDown, 
    ChevronUp, 
    CheckCircle2, 
    AlertCircle,
    Smartphone,
    UserCircle
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
    const [students, setStudents] = useState<StudentEntry[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [studentMessages, setStudentMessages] = useState<Record<string, MessageEntry[]>>({});
    const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
    const [feedback, setFeedback] = useState<{ text: string; type: "" | "success" | "error" }>({ text: "", type: "" });
    const [search, setSearch] = useState<string>("");
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
            if (data?.students) setStudents(data.students as unknown as StudentEntry[]);
        } catch (err) {
            console.error("Failed to fetch students", err);
        } finally {
            setLoading(false);
        }
    }, [mentorId, batch_year_num]);

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

    const toggleExpand = (usn: string) => {
        setExpanded((prev) => ({ ...prev, [usn]: !prev[usn] }));
    };

    const sendEmail = async (
        recipientType: string,
        usn: string | null,
        subject: string,
        message: string
    ) => {
        if (!subject.trim() || !message.trim()) {
            setFeedback({
                text: "Subject and message are required.",
                type: "error",
            });
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
                    const newMsg: MessageEntry = {
                        ...dataObj,
                        read_status:
                            dataObj.read_status?.map((s: ReadStatus) => ({
                                ...s,
                                read: false,
                            })) || [],
                    };
                    return {
                        ...prev,
                        [key]: [newMsg, ...(prev[key] || [])],
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
                setFeedback({
                    text: `Successfully sent to ${usn || "all"} ${recipientType}(s)!`,
                    type: "success",
                });

                if (usn) {
                    setStudentInputs((prev) => ({
                        ...prev,
                        [usn]: { subject: "", message: "" },
                    }));
                } else {
                    setBroadcastSubject("");
                    setBroadcastMsg("");
                }
            }
        } catch (err) {
            console.error("Email sending failed", err);
            setFeedback({
                text: "Failed to send email. Message recorded in history.",
                type: "error",
            });
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback({ text: "", type: "" }), 5000);
        }
    };

    const deleteMessage = async (msgId: number | string, usn: string | null) => {
        try {
            await deleteMessageMentorMentorIdMessagesMsgIdDelete({
                path: { 
                    mentor_id: Number(mentorId),
                    msg_id: Number(msgId) 
                },
                query: { batch_year: batch_year_num }
            });
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
        <div className="flex flex-col gap-6 h-full">
            {/* Feedback Alert */}
            {feedback.text && (
                <div className={`flex items-center gap-2 p-4 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-300 ${
                    feedback.type === "success" 
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20" 
                        : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20"
                }`}>
                    {feedback.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <p className="text-sm font-bold">{feedback.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1 overflow-hidden">
                {/* Left Column: Broadcast & History (4 cols) */}
                <div className="xl:col-span-5 flex flex-col gap-6 overflow-hidden">
                    {/* Broadcast Card */}
                    <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                                    <Send className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Broadcast</h3>
                            </div>
                        </div>
                        <div className="p-4 space-y-3">
                            <input
                                type="text"
                                placeholder="Broadcast Subject..."
                                value={broadcastSubject}
                                onChange={(e) => setBroadcastSubject(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                            />
                            <textarea
                                placeholder="Write your announcement here..."
                                rows={4}
                                value={broadcastMsg}
                                onChange={(e) => setBroadcastMsg(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => void sendEmail("student", null, broadcastSubject, broadcastMsg)}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    <Users className="w-4 h-4" />
                                    <span>All Students</span>
                                </button>
                                <button
                                    onClick={() => void sendEmail("parent", null, broadcastSubject, broadcastMsg)}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                                >
                                    <UserCircle className="w-4 h-4" />
                                    <span>All Parents</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Broadcast History */}
                    <div className="flex-1 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2 bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="p-1.5 bg-gray-500/10 text-gray-500 rounded-lg">
                                <History className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Announcement History</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            {loadingMessages ? (
                                <div className="flex justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                                </div>
                            ) : !studentMessages["all"] || studentMessages["all"].length === 0 ? (
                                <div className="text-center py-10 text-gray-500 italic text-sm">No announcements sent yet.</div>
                            ) : (
                                studentMessages["all"].map((msg) => (
                                    <div key={msg.id} className="group p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/30 hover:border-gray-200 dark:hover:border-gray-600 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    {msg.subject}
                                                    {msg.email_failed && <AlertCircle className="w-3.5 h-3.5 text-rose-500" />}
                                                </h4>
                                                <span className="text-[10px] text-gray-400 font-medium">{new Date(msg.created_at).toLocaleString()}</span>
                                            </div>
                                            <button 
                                                onClick={() => void deleteMessage(msg.id, null)}
                                                className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">{msg.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Student List (8 cols) */}
                <div className="xl:col-span-7 flex flex-col gap-4 overflow-hidden">
                    {/* Search Bar */}
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search mentees by name or USN..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        />
                    </div>

                    {/* Student List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                        {loading ? (
                             <div className="flex justify-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                            </div>
                        ) : filteredStudents.map((s) => (
                            <div key={s.usn} className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden transition-all hover:shadow-md">
                                {/* Student Header */}
                                <div className="p-4 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{s.name}</h3>
                                            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-tighter">{s.usn}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleExpand(s.usn)}
                                        className={`p-2 rounded-xl transition-all ${
                                            expanded[s.usn] 
                                                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                                                : "bg-gray-100 dark:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                        }`}
                                    >
                                        {expanded[s.usn] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </button>
                                </div>

                                {expanded[s.usn] && (
                                    <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 space-y-6 animate-in slide-in-from-top-2 duration-300">
                                        {/* Contact Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50">
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Parent Name</p>
                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{s.parent_name || 'N/A'}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50">
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Parent Email</p>
                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{s.parent_email || 'N/A'}</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-700/50">
                                                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Parent Phone</p>
                                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{s.parent_phone || 'N/A'}</p>
                                            </div>
                                        </div>

                                        {/* Compose Message */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Mail className="w-4 h-4 text-blue-500" />
                                                <span className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">Compose Message</span>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Subject"
                                                value={studentInputs[s.usn]?.subject || ""}
                                                onChange={(e) => setStudentInputs(prev => ({
                                                    ...prev,
                                                    [s.usn]: { ...prev[s.usn], subject: e.target.value } as StudentInput
                                                }))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
                                            />
                                            <textarea
                                                placeholder="Type your message here..."
                                                rows={3}
                                                value={studentInputs[s.usn]?.message || ""}
                                                onChange={(e) => setStudentInputs(prev => ({
                                                    ...prev,
                                                    [s.usn]: { ...prev[s.usn], message: e.target.value } as StudentInput
                                                }))}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => void sendEmail("student", s.usn, studentInputs[s.usn]?.subject || "", studentInputs[s.usn]?.message || "")}
                                                    disabled={loading}
                                                    className="flex-1 py-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-black uppercase tracking-widest hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white transition-all disabled:opacity-50"
                                                >
                                                    Email Student
                                                </button>
                                                <button
                                                    onClick={() => void sendEmail("parent", s.usn, studentInputs[s.usn]?.subject || "", studentInputs[s.usn]?.message || "")}
                                                    disabled={loading}
                                                    className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50"
                                                >
                                                    Email Parent
                                                </button>
                                            </div>
                                        </div>

                                        {/* Message History */}
                                        <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <History className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs font-black uppercase tracking-wider text-gray-500">Message History</span>
                                            </div>
                                            {!studentMessages[s.usn] || studentMessages[s.usn].length === 0 ? (
                                                <div className="text-[11px] text-gray-400 italic">No previous messages.</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {studentMessages[s.usn].map((msg) => {
                                                        const status = msg.read_status?.find(rs => rs.usn === s.usn);
                                                        return (
                                                            <div key={msg.id} className="p-3 rounded-xl border border-gray-50 dark:border-gray-700/30 bg-gray-50/50 dark:bg-gray-900/20 flex justify-between items-center group">
                                                                <div className="flex-1 min-w-0 pr-4">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className="text-[11px] font-bold text-gray-900 dark:text-white truncate">{msg.subject}</p>
                                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                                                            status?.read 
                                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" 
                                                                                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                                                                        }`}>
                                                                            {status?.read ? "Read" : "Sent"}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-gray-500 line-clamp-1">{msg.message}</p>
                                                                </div>
                                                                <button 
                                                                    onClick={() => void deleteMessage(msg.id, s.usn)}
                                                                    className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        {filteredStudents.length === 0 && !loading && (
                            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700">
                                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h4 className="text-gray-900 dark:text-white font-bold">No Mentees Found</h4>
                                <p className="text-sm text-gray-500">Try adjusting your search criteria.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
