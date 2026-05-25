import React, { useState } from "react";
import Result from "./Result";
import type { Semester } from "../../types";
import useProtectedPage from "../../hooks/useProtectedPage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ChevronDown, Sparkles, FileText } from "lucide-react";

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
        <div className="flex flex-col gap-4 h-full">
            {/* ── Unified control bar ──────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-4 py-3 shadow-sm">
                <div>
                    <h1 className="text-[15px] font-black text-gray-900 dark:text-white leading-none">Semester Results</h1>
                    <p className="text-[11px] text-gray-400 mt-0.5">Select a semester to view your academic performance.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Semester picker */}
                    <div className="relative">
                        <select
                            aria-label="Select semester"
                            value={currentSem}
                            onChange={e => {
                                const v = e.target.value;
                                if (v === "" || isSemester(v)) setCurrentSem(v);
                            }}
                            className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-[12px] font-bold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
                        >
                            <option value="">Select Semester</option>
                            {sems.map(s => (
                                <option key={s} value={s}>{s.replace("sem", "Semester ")}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* View toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-950 p-0.5 rounded-xl border border-gray-200/40 dark:border-gray-800">
                        <button
                            onClick={() => setView("cards")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all duration-200 ${
                                view !== "ai"
                                    ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                            }`}
                        >
                            <FileText size={12} />
                            Scorecard
                        </button>
                        <button
                            onClick={() => setView("ai")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[11px] font-bold transition-all duration-200 ${
                                view === "ai"
                                    ? "bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm"
                                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
                            }`}
                        >
                            <Sparkles size={12} />
                            AI Insights
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Result content — stretches to fill remaining height ──────── */}
            <div className="flex-1 flex flex-col min-h-0">
                {currentSem !== "" ? (
                    <Result usn={finalUsn} semester={currentSem} view={view} />
                ) : (
                    <div className="flex-1 flex items-center justify-center rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                        <p className="text-sm text-gray-400 font-medium">Select a semester above to view your results.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentResultWrapper;
