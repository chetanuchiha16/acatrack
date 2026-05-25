import { useEffect, useState, useCallback } from "react";
import { 
    getStudentMessagesStudentUsnMessagesGet,
    getMenteeMeetingsAuthStudentMenteeMeetingStudentUsnGet,
    getStudentMessageDetailStudentUsnMessagesMsgIdGet,
    markMessageReadStudentUsnMessagesMsgIdReadPost
} from "../../client/sdk.gen";
import { 
    Mail, 
    Calendar, 
    Search, 
    Check, 
    Clock, 
    User, 
    Inbox, 
    ChevronRight, 
    MessageSquare, 
    AlertCircle 
} from "lucide-react";

interface MenteeRecieveEmailsProps {
    usn: string;
}

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

    // Fetch inbox messages
    const fetchMessages = useCallback(async () => {
        setLoadingMessages(true);
        try {
            const res = await getStudentMessagesStudentUsnMessagesGet({
                path: { usn }
            });
            if (res.data) {
                setMessages(res.data as InboxMessage[]);
            }
        } catch (err) {
            console.error("Error fetching messages:", err);
        } finally {
            setLoadingMessages(false);
        }
    }, [usn]);

    // Fetch meetings for mentee
    const fetchMeetings = useCallback(async () => {
        setLoadingMeetings(true);
        try {
            const res = await getMenteeMeetingsAuthStudentMenteeMeetingStudentUsnGet({
                path: { student_usn: usn }
            });
            if (res.data) {
                setMeetings(res.data as MeetingEntry[]);
            }
        } catch (err) {
            console.error("Error fetching meetings:", err);
        } finally {
            setLoadingMeetings(false);
        }
    }, [usn]);

    const fetchMessageDetail = async (msgId: number | string) => {
        try {
            const res = await getStudentMessageDetailStudentUsnMessagesMsgIdGet({
                path: { usn, msg_id: Number(msgId) }
            });
            if (res.data) {
                const detailedMsg = res.data as InboxMessage;
                setSelectedMessage(detailedMsg);
                
                // If it was unread, dynamically mark it as read in local state
                if (!detailedMsg.read) {
                    await markAsRead(msgId);
                }
            }
        } catch (err) {
            console.error("Error fetching message detail:", err);
        }
    };

    const markAsRead = async (msgId: number | string) => {
        try {
            await markMessageReadStudentUsnMessagesMsgIdReadPost({
                path: { usn, msg_id: Number(msgId) }
            });
            
            // Dynamically update read state locally without refetching the full list immediately
            setMessages(prev => 
                prev.map(msg => msg.id === msgId ? { ...msg, read: true } : msg)
            );
            setSelectedMessage(prev => 
                prev && prev.id === msgId ? { ...prev, read: true } : prev
            );
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    };

    useEffect(() => {
        void fetchMessages();
        void fetchMeetings();
    }, [fetchMessages, fetchMeetings]);

    const getInitials = (name?: string) => {
        if (!name) return "M";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const getAvatarGradient = (name?: string) => {
        if (!name) return "from-blue-500 to-indigo-600";
        const charCode = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
        const gradients = [
            "from-blue-500 to-indigo-600",
            "from-purple-500 to-pink-600",
            "from-emerald-500 to-teal-600",
            "from-amber-500 to-orange-600",
            "from-rose-500 to-red-600",
            "from-indigo-500 to-purple-600",
        ];
        return gradients[charCode % gradients.length];
    };

    // Filter messages by search query
    const filteredMessages = messages.filter(msg => {
        const term = searchQuery.toLowerCase();
        return (
            (msg.subject || "").toLowerCase().includes(term) ||
            (msg.message || "").toLowerCase().includes(term) ||
            (msg.mentor_name || "").toLowerCase().includes(term)
        );
    });

    // Filter meetings by search query
    const filteredMeetings = meetings.filter(m => {
        const term = searchQuery.toLowerCase();
        return (
            (m.title || "").toLowerCase().includes(term) ||
            (m.agenda || "").toLowerCase().includes(term)
        );
    });

    return (
        <div className="w-full max-w-7xl mx-auto p-2 sm:p-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-none">
                        Mentorship Hub
                    </h2>
                    <p className="text-xs text-gray-500 mt-2">
                        Official announcements, feedback review, and calendar events
                    </p>
                </div>
            </div>

            {/* Inner Dashboard Container */}
            <div className="w-full rounded-3xl bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 shadow-xl flex flex-col md:flex-row min-h-[72vh] overflow-hidden">
                {/* Left Panel - Master List View */}
                <div className="w-full md:w-5/12 lg:w-4/12 border-r border-gray-100 dark:border-gray-800 flex flex-col">
                    
                    {/* Control Panel: Sliding Segmented Tabs */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 space-y-3">
                        <div className="bg-gray-100 dark:bg-gray-950 p-1 rounded-2xl flex border border-gray-200/40 dark:border-gray-800">
                            <button
                                onClick={() => setActiveTab("messages")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                                    activeTab === "messages"
                                        ? "bg-white dark:bg-gray-850 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200/20 dark:border-gray-750"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-250"
                                }`}
                            >
                                <Mail size={14} />
                                Announcements
                            </button>
                            <button
                                onClick={() => setActiveTab("meetings")}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                                    activeTab === "meetings"
                                        ? "bg-white dark:bg-gray-850 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200/20 dark:border-gray-750"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-250"
                                }`}
                            >
                                <Calendar size={14} />
                                Meetings
                            </button>
                        </div>

                        {/* Search Input Bar */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={15} />
                            <input
                                type="text"
                                placeholder={activeTab === "messages" ? "Search announcements..." : "Search meetings..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-gray-950 text-xs font-medium text-gray-700 dark:text-gray-200 outline-none border border-gray-200/60 dark:border-gray-800 focus:border-blue-500/50 dark:focus:border-blue-400/50 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Master Scrollable Lists */}
                    <div className="flex-1 overflow-y-auto min-h-[40vh] md:max-h-[60vh] custom-scrollbar">
                        {activeTab === "messages" ? (
                            loadingMessages ? (
                                <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                                    <Mail className="animate-pulse mx-auto mb-2" size={20} />
                                    <p className="text-xs font-semibold animate-pulse">Loading announcements...</p>
                                </div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center">
                                    <AlertCircle className="mb-2 text-gray-300 dark:text-gray-600" size={24} />
                                    <p className="text-xs font-bold">No announcements found</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-[150px]">Try clearing your search filters</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-50 dark:divide-gray-800/40">
                                    {filteredMessages.map((msg) => {
                                        const isSelected = selectedMessage?.id === msg.id;
                                        const isUnread = !msg.read;
                                        
                                        return (
                                            <li
                                                key={msg.id}
                                                className={`p-4 cursor-pointer transition-all duration-300 relative border-l-4 ${
                                                    isSelected
                                                        ? "bg-blue-50/50 dark:bg-blue-900/10 border-blue-500"
                                                        : "border-transparent hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                                                }`}
                                                onClick={() => fetchMessageDetail(msg.id)}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        {isUnread && (
                                                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] animate-pulse shrink-0" title="Unread" />
                                                        )}
                                                        <p className={`text-xs truncate ${isUnread ? "font-extrabold text-gray-900 dark:text-white" : "font-medium text-gray-600 dark:text-gray-300"}`}>
                                                            {msg.subject || "No Subject"}
                                                        </p>
                                                    </div>
                                                    <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tight shrink-0">
                                                        {new Date(msg.created_at).toLocaleDateString("en-IN", {
                                                            day: "2-digit",
                                                            month: "short"
                                                        })}
                                                    </span>
                                                </div>

                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate mb-2">
                                                    From: {msg.mentor_name || "Advisor"}
                                                </p>
                                                <p className="text-[11px] text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed">
                                                    {msg.message || "No preview content available."}
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )
                        ) : (
                            loadingMeetings ? (
                                <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                                    <Calendar className="animate-pulse mx-auto mb-2" size={20} />
                                    <p className="text-xs font-semibold animate-pulse">Loading scheduled meetings...</p>
                                </div>
                            ) : filteredMeetings.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center">
                                    <Calendar className="mb-2 text-gray-300 dark:text-gray-600" size={24} />
                                    <p className="text-xs font-bold">No meetings scheduled</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 max-w-[150px]">Stay tuned for counseling schedules</p>
                                </div>
                            ) : (
                                <ul className="divide-y divide-gray-50 dark:divide-gray-800/40">
                                    {filteredMeetings
                                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                        .map((m) => (
                                            <li
                                                key={m.id}
                                                className="p-4 border-b border-gray-50 dark:border-gray-850 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all duration-300 flex items-start gap-3.5 group"
                                            >
                                                {/* Visual Date Calendar Badge */}
                                                <div className="flex flex-col items-center justify-center w-11 h-11 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/50 dark:border-indigo-900/30 rounded-xl shrink-0">
                                                    <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest leading-none">
                                                        {new Date(m.date).toLocaleString("en-IN", { month: "short" })}
                                                    </span>
                                                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300 mt-0.5 leading-none">
                                                        {new Date(m.date).getDate()}
                                                    </span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-extrabold text-gray-900 dark:text-white truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                                                        {m.title}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-bold uppercase tracking-wider">
                                                        {new Date(m.date).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                                                        {m.agenda || "No structured agenda provided."}
                                                    </p>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            )
                        )}
                    </div>
                </div>

                {/* Right Panel - Detailed Active View */}
                <div className="flex-1 p-6 flex flex-col justify-between bg-gray-50/30 dark:bg-gray-900/20">
                    {selectedMessage ? (
                        <div className="h-full flex flex-col justify-between animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-6">
                                {/* Detailed Header with Initials Avatar */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center gap-3.5">
                                        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarGradient(selectedMessage.mentor_name)} flex items-center justify-center text-white text-xs font-black shadow-md`}>
                                            {getInitials(selectedMessage.mentor_name)}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900 dark:text-white leading-tight">
                                                {selectedMessage.mentor_name || "Academic Advisor"}
                                            </h3>
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-1">
                                                <Clock size={11} />
                                                <span>
                                                    {new Date(selectedMessage.created_at).toLocaleString("en-IN", {
                                                        timeZone: "Asia/Kolkata",
                                                        day: "2-digit",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: true
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Subject Box */}
                                <div>
                                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                        Subject Alert
                                    </span>
                                    <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1 leading-snug">
                                        {selectedMessage.subject || "No Structured Subject Header"}
                                    </h1>
                                </div>

                                {/* Beautiful Email Body Card */}
                                <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-150/50 dark:border-gray-850 shadow-sm leading-relaxed text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-pre-line shadow-inner max-h-[35vh] overflow-y-auto custom-scrollbar">
                                    {selectedMessage.message}
                                </div>
                            </div>

                            {/* Mark as Read Button */}
                            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                                <button
                                    disabled
                                    className="flex items-center gap-1.5 px-4.5 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black uppercase tracking-wider"
                                >
                                    <Check size={13} />
                                    <span>Verified Read</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Beautiful Inbox Empty State illustration */
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500 mb-6 shadow-inner animate-bounce">
                                <Inbox size={38} className="text-blue-500/80" />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                                Select an Announcement
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed font-semibold">
                                Choose an alert or meeting agenda from the sidebar to review professional feedback and instructions from your advisor.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
