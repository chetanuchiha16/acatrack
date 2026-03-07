import React, { useState, useEffect } from "react";
import { BarChart3, Users, CalendarDays, FileText } from "lucide-react";
import MentorResults from "./MentorResults";
import MentorSendEmails from "./MentorSendEmails";
import { useLocation, useParams } from "react-router-dom";
import MentorMeetings from "./MentorMeetings";
import MentorRecords from "./MentorRecord"; // adjust the path if needed
import API_BASE from "./config";
import axios from "axios";

export default function MentorDashboard() {
    const [activeTab, setActiveTab] = useState("results");
    const [batches, setBatches] = useState([]);
    const [batchYear, setBatchYear] = useState("");
    const [date, setDate] = useState("");
    let { mentor_id } = useLocation().state || {};
    let { finalId } = useParams();

    useEffect(() => {
        axios.get(`${API_BASE}/batches`)
            .then((res) => {
                setBatches(res.data.batches);
                if (res.data.batches && res.data.batches.length > 0) {
                    setBatchYear(res.data.batches[res.data.batches.length - 1]);
                }
            })
            .catch(() => setBatches([]));
    }, []);

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
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between p-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center">
                    Mentor Dashboard
                </h1>

                <div className="flex items-center gap-3 mt-4 sm:mt-0">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Batch:</span>
                    <select
                        value={batchYear}
                        onChange={(e) => setBatchYear(e.target.value)}
                        className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none w-32"
                    >
                        <option value="">Select</option>
                        {batches.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="w-[95%] mx-auto h-[2px] bg-gray-300 my-4 rounded shadow-sm"></div>

            <div className="w-full md:max-w-6xl mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
                {/* Tabs */}
                <div className="flex flex-wrap gap-2 b-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-t-md transition-colors duration-200
                                ${activeTab === tab.id
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
                    {batchYear ? (
                        <>
                            {activeTab === "results" && (
                                <MentorResults mentor_id={mentor_id} batchYear={batchYear} />
                            )}

                            {activeTab === "communication" && (
                                <MentorSendEmails mentorId={mentor_id} batchYear={batchYear} />
                            )}

                            {activeTab === "meetings" && (
                                <div className="flex flex-col gap-3">
                                    <MentorMeetings mentorId={mentor_id} batchYear={batchYear} />
                                </div>
                            )}

                            {activeTab === "records" && 
                            <MentorRecords mentor_id={mentor_id} batchYear={batchYear} />}
                        </>
                    ) : (
                        <div className="text-center text-gray-500 py-10">
                            Please select a batch to view mentor details.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
