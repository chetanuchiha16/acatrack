import { useState, useEffect, useCallback } from "react";
import { CalendarDays } from "lucide-react";
import { 
    getMeetingsAuthStaffMentorMeetingMentorIdGet, 
    addMeetingAuthStaffMentorMeetingMentorIdPost, 
    deleteMeetingAuthStaffMentorMeetingDeleteMeetingIdDelete 
} from "./client/sdk.gen";
import { parseApiError } from "./utils/errorHandler";

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
    const [loading, setLoading] = useState(false); // Loading state
    const [message, setMessage] = useState(""); // Success/error message

    const batch_year_num = parseInt(batchYear);

    // Fetch meetings from backend
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
    }, [mentorId, batch_year_num, fetchMeetings]);

    // Add a new meeting
    const addMeeting = async () => {
        if (!title || !date || !venue) {
            alert("Please enter a title, date, and venue");
            return;
        }

        setLoading(true); // Start loading
        setMessage(""); // Clear previous message

        try {
            await addMeetingAuthStaffMentorMeetingMentorIdPost({
                path: { mentor_id: Number(mentorId) },
                query: { batch_year: batch_year_num },
                body: {
                    title,
                    date,
                    venue,
                    agenda,
                }
            });

            // Reset form
            setTitle("");
            setDate("");
            setVenue("");
            setAgenda("");

            void fetchMeetings(); // Refresh list
            setMessage("Meeting added successfully and emails sent!"); // Success message
        } catch (err) {
            setMessage(parseApiError(err) || "Error adding meeting. Please try again.");
        } finally {
            setLoading(false); // Stop loading
        }
    };

    // Delete a meeting
    const removeMeeting = async (id: number | string) => {
        setLoading(true);
        setMessage("");
        try {
            await deleteMeetingAuthStaffMentorMeetingDeleteMeetingIdDelete({
                path: { meeting_id: Number(id) },
                query: { batch_year: batch_year_num }
            });
            void fetchMeetings();
            setMessage("Meeting deleted successfully.");
        } catch (err) {
            setMessage(parseApiError(err) || "Error deleting meeting.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-bold mb-4">Set Meeting Reminder</h2>

            <input
                type="text"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border p-2 rounded w-full md:w-1/2"
            />
            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border p-2 rounded w-full md:w-1/2"
            />
            <input
                type="text"
                placeholder="Venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="border p-2 rounded w-full md:w-1/2"
            />
            <textarea
                placeholder="Agenda / Notes..."
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                className="border p-2 rounded w-full md:w-1/2"
                rows={3}
            />

            <button
                onClick={addMeeting}
                disabled={!title || !date || !venue || loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    title && date && venue && !loading
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "!bg-gray-300 !text-gray-600 !cursor-not-allowed hover:!border-white"
                }`}
            >
                <CalendarDays className="w-4 h-4" />
                {loading ? "Saving..." : "Save Reminder"}
            </button>

            {message && (
                <p
                    className={`mt-2 ${
                        message.includes("Error")
                            ? "text-red-600"
                            : "text-green-600"
                    }`}
                >
                    {message}
                </p>
            )}

            <h3 className="mt-6 font-bold text-xl">Upcoming Meetings</h3>
            {meetings.length === 0 ? (
                <p>No meetings scheduled.</p>
            ) : (
                <ul className="space-y-2">
                    {meetings
                        .sort((a: MeetingRecord, b: MeetingRecord) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((m) => (
                            <li
                                key={m.id}
                                className="border p-2 rounded flex justify-between items-center"
                            >
                                <div className="space-y-1">
                                    <p>
                                        <strong>Title:</strong> {m.title}
                                    </p>
                                    <p>
                                        <strong>Date:</strong>{" "}
                                        {new Date(m.date).toLocaleDateString()}
                                    </p>
                                    <p>
                                        <strong>Venue:</strong> {m.venue}
                                    </p>
                                    {m.agenda && (
                                        <p className="text-sm">
                                            <strong>Agenda:</strong> {m.agenda}
                                        </p>
                                    )}
                                </div>

                                <button
                                    onClick={() => removeMeeting(m.id)}
                                    disabled={loading}
                                    className="text-red-600 hover:text-red-800"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                </ul>
            )}
        </div>
    );
}
