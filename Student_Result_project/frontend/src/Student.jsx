import React, { useEffect, useState } from "react";
import jssLogo from "./assets/jssLogo.png";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Result from "./Result";
import Classroom from "./Classroom";
import LogoutButton from "./LogoutButton";
import MenteeRecieveEmails from "./MenteeRecieveEmails";
import { onMessage } from "firebase/messaging";
import { messaging } from "./firebase"; // your firebase.js
import useProtectedPage from "./useProtectedPage";
export default function Student() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [view, setView] = useState("table");
    // const { name: locName, id: locId, usn: locUsn, branch: locBranch } =
    //   location.state || {};
    const [selectedTab, setSelectedTab] = useState("");
    const [currentSem, setCurrentSem] = useState("");
    const { user, studentData, loading } = useProtectedPage("Student");
    useEffect(() => {
        if (!user) return; // wait for auth

        const unsubscribe = onMessage(messaging, (payload) => {
            alert("📩 New notification: " + payload.notification?.title);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (selectedTab !== "result") setCurrentSem("");
    }, [selectedTab]);
    const { branch: locBranch } = location.state || {};

    // const finalName = locName || params.name || "Student Name";
    // const finalUsn = locUsn || locId || params.id || "UNKNOWN";
    const finalBranch =
        locBranch || params.branch || "BE in Computer Science and Engineeing";

    // Tabs: "", "result", "classroom", "mentee"

    const { id, name, who, batch_year } = user || {};
    const finalName = name;
    const finalUsn = id;

    const sems = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6"];

    // onMessage(messaging, (payload) => {
    //     console.log("Message received. ", payload);
    //     alert("📩 New notification: " + payload.notification.title);
    // });
    if (loading) return <div>Loading...</div>;
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

                    <div className="text-[24px] sm:mt-0 sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center">
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
                            <p className="text-xs text-gray-500 dark:text-gray-300">
                                Name
                            </p>
                            <p className="text-sm sm:text-base font-medium text-gray-800 dark:text-gray-100 truncate">
                                {finalName}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-300">
                                USN
                            </p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                {finalUsn}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-300">
                                Branch
                            </p>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                                {finalBranch}
                            </p>
                        </div>
                    </div>

                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        Choose a tab below to access results, classroom, or
                        mentee emails. Semester selector appears after you click{" "}
                        <span className="font-medium">Result</span>.
                    </p>
                </section>

                {/* Tabs + semester selector */}
                <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Tabs */}
                    <div className="w-full flex justify-center sm:justify-start">
                        <nav
                            className="inline-flex rounded-md bg-gray-50 dark:bg-[#0b1220] border border-gray-200 dark:border-gray-700 overflow-hidden"
                            role="tablist"
                            aria-label="Student tabs"
                        >
                            <button
                                role="tab"
                                aria-selected={selectedTab === "result"}
                                onClick={() => setSelectedTab("result")}
                                className={`px-3 py-2 text-xs sm:text-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                    selectedTab === "result"
                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                            >
                                Result
                            </button>

                            <button
                                role="tab"
                                aria-selected={selectedTab === "classroom"}
                                onClick={() => setSelectedTab("classroom")}
                                className={`px-3 py-2 text-xs sm:text-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                    selectedTab === "classroom"
                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                            >
                                Classroom
                            </button>

                            <button
                                role="tab"
                                aria-selected={selectedTab === "mentee"}
                                onClick={() => setSelectedTab("mentee")}
                                className={`px-3 py-2 text-xs sm:text-sm transition duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                                    selectedTab === "mentee"
                                        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold"
                                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                            >
                                Mentee
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
                                    <select
                                        value={currentSem}
                                        onChange={(e) =>
                                            setCurrentSem(e.target.value)
                                        }
                                        className="appearance-none w-full px-3 py-2 rounded-md bg-white dark:bg-[#0f1720] text-sm text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                <div className=" overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 shadow-sm hidden sm:inline-flex">
                                    <button
                                        onClick={() => setView("cards")}
                                        className={`px-3 py-2 text-xs sm:text-sm transition ${
                                            view === "cards"
                                                ? "bg-slate-900 text-white"
                                                : "text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        Cards
                                    </button>
                                    <button
                                        onClick={() => setView("table")}
                                        className={`px-3 py-2 text-xs sm:text-sm transition ${
                                            view === "table"
                                                ? "bg-slate-900 text-white"
                                                : "text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        Table
                                    </button>
                                    <button
                                        onClick={() => setView("ai")}
                                        className={`px-3 py-2 text-xs sm:text-sm transition ${
                                            view === "ai"
                                                ? "bg-slate-900 text-white"
                                                : "text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        {"AI"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
                                Click{" "}
                                <span className="font-medium text-gray-700 dark:text-gray-200">
                                    Result
                                </span>{" "}
                                to pick a semester.
                            </div>
                        )}
                    </div>
                </section>

                {/* Main content */}
                <section>
                    {selectedTab === "" && (
                        <div className="max-w-3xl mx-auto text-center text-sm text-gray-600 dark:text-gray-300 py-6">
                            Please select{" "}
                            <span className="font-medium">Result</span>,{" "}
                            <span className="font-medium">Classroom</span>, or{" "}
                            <span className="font-medium">Mentee</span> to
                            continue.
                        </div>
                    )}

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
                    </div>
                </section>
            </div>
        </main>
    );
}
