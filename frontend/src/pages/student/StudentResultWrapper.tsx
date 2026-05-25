import React, { useState } from "react";
import Result from "./Result";
import type { Semester } from "../../types";
import useProtectedPage from "../../hooks/useProtectedPage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ChevronDown, Sparkles } from "lucide-react";

type ResultViewMode = "table" | "cards" | "ai";
type StudentSemester = Semester | "";

const sems: Semester[] = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6", "sem7", "sem8"];
const isSemester = (v: string): v is Semester => sems.includes(v as Semester);

const StudentResultWrapper: React.FC = () => {
    const { user, loading } = useProtectedPage("Student");
    const [view, setView] = useState<ResultViewMode>("cards");
    const [currentSem, setCurrentSem] = useState<StudentSemester>("sem1");

    if (loading) return <LoadingSpinner message="Authenticating Dashboard..." fullScreen={true} />;
    if (!user) return null;

    const finalUsn = user.id || "";

    return (
        <div className="space-y-6">
            {/* ── Controls ─────────────────────────────────────────────────── */}
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Semester Results</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select a semester to view your academic performance.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Semester picker */}
                    <div className="relative">
                        <select
                            aria-label="Select semester"
                            value={currentSem}
                            onChange={e => {
                                const v = e.target.value;
                                if (v === "" || isSemester(v)) setCurrentSem(v);
                            }}
                            className="appearance-none w-40 px-3 py-2 rounded-md bg-white dark:bg-[#0f1720] text-sm text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Semester</option>
                            {sems.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Cards / Table / AI toggle — matches staff's pattern */}
                    <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setView("cards")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                view === "cards" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500"
                            }`}
                        >
                            Cards
                        </button>
                        <button
                            onClick={() => setView("table")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                view === "table" ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-gray-500"
                            }`}
                        >
                            Table
                        </button>
                        <button
                            onClick={() => setView("ai")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                view === "ai" ? "bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm" : "text-gray-500"
                            }`}
                        >
                            <Sparkles size={12} />
                            AI Insights
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Content ──────────────────────────────────────────────────── */}
            <section>
                {currentSem !== "" ? (
                    <Result usn={finalUsn} semester={currentSem} view={view} />
                ) : (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">Please select a semester above to view your results.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default StudentResultWrapper;
