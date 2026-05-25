import { useEffect, useState, useCallback } from "react";
import {
    getStudentMessagesStudentUsnMessagesGet,
    getMenteeMeetingsAuthStudentMenteeMeetingStudentUsnGet,
    getStudentMessageDetailStudentUsnMessagesMsgIdGet,
    markMessageReadStudentUsnMessagesMsgIdReadPost
} from "../../client/sdk.gen";
import {
    Mail, Calendar, Search, CheckCircle2, Clock,
    Inbox, AlertCircle, MailOpen, BellDot,
} from "lucide-react";

interface MenteeRecieveEmailsProps { usn: string; }

interface InboxMessage {
    id: number | string;
    subject?: string;
    message?: string;
    mentor_name?: string;
    read?: boolean;
    created_at: string;
    [key: string]: unknown;
}

interface MeetingEntry {
    id: number | string;
    title: string;
    date: string;
    agenda?: string;
    [key: string]: unknown;
}

export default function MenteeRecieveEmails({ usn }: MenteeRecieveEmailsProps) {
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
    const [meetings, setMeetings] = useState<MeetingEntry[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [loadingMeetings, setLoadingMeetings] = useState(true);
    const [activeTab, setActiveTab] = useState<"messages" | "meetings">("messages");
    const [searchQuery, setSearchQuery] = useState("");

    const fetchMessages = useCallback(async () => {
        setLoadingMessages(true);
        try {
            const res = await getStudentMessagesStudentUsnMessagesGet({ path: { usn } });
            if (res.data) setMessages(res.data as InboxMessage[]);
        } catch (err) { console.error("Error fetching messages:", err); }
        finally { setLoadingMessages(false); }
    }, [usn]);

    const fetchMeetings = useCallback(async () => {
        setLoadingMeetings(true);
        try {
            const res = await getMenteeMeetingsAuthStudentMenteeMeetingStudentUsnGet({ path: { student_usn: usn } });
            if (res.data) setMeetings(res.data as MeetingEntry[]);
        } catch (err) { console.error("Error fetching meetings:", err); }
        finally { setLoadingMeetings(false); }
    }, [usn]);

    const fetchMessageDetail = async (msgId: number | string) => {
        try {
            const res = await getStudentMessageDetailStudentUsnMessagesMsgIdGet({ path: { usn, msg_id: Number(msgId) } });
            if (res.data) {
                const msg = res.data as InboxMessage;
                setSelectedMessage(msg);
                if (!msg.read) await markAsRead(msgId);
            }
        } catch (err) { console.error("Error fetching message detail:", err); }
    };

    const markAsRead = async (msgId: number | string) => {
        try {
            await markMessageReadStudentUsnMessagesMsgIdReadPost({ path: { usn, msg_id: Number(msgId) } });
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, read: true } : m));
            setSelectedMessage(prev => prev && prev.id === msgId ? { ...prev, read: true } : prev);
        } catch (err) { console.error("Error marking as read:", err); }
    };

    useEffect(() => { void fetchMessages(); void fetchMeetings(); }, [fetchMessages, fetchMeetings]);

    const getInitials = (name?: string) => {
        if (!name) return "M";
        const parts = name.trim().split(/\s+/);
        return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
    };

    const getAvatarGradient = (name?: string) => {
        const g = ["from-blue-500 to-indigo-600", "from-violet-500 to-purple-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600", "from-rose-500 to-pink-600", "from-cyan-500 to-blue-600"];
        if (!name) return g[0];
        return g[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % g.length];
    };

    const filteredMessages = messages.filter(msg => {
        const t = searchQuery.toLowerCase();
        return (msg.subject || "").toLowerCase().includes(t) || (msg.message || "").toLowerCase().includes(t) || (msg.mentor_name || "").toLowerCase().includes(t);
    });

    const filteredMeetings = meetings
        .filter(m => { const t = searchQuery.toLowerCase(); return (m.title || "").toLowerCase().includes(t) || (m.agenda || "").toLowerCase().includes(t); })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const unreadCount = messages.filter(m => !m.read).length;
    const nextMeeting = filteredMeetings[0] ?? null;

    const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const fmtTime = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });

    return (
        <div className="flex flex-col h-full w-full">
            {/* ── Header bar ────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl">
                        <Inbox className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-none">Mentorship Inbox</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Messages and meetings from your mentor</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Inline stats */}
                    <div className="hidden sm:flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <BellDot size={15} className="text-blue-500" />
                            <span className="font-bold text-gray-900 dark:text-white">{unreadCount}</span>
                            <span className="text-sm text-gray-400">unread</span>
                        </div>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                        <div className="flex items-center gap-1.5">
                            <Calendar size={15} className="text-indigo-500" />
                            <span className="font-bold text-gray-900 dark:text-white">{meetings.length}</span>
                            <span className="text-sm text-gray-400">meetings</span>
                        </div>
                    </div>

                    {/* Tab toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => { setActiveTab("messages"); setSelectedMessage(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === "messages" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800/50"
                            }`}
                        >
                            <Mail size={14} /> Messages
                            {unreadCount > 0 && <span className="bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">{unreadCount}</span>}
                        </button>
                        <button
                            onClick={() => { setActiveTab("meetings"); setSelectedMessage(null); }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                                activeTab === "meetings" ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800/50"
                            }`}
                        >
                            <Calendar size={14} /> Meetings
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Main content ──────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">

                {/* LEFT — List panel */}
                <div className="flex flex-col w-full md:w-[340px] lg:w-[380px] shrink-0 border-r border-gray-200 dark:border-gray-700">
                    {/* Search */}
                    <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder={activeTab === "messages" ? "Search messages…" : "Search meetings…"}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white dark:bg-gray-800 text-base text-gray-700 dark:text-gray-200 outline-none border border-gray-200 dark:border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === "messages" ? (
                            loadingMessages ? (
                                <LoadingState icon={<Mail size={18} />} label="Loading messages…" />
                            ) : filteredMessages.length === 0 ? (
                                <EmptyList icon={<AlertCircle size={20} />} label="No messages" sub="Your inbox is empty" />
                            ) : (
                                <ul>
                                    {filteredMessages.map(msg => {
                                        const isSelected = selectedMessage?.id === msg.id;
                                        const isUnread = !msg.read;
                                        return (
                                            <li
                                                key={msg.id}
                                                onClick={() => fetchMessageDetail(msg.id)}
                                                className={`px-4 py-3 cursor-pointer border-l-[3px] transition-all ${
                                                    isSelected
                                                        ? "bg-blue-50 dark:bg-blue-900/10 border-blue-500"
                                                        : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30"
                                                } border-b border-gray-100 dark:border-gray-700/60`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(msg.mentor_name)} flex items-center justify-center text-white text-xs font-black shrink-0 mt-0.5`}>
                                                        {getInitials(msg.mentor_name)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />}
                                                                <p className={`text-base truncate ${isUnread ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-600 dark:text-gray-300"}`}>
                                                                    {msg.subject || "No Subject"}
                                                                </p>
                                                            </div>
                                                            <span className="text-sm text-gray-400 shrink-0">
                                                                {new Date(msg.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{msg.mentor_name || "Advisor"}</p>
                                                        <p className="text-sm text-gray-400 line-clamp-1 mt-0.5">{msg.message || "—"}</p>
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )
                        ) : (
                            loadingMeetings ? (
                                <LoadingState icon={<Calendar size={18} />} label="Loading meetings…" />
                            ) : filteredMeetings.length === 0 ? (
                                <EmptyList icon={<Calendar size={20} />} label="No meetings" sub="Nothing scheduled yet" />
                            ) : (
                                <ul>
                                    {filteredMeetings.map(m => (
                                        <li key={m.id} className="px-4 py-3 flex gap-3 border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors group">
                                            <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                                                <span className="text-[9px] font-black text-indigo-400 uppercase leading-none">
                                                    {new Date(m.date).toLocaleString("en-IN", { month: "short" })}
                                                </span>
                                                <span className="text-lg font-black text-indigo-600 dark:text-indigo-300 leading-none">
                                                    {new Date(m.date).getDate()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-500 transition-colors">
                                                    {m.title}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-0.5">{fmtDate(m.date)}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{m.agenda || "No agenda"}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )
                        )}
                    </div>
                </div>

                {/* RIGHT — Detail / Welcome panel */}
                <div className="flex-1 flex flex-col min-w-0 min-h-[300px] md:min-h-0">
                    {selectedMessage ? (
                        <div className="flex flex-col h-full animate-in fade-in duration-200">
                            {/* Detail header */}
                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 bg-gray-50/50 dark:bg-gray-900/40">
                                <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(selectedMessage.mentor_name)} flex items-center justify-center text-white text-sm font-black shadow-sm shrink-0`}>
                                    {getInitials(selectedMessage.mentor_name)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold text-gray-900 dark:text-white truncate">
                                        {selectedMessage.mentor_name || "Academic Advisor"}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                                        <Clock size={11} />
                                        <span>{fmtTime(selectedMessage.created_at)}</span>
                                    </div>
                                </div>
                                {selectedMessage.read && (
                                    <span className="flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                                        <CheckCircle2 size={12} /> Read
                                    </span>
                                )}
                            </div>

                            {/* Subject */}
                            <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
                                <p className="text-xs font-black uppercase tracking-widest text-blue-500 mb-1">Subject</p>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                                    {selectedMessage.subject || "No Subject"}
                                </h2>
                            </div>

                            {/* Body */}
                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                                    {selectedMessage.message}
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Welcome panel with stats */
                        <div className="flex flex-col h-full p-5 gap-4">
                            {/* Stats row */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <BellDot size={16} className="text-blue-500" />
                                        <span className="text-sm font-bold uppercase tracking-wider text-blue-500">Unread</span>
                                    </div>
                                    <p className="text-4xl font-black text-blue-700 dark:text-blue-300 leading-none">{unreadCount}</p>
                                    <p className="text-sm text-blue-500/70 mt-1">announcements</p>
                                </div>
                                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Calendar size={16} className="text-indigo-500" />
                                        <span className="text-sm font-bold uppercase tracking-wider text-indigo-500">Meetings</span>
                                    </div>
                                    <p className="text-4xl font-black text-indigo-700 dark:text-indigo-300 leading-none">{meetings.length}</p>
                                    <p className="text-sm text-indigo-500/70 mt-1">scheduled total</p>
                                </div>
                            </div>

                            {/* Next meeting */}
                            {nextMeeting && (
                                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
                                    <p className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Next Scheduled Meeting</p>
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase leading-none">
                                                {new Date(nextMeeting.date).toLocaleString("en-IN", { month: "short" })}
                                            </span>
                                            <span className="text-xl font-black text-indigo-600 dark:text-indigo-300 leading-none">
                                                {new Date(nextMeeting.date).getDate()}
                                            </span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-base font-bold text-gray-900 dark:text-white truncate">{nextMeeting.title}</p>
                                            <p className="text-sm text-gray-400 mt-0.5">{fmtDate(nextMeeting.date)}</p>
                                            {nextMeeting.agenda && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{nextMeeting.agenda}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Unread messages preview */}
                            {unreadCount > 0 && (
                                <div className="flex-1 min-h-0 flex flex-col">
                                    <p className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Unread Announcements</p>
                                    <ul className="flex-1 overflow-y-auto space-y-2">
                                        {messages.filter(m => !m.read).slice(0, 5).map(msg => (
                                            <li
                                                key={msg.id}
                                                onClick={() => fetchMessageDetail(msg.id)}
                                                className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer transition-colors group"
                                            >
                                                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(msg.mentor_name)} flex items-center justify-center text-white text-[10px] font-black shrink-0`}>
                                                    {getInitials(msg.mentor_name)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-base font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                                                        {msg.subject || "No Subject"}
                                                    </p>
                                                    <p className="text-sm text-gray-400 line-clamp-1">{msg.message}</p>
                                                </div>
                                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mt-2 shrink-0" />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {unreadCount === 0 && !nextMeeting && (
                                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                                    <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <MailOpen size={24} className="text-gray-400" />
                                    </div>
                                    <p className="text-base font-bold text-gray-500 dark:text-gray-400">You're all caught up</p>
                                    <p className="text-sm text-gray-400 max-w-[220px]">No unread messages or upcoming meetings</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function LoadingState({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-400">
            <span className="animate-pulse">{icon}</span>
            <p className="text-base font-semibold animate-pulse">{label}</p>
        </div>
    );
}

function EmptyList({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-gray-400">
            <span className="text-gray-300 dark:text-gray-600">{icon}</span>
            <p className="text-base font-bold">{label}</p>
            <p className="text-sm text-gray-400">{sub}</p>
        </div>
    );
}
