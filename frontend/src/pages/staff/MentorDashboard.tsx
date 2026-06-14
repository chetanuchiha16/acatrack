import React, { useState } from "react";
import { BarChart3, Users, CalendarDays, FileText } from "lucide-react";
import MentorResults from "./MentorResults";
import MentorSendEmails from "./MentorSendEmails";
import MentorMeetings from "./MentorMeetings";
import MentorRecords from "./MentorRecord";
import useAuthStore from "../../store/useAuthStore";
import useStaffStore from "../../store/useStaffStore";

const MentorDashboard: React.FC = () => {
    const [currentTab, setCurrentTab] = useState<string>("results");
    const userSession = useAuthStore((s) => s.user);
    const resolvedMentorId = userSession?.mentor_id ? String(userSession.mentor_id) : "";
    const { batchYear: activeBatchYear } = useStaffStore();

    const navigationTabs = [
        {
            key: "results",
            title: "Results",
            tabIcon: <BarChart3 className="w-4 h-4" />,
        },
        {
            key: "communication",
            title: "Comm.",
            tabIcon: <Users className="w-4 h-4" />,
        },
        {
            key: "meetings",
            title: "Meetings",
            tabIcon: <CalendarDays className="w-4 h-4" />,
        },
        {
            key: "records",
            title: "Mentor Records",
            tabIcon: <FileText className="w-4 h-4" />,
        },
    ];

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex justify-center mb-6 flex-shrink-0 w-full overflow-x-auto">
                <div className="inline-flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-inner whitespace-nowrap min-w-max">
                    {navigationTabs.map((item) => (
                        <button
                            key={item.key}
                            onClick={() => setCurrentTab(item.key)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ease-in-out
                                ${currentTab === item.key
                                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm transform scale-100"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 transform scale-95"
                                }`}
                        >
                            <span>{item.tabIcon}</span>
                            <span>{item.title}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-xl overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {activeBatchYear ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {currentTab === "results" && (
                                <MentorResults mentor_id={resolvedMentorId} batchYear={activeBatchYear} />
                            )}
                            {currentTab === "communication" && (
                                <MentorSendEmails mentorId={resolvedMentorId} batchYear={activeBatchYear} />
                            )}
                            {currentTab === "meetings" && (
                                <MentorMeetings mentorId={resolvedMentorId} batchYear={activeBatchYear} />
                            )}
                            {currentTab === "records" && (
                                <MentorRecords mentor_id={resolvedMentorId} batchYear={activeBatchYear} />
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center py-20">
                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                                <Users className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Batch Selected</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                Please select an active batch year to view your mentees and manage records.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MentorDashboard;
