import { useState, useEffect, useCallback } from "react";
import { 
    CalendarDays, 
    Plus, 
    Trash2, 
    MapPin, 
    ListTodo, 
    CheckCircle2, 
    AlertCircle,
    Calendar,
    ChevronRight,
    Loader2
} from "lucide-react";
import { 
    getMeetingsAuthStaffMentorMeetingMentorIdGet, 
    addMeetingAuthStaffMentorMeetingMentorIdPost, 
    deleteMeetingAuthStaffMentorMeetingDeleteMeetingIdDelete 
} from "../../client/sdk.gen";
import { parseApiError } from "../../utils/errorHandler";

interface MentorMeetingsProps {
    mentorId: string;
    batchYear: string;
}

interface MeetingRecord {
    id: number | string;
    title: string;
    date: string;
    venue: string;
    agenda?: string;
    [key: string]: unknown;
}

export default function MentorMeetings({ mentorId, batchYear }: MentorMeetingsProps) {
    const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
    const [date, setDate] = useState("");
    const [agenda, setAgenda] = useState("");
    const [title, setTitle] = useState("");
    const [venue, setVenue] = useState("");
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ text: string; type: "" | "success" | "error" }>({ text: "", type: "" });

    const batch_year_num = parseInt(batchYear);

    const fetchMeetings = useCallback(async () => {
        if (!mentorId) return;
        try {
            const { data } = await getMeetingsAuthStaffMentorMeetingMentorIdGet({
                path: { mentor_id: Number(mentorId) },
                query: { batch_year: Number(batch_year_num) }
            });
            if (data) setMeetings(data as unknown as MeetingRecord[]);
        } catch (err) {
            console.error(err);
        }
    }, [mentorId, batch_year_num]);

    useEffect(() => {
        if (mentorId && batchYear) void fetchMeetings();
    }, [mentorId, batchYear, fetchMeetings]);

    const addMeeting = async () => {
        if (!title || !date || !venue) {
            setFeedback({ text: "Please enter a title, date, and venue", type: "error" });
            return;
        }

        setLoading(true);
        setFeedback({ text: "", type: "" });

        try {
            await addMeetingAuthStaffMentorMeetingMentorIdPost({
                path: { mentor_id: Number(mentorId) },
                query: { batch_year: batch_year_num },
                body: { title, date, venue, agenda }
            });

            setTitle("");
            setDate("");
            setVenue("");
            setAgenda("");
            void fetchMeetings();
            setFeedback({ text: "Meeting scheduled and notifications sent!", type: "success" });
        } catch (err) {
            setFeedback({ text: parseApiError(err) || "Error scheduling meeting.", type: "error" });
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback({ text: "", type: "" }), 5000);
        }
    };

    const removeMeeting = async (id: number | string) => {
        setLoading(true);
        try {
            await deleteMeetingAuthStaffMentorMeetingDeleteMeetingIdDelete({
                path: { meeting_id: Number(id) },
                query: { batch_year: batch_year_num }
            });
            void fetchMeetings();
            setFeedback({ text: "Meeting removed successfully.", type: "success" });
        } catch (err) {
            setFeedback({ text: parseApiError(err) || "Error deleting meeting.", type: "error" });
        } finally {
            setLoading(false);
            setTimeout(() => setFeedback({ text: "", type: "" }), 5000);
        }
    };

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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
                {/* Left: Schedule Form (5 cols) */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center gap-2 bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg">
                                <Plus className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Schedule Meeting</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Meeting Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Progress Review 1"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Venue</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <input
                                            type="text"
                                            placeholder="Room 201"
                                            value={venue}
                                            onChange={(e) => setVenue(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Agenda & Notes</label>
                                <div className="relative">
                                    <ListTodo className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <textarea
                                        placeholder="Discuss IA1 marks and attendance..."
                                        rows={4}
                                        value={agenda}
                                        onChange={(e) => setAgenda(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={addMeeting}
                                disabled={!title || !date || !venue || loading}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarDays className="w-4 h-4" />}
                                <span>{loading ? "Scheduling..." : "Save Reminder"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Meeting List (7 cols) */}
                <div className="lg:col-span-7 flex flex-col gap-6 overflow-hidden">
                    <div className="flex-1 bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-500/10 text-indigo-500 rounded-lg">
                                    <CalendarDays className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">Upcoming Meetings</h3>
                            </div>
                            <span className="text-[10px] font-black px-2 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg uppercase tracking-wider">
                                {meetings.length} Scheduled
                            </span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                            {meetings.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-20">
                                    <Calendar className="w-12 h-12 mb-4 text-gray-300" />
                                    <p className="text-sm font-bold text-gray-500">No meetings scheduled yet.</p>
                                    <p className="text-[11px] text-gray-400">Scheduled meetings will appear here.</p>
                                </div>
                            ) : (
                                [...meetings]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((m) => (
                                        <div key={m.id} className="group relative p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/30 hover:border-blue-500/30 hover:bg-blue-50/20 dark:hover:bg-blue-500/5 transition-all">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-3 flex-1 min-w-0 pr-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1 rounded bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                            <ChevronRight className="w-3 h-3" />
                                                        </div>
                                                        <h4 className="font-black text-gray-900 dark:text-white truncate uppercase tracking-tight">{m.title}</h4>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {new Date(m.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            {m.venue}
                                                        </div>
                                                    </div>

                                                    {m.agenda && (
                                                        <div className="mt-2 p-3 rounded-xl bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-gray-700/50">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Agenda</p>
                                                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed italic line-clamp-2">{m.agenda}</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => removeMeeting(m.id)}
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
