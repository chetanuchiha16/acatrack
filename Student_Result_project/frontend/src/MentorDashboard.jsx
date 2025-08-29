import React, { useState } from "react";
import { BarChart3, Users, CalendarDays } from "lucide-react";
import MentorResults from "./MentorResults";
import MentorSendEmails from "./MentorSendEmails";
import { useLocation, useParams } from "react-router-dom";

export default function MentorDashboard() {
    const [activeTab, setActiveTab] = useState("results");
    const [date, setDate] = useState("");
    let { mentor_id } = useLocation().state || {};
    let { finalId } = useParams();

    const tabs = [
        { id: "results", label: "Results", icon: <BarChart3 className="w-4 h-4" /> },
        { id: "communication", label: "Comm.", icon: <Users className="w-4 h-4" /> },
        { id: "meetings", label: "Meetings", icon: <CalendarDays className="w-4 h-4" /> },
    ];

    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center">
                Mentor Dashboard
            </h1>

            <div className="w-[95%] mx-auto h-[2px] bg-gray-300 my-4 rounded shadow-sm"></div>

            <div className="w-full md:max-w-6xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 b-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-md transition-colors duration-200
                                ${
                                    activeTab === tab.id
                                        ? "bg-blue-600 text-white"
                                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                                }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-4 mt-12 rounded-lg bg-gray-50 dark:bg-gray-900">
                    {activeTab === "results" && <MentorResults mentor_id={mentor_id} />}

                    {activeTab === "communication" && (
                        <MentorSendEmails mentorId={mentor_id} />
                    )}

                    {activeTab === "meetings" && (
                        <div className="flex flex-col gap-3">
                            <h2 className="text-2xl font-bold mb-6">Set Meeting Reminder</h2>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="border rounded p-2 w-full md:w-1/2"
                            />
                            <textarea
                                placeholder="Agenda / Notes..."
                                className="w-full border p-2 rounded"
                                rows="3"
                            />
                            <button className="self-start px-4 py-2 bg-purple-600 text-white rounded-md flex items-center gap-2 hover:bg-purple-700 transition-colors duration-200">
                                <CalendarDays className="w-4 h-4" /> Save Reminder
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
