import { useEffect, useState, useCallback } from "react";
import { 
    getStudentMessagesStudentUsnMessagesGet,
    getMenteeMeetingsAuthStudentMenteeMeetingStudentUsnGet,
    getStudentMessageDetailStudentUsnMessagesMsgIdGet,
    markMessageReadStudentUsnMessagesMsgIdReadPost
} from "./client/sdk.gen";

interface MenteeRecieveEmailsProps {
    usn: string;
}

interface InboxMessage {
    id: number | string;
    subject?: string;
    message?: string;
    mentor_name?: string;
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

    // Fetch inbox messages
    const fetchMessages = useCallback(async () => {
        setLoadingMessages(true);
        try {
            const res = await getStudentMessagesStudentUsnMessagesGet({
                path: { usn }
            });
            if (res.data) setMessages(res.data as InboxMessage[]);
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
            if (res.data) setMeetings(res.data as MeetingEntry[]);
        } catch (err) {
            console.error("Error fetching meetings:", err);
        } finally {
            setLoadingMeetings(false);
        }
    }, [usn]);

    const fetchMessageDetail = async (msgId: number | string) => {
        try {
            const res = await getStudentMessageDetailStudentUsnMessagesMsgIdGet({
                path: { usn, msg_id: msgId as string }
            });
            if (res.data) {
                setSelectedMessage(res.data as InboxMessage);
            }
        } catch (err) {
            console.error("Error fetching message detail:", err);
        }
    };

    const markAsRead = async (msgId: number | string) => {
        try {
            await markMessageReadStudentUsnMessagesMsgIdReadPost({
                path: { usn, msg_id: msgId as string }
            });
            void fetchMessages();
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    };

    useEffect(() => {
        void fetchMessages();
        void fetchMeetings();
    }, [fetchMessages, fetchMeetings]);

    return (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
            <div className="w-full rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-md flex flex-col md:flex-row min-h-[70vh] overflow-hidden">
                {/* Left Panel - Inbox & Meetings */}
                <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                    {/* Inbox */}
                    <h2 className="text-sm sm:text-lg font-semibold text-blue-600 dark:text-blue-400 p-4 border-b border-gray-200 dark:border-gray-700">
                        Inbox
                    </h2>
                    {loadingMessages ? (
                        <p className="p-4 text-gray-500 dark:text-gray-400">
                            Loading messages...
                        </p>
                    ) : messages.length === 0 ? (
                        <p className="p-4 text-gray-500 dark:text-gray-400">
                            No messages yet
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                            {messages.map((msg) => (
                                <li
                                    key={msg.id}
                                    className={`p-4 cursor-pointer transition ${
                                        selectedMessage?.id === msg.id
                                            ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500"
                                            : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                    }`}
                                    onClick={() => fetchMessageDetail(msg.id)}
                                >
                                    <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                        {msg.subject || "No subject"}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        From: {msg.mentor_name || "Unknown"} |
                                        Sent:{" "}
                                        {new Date(
                                            msg.created_at
                                        ).toLocaleString("en-IN", {
                                            timeZone: "Asia/Kolkata",
                                        })}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {msg.message?.slice(0, 50) ||
                                            "No content"}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* Meetings */}
                    <h2 className="text-sm sm:text-lg font-semibold text-green-600 dark:text-green-400 p-4 border-t border-gray-200 dark:border-gray-700">
                        Meetings
                    </h2>
                    {loadingMeetings ? (
                        <p className="p-4 text-gray-500 dark:text-gray-400">
                            Loading meetings...
                        </p>
                    ) : meetings.length === 0 ? (
                        <p className="p-4 text-gray-500 dark:text-gray-400">
                            No meetings scheduled
                        </p>
                    ) : (
                        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                            {meetings
                                .sort(
                                    (a, b) =>
                                        new Date(a.date).getTime() - new Date(b.date).getTime()
                                )
                                .map((m) => (
                                    <li
                                        key={m.id}
                                        className="p-4 border-b border-gray-100 dark:border-gray-700"
                                    >
                                        <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                            {m.title}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(
                                                m.date
                                            ).toLocaleDateString()}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {m.agenda}
                                        </p>
                                    </li>
                                ))}
                        </ul>
                    )}
                </div>

                {/* Right Panel - Message Detail */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                    {selectedMessage ? (
                        <>
                            <div>
                                <h3 className="text-lg sm:text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                                    {selectedMessage.subject || "No subject"}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    From:{" "}
                                    {selectedMessage.mentor_name || "Unknown"}
                                </p>
                                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-gray-700 dark:text-gray-200 whitespace-pre-line shadow-inner">
                                    {selectedMessage.message}
                                </div>
                            </div>
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() =>
                                        markAsRead(selectedMessage.id)
                                    }
                                    className="inline-block px-5 py-2 rounded-full bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition"
                                >
                                    ✅ Mark as Read
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
                            <p>Select a message to view</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
