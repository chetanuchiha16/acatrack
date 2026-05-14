import React, { useState } from "react";
import Result from "./Result";
import type { Semester } from "../../types";
import useProtectedPage from "../../hooks/useProtectedPage";
import LoadingSpinner from "../../components/LoadingSpinner";

type ResultViewMode = "table" | "cards" | "ai";
type StudentSemester = Semester | "";

const StudentResultWrapper: React.FC = () => {
    const { user, loading } = useProtectedPage("Student");
    const [view, setView] = useState<ResultViewMode>("cards");
    const [currentSem, setCurrentSem] = useState<StudentSemester>("sem1");

    if (loading) return <LoadingSpinner message="Authenticating Dashboard..." fullScreen={true} />;
    
    if (!user) return null;

    const finalUsn = user.id || "";

    const sems: Semester[] = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6", "sem7", "sem8"];
    const isSemester = (value: string): value is Semester => sems.includes(value as Semester);

    return (
        <div className="space-y-6">
            <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Semester Results</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Select a semester to view your academic performance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="relative block w-40">
                        <span className="sr-only">Select semester</span>
                        <select
                            aria-label="Select semester"
                            value={currentSem}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const nextSem = e.target.value;
                                if (nextSem === "" || isSemester(nextSem)) {
                                    setCurrentSem(nextSem);
                                }
                            }}
                            className="appearance-none w-full px-3 py-2 rounded-md bg-white dark:bg-[#0f1720] text-sm text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Semester</option>
                            {sems.map((sem) => (
                                <option key={sem} value={sem}>{sem}</option>
                            ))}
                        </select>
                    </label>

                    <div className="overflow-hidden rounded-full border border-gray-200/60 dark:border-gray-800 shadow-sm hidden sm:inline-flex bg-gray-100/80 dark:bg-gray-900 p-1 backdrop-blur-md">
                        <button
                            onClick={() => setView("cards")}
                            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${view !== "ai" ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-200/50 dark:border-gray-700" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                        >
                            📄 Official Scorecard
                        </button>
                        <button
                            onClick={() => setView("ai")}
                            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 ${view === "ai" ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm border border-gray-200/50 dark:border-gray-700" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
                        >
                            ✨ AI Insights
                        </button>
                    </div>
                </div>
            </section>
            
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
