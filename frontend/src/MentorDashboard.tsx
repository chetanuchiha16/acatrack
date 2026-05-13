import React, { useState, useEffect } from "react";
import { BarChart3, Users, CalendarDays, FileText } from "lucide-react";
import MentorResults from "./MentorResults";
import MentorSendEmails from "./MentorSendEmails";
import MentorMeetings from "./MentorMeetings";
import MentorRecords from "./MentorRecord"; // adjust the path if needed
import { listBatchesBatchesGet } from "./client/sdk.gen";
import useAuthStore from "./useAuthStore";

const MentorDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<string>("results");
    const [batches, setBatches] = useState<number[]>([]);
    const [batchYear, setBatchYear] = useState<string>("");
    
    // Read mentor_id from the JWT-backed auth store (production-grade: persistent, refresh-safe)
    const user = useAuthStore((s) => s.user);
    const mentor_id = user?.mentor_id ? String(user.mentor_id) : "";

    useEffect(() => {
        listBatchesBatchesGet()
            .then((res) => {
                const fetchedBatches = res.data?.batches || [];
                setBatches(fetchedBatches);
                if (fetchedBatches.length > 0) {
                    setBatchYear(String(fetchedBatches[fetchedBatches.length - 1]));
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
        <div className="space-y-6">
                
                {/* Header Card */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between">
                    <div className="flex items-center gap-4 w-full sm:w-auto mb-4 sm:mb-0">
                        <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                            Mentor Dashboard
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900 p-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 px-2">Active Batch:</span>
                        <select
                            value={batchYear}
                            onChange={(e) => setBatchYear(e.target.value)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 w-32 shadow-sm"
                        >
                            <option value="">Select</option>
                            {batches.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="w-full mx-auto p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
                {/* Segmented Control Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700/50 shadow-inner">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ease-in-out
                                    ${activeTab === tab.id
                                        ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md transform scale-100"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 transform scale-95"
                                    }`}
                            >
                                <span className={`${activeTab === tab.id ? "animate-pulse" : ""}`}>
                                    {tab.icon}
                                </span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -m-4 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -m-4 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl"></div>
                    
                    <div className="relative z-10">
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

                                {activeTab === "records" && (
                                    <MentorRecords mentor_id={mentor_id} batchYear={batchYear} />
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                                    <Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">No Batch Selected</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                                    Please select a batch year from the dropdown menu above to view mentor details, results, and communications.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                </div>
        </div>
    );
};

export default MentorDashboard;
