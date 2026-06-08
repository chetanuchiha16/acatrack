import React, { useState } from "react";
import Result from "./Result";
import type { Semester } from "../../types";
import useProtectedPage from "../../hooks/useProtectedPage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ChevronDown, LayoutGrid, Table, Brain } from "lucide-react";

type ResultViewMode = "table" | "cards" | "ai";
type StudentSemester = Semester | "";

const sems: Semester[] = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6", "sem7", "sem8"];
const isSemester = (v: string): v is Semester => sems.includes(v as Semester);

const StudentResultWrapper: React.FC = () => {
    const { user, loading } = useProtectedPage("Student");
    const [view, setView] = useState<ResultViewMode>("cards");
    const [currentSem, setCurrentSem] = useState<StudentSemester>("sem1");
    const [availableSems, setAvailableSems] = useState<Semester[]>([]);
    const [hasDefaulted, setHasDefaulted] = useState<boolean>(false);

    React.useEffect(() => {
        if (availableSems.length > 0 && !hasDefaulted) {
            setCurrentSem(availableSems[availableSems.length - 1]);
            setHasDefaulted(true);
        }
    }, [availableSems, hasDefaulted]);

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
                            {(availableSems.length > 0 ? availableSems : sems).map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Cards / Table / AI toggle — matches dashboard pattern */}
                    <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-[#0b1220] p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <button
                            onClick={() => setView("cards")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${
                                view === "cards" ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-700" : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/30"
                            }`}
                        >
                            <LayoutGrid size={15} />
                            <span>Cards</span>
                        </button>
                        <button
                            onClick={() => setView("table")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${
                                view === "table" ? "bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-gray-100 dark:border-gray-700" : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/30"
                            }`}
                        >
                            <Table size={15} />
                            <span>Table</span>
                        </button>
                        <button
                            onClick={() => setView("ai")}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${
                                view === "ai" ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm border border-gray-100 dark:border-gray-700" : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/30"
                            }`}
                        >
                            <Brain size={15} />
                            <span>AI Insights</span>
                        </button>
                    </div>
                </div>
            </section>

            {/* ── Content ──────────────────────────────────────────────────── */}
            <section>
                {currentSem !== "" ? (
                    <Result usn={finalUsn} semester={currentSem} view={view} onDataLoaded={setAvailableSems} />
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
