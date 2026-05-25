import React, { useEffect, useState } from "react";
import jssLogo from "../../assets/jssLogo.png";
import { useLocation, useParams } from "react-router-dom";
import Result from "./Result";
import Classroom from "./Classroom";
import LogoutButton from "../../components/LogoutButton";
import MenteeRecieveEmails from "./MenteeRecieveEmails";
import { onMessage } from "firebase/messaging";
import { messaging } from "../../firebase";
import useProtectedPage from "../../hooks/useProtectedPage";
import MenteeRecordFilling from "./MenteeRecordFilling";
import LoadingSpinner from "../../components/LoadingSpinner";
import type { Semester } from "../../types";
import { LayoutGrid, Table, Brain } from "lucide-react";

type StudentTab = "result" | "classroom" | "mentee" | "record";
type ResultViewMode = "table" | "cards" | "ai";
type StudentSemester = Semester | "";

interface LocationState {
    branch?: string;
}

const Student: React.FC = () => {
    const location = useLocation();
    const params = useParams<{ branch?: string }>();

    const [view, setView] = useState<ResultViewMode>("cards");
    const [selectedTab, setSelectedTab] = useState<StudentTab>("result");
    const [currentSem, setCurrentSem] = useState<StudentSemester>("sem1");
    
    const { user, loading } = useProtectedPage("Student");

    useEffect(() => {
        if (!user) return; // wait for auth

        const unsubscribe = onMessage(messaging, (payload) => {
            alert(`📩 New notification: ${payload.notification?.title}`);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (selectedTab !== "result") setCurrentSem("");
    }, [selectedTab]);

    const locationState = location.state as LocationState | null;
    const locBranch = locationState?.branch;

    const finalBranch = locBranch || params.branch || "BE in Computer Science and Engineeing";

    // Tabs: "", "result", "classroom", "mentee", "record"
    const id = user?.id;
    const name = user?.name;
    const finalName = name || "";
    const finalUsn = id || "";

    const sems: Semester[] = ["sem1", "sem2", "sem3", "sem4", "sem5", "sem6", "sem7", "sem8"];
    const isSemester = (value: string): value is Semester =>
        sems.includes(value as Semester);

    if (loading) return <LoadingSpinner message="Authenticating Dashboard..." fullScreen={true} />;
    
    return (
        <main className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="max-w-6xl mx-auto w-full mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <img
                            src={jssLogo}
                            alt="JSS Logo"
                            className="w-17 sm:w-33 md:w-37 lg:w-39 h-auto drop-shadow-lg"
                        />
                    </div>

                    <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white text-center">
                        Student Dashboard
                    </div>

                    <div>
                        <LogoutButton size="sm" />
                    </div>
                </div>
            </div>

            <div className="w-[95%] mx-auto h-[2px] bg-gray-300 my-4 mt-[-4] rounded shadow-sm"></div>

            {/* Page container */}
            <div className="max-w-5xl mx-auto w-full space-y-6">
                {/* Student info */}
                <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-5 shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 items-center">
                        <div>
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                                Name
                            </p>
                            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate mt-1">
                                {finalName}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                                USN
                            </p>
                            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate mt-1">
                                {finalUsn}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider">
                                Branch
                            </p>
                            <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate mt-1">
                                {finalBranch}
                            </p>
                        </div>
                    </div>

                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        Choose a tab below to access results, classroom, or
                        mentee emails. Semester selector appears after you click{" "}
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">Result</span>.
                    </p>
                </section>

                {/* Tabs + semester selector */}
                <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Tabs */}
                    <div className="w-full flex justify-center sm:justify-start">
                        <nav
                            className="inline-flex rounded-md bg-gray-50 dark:bg-[#0b1220] border border-gray-200 dark:border-gray-700 overflow-hidden"
                            role="group"
                            aria-label="Student tabs"
                        >
                            <button
                                aria-pressed={selectedTab === "result"}
                                onClick={() => setSelectedTab("result")}
                                className={`px-4 py-2.5 text-sm sm:text-base font-bold transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${selectedTab === "result"
                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    }`}
                            >
                                Result
                            </button>

                            <button
                                aria-pressed={selectedTab === "classroom"}
                                onClick={() => setSelectedTab("classroom")}
                                className={`px-4 py-2.5 text-sm sm:text-base font-bold transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${selectedTab === "classroom"
                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    }`}
                            >
                                Classroom
                            </button>

                            <button
                                aria-pressed={selectedTab === "mentee"}
                                onClick={() => setSelectedTab("mentee")}
                                className={`px-4 py-2.5 text-sm sm:text-base font-bold transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${selectedTab === "mentee"
                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    }`}
                            >
                                Mentee
                            </button>
                            {/* ✅ Record button */}
                            <button
                                aria-pressed={selectedTab === "record"}
                                onClick={() => setSelectedTab("record")}
                                className={`px-4 py-2.5 text-sm sm:text-base font-bold transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${selectedTab === "record"
                                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    }`}
                            >
                                Record
                            </button>
                        </nav>
                    </div>

                    {/* Semester select */}
                    {/* Semester + view toggle */}
                    <div className="w-full sm:w-auto flex items-center gap-3">
                        {selectedTab === "result" ? (
                            <>
                                {/* Semester Select */}
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
                                        className="appearance-none w-full px-4 py-2.5 rounded-lg bg-white dark:bg-[#0f1720] text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">
                                            Select Semester
                                        </option>
                                        {sems.map((sem) => (
                                            <option key={sem} value={sem}>
                                                {sem}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                {/* Cards / Table Toggle */}
                                <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-[#0b1220] p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <button
                                        onClick={() => setView("cards")}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${view === "cards"
                                            ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-gray-700"
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/30"
                                            }`}
                                    >
                                        <LayoutGrid size={15} />
                                        <span>Cards</span>
                                    </button>
                                    <button
                                        onClick={() => setView("table")}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${view === "table"
                                            ? "bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-gray-100 dark:border-gray-700"
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/30"
                                            }`}
                                    >
                                        <Table size={15} />
                                        <span>Table</span>
                                    </button>
                                    <button
                                        onClick={() => setView("ai")}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 active:scale-95 ${view === "ai"
                                            ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm border border-gray-100 dark:border-gray-700"
                                            : "text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-800/30"
                                            }`}
                                    >
                                        <Brain size={15} />
                                        <span>AI Insights</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-sm sm:text-base text-gray-500 dark:text-gray-400 text-center sm:text-left">
                                Click{" "}
                                <span className="font-semibold text-gray-750 dark:text-gray-150">
                                    Result
                                </span>{" "}
                                to pick a semester.
                            </div>
                        )}
                    </div>
                </section>

                {/* Main content */}
                <section>
                    <div className="w-full">
                        {selectedTab === "result" && currentSem !== "" && (
                            <Result
                                usn={finalUsn}
                                semester={currentSem}
                                view={view}
                            />
                        )}
                        {selectedTab === "classroom" && <Classroom />}
                        {selectedTab === "mentee" && (
                            <MenteeRecieveEmails usn={finalUsn} />
                        )}
                        {selectedTab === "record" && (
                            <MenteeRecordFilling usn={finalUsn} name={finalName} />
                        )}

                    </div>
                </section>
            </div>

        </main>
    );
};

export default Student;
