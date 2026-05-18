import React, { useState, useEffect } from "react";
import { BarChart3, Users, CalendarDays, FileText } from "lucide-react";
import MentorResults from "./MentorResults";
import MentorSendEmails from "./MentorSendEmails";
import MentorMeetings from "./MentorMeetings";
import MentorRecords from "./MentorRecord"; // adjust the path if needed
import useAuthStore from "../../store/useAuthStore";
import useStaffStore from "../../store/useStaffStore";

const MentorDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>("results");
    
    // Read mentor_id from the JWT-backed auth store (production-grade: persistent, refresh-safe)
    const user = useAuthStore((s) => s.user);
    const mentor_id = user?.mentor_id ? String(user.mentor_id) : "";

    // Use global batch year from StaffStore
    const { batchYear } = useStaffStore();

    const tabs = [
        {
            id: "results",
            label: "Results",
            icon: <BarChart3 className="w-4 h-4" />,
        },
        {
            id: "communication",
            label: "Comm.",
            icon: <Users className="w-4 h-4" />,
        },
        {
            id: "meetings",
            label: "Meetings",
            icon: <CalendarDays className="w-4 h-4" />,
        },
        {
            id: "records",
            label: "Mentor Records",
            icon: <FileText className="w-4 h-4" />, // icon for PDFs
        },
    ];

    return (
        <div className="w-full h-full flex flex-col">
            {/* Segmented Control Tabs */}
            <div className="flex justify-center mb-6 flex-shrink-0">
                <div className="inline-flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-inner">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ease-in-out
                                ${activeTab === tab.id
                                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm transform scale-100"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 transform scale-95"
                                }`}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-xl overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {batchYear ? (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === "results" && (
                                <MentorResults mentor_id={mentor_id} batchYear={batchYear} />
                            )}

                            {activeTab === "communication" && (
                                <MentorSendEmails mentorId={mentor_id} batchYear={batchYear} />
                            )}

                            {activeTab === "meetings" && (
                                <MentorMeetings mentorId={mentor_id} batchYear={batchYear} />
                            )}

                            {activeTab === "records" && (
                                <MentorRecords mentor_id={mentor_id} batchYear={batchYear} />
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
