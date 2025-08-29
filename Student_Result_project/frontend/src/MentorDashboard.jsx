import React, { useState } from "react";
import { BarChart3, Users, Send, CalendarDays } from "lucide-react";
import MentorResults from "./MentorResults";
import MentorSendEmails from "./MentorSendEmails";
import { useLocation, useParams } from "react-router-dom";

export default function MentorDashboard() {
    const [activeTab, setActiveTab] = useState("results");
    const [date, setDate] = useState("");
    let { mentor_id } = useLocation().state || {};

    console.log(mentor_id);
    let { finalId } = useParams();
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
    ];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Mentor Dashboard</h1>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-t-md 
              ${
                  activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700"
              }`}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-4 rounded-lg shadow">
                {activeTab === "results" && (
                    <div>
                        <MentorResults mentor_id={mentor_id} />
                    </div>
                )}

                {activeTab === "communication" && (
                    <div>
                        <MentorSendEmails mentorId={mentor_id} />
                    </div>
                )}

                {activeTab === "meetings" && (
                    <div>
                        <h2 className="text-lg font-semibold mb-2">
                            Set Meeting Reminder
                        </h2>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="border p-2 rounded mb-2"
                        />
                        <textarea
                            placeholder="Agenda / Notes..."
                            className="w-full border p-2 rounded mb-2"
                            rows="3"
                        />
                        <button className="px-4 py-2 bg-purple-600 text-white rounded-md flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" /> Save Reminder
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
