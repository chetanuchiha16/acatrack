import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Result from "./Result";
import Classroom from "./Classroom";
import LogoutButton from "./LogoutButton";
import MenteeRecieveEmails from "./MenteeRecieveEmails";

export default function Student() {
    let { who, id, name } = useLocation().state || {};
    let [selectedTab, setSelectedTab] = useState("result");
    let [currentSem, setCurrentSem] = useState("");

    const sems = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6"];

    return (
        <main className="flex flex-col items-center justify-center w-full px-4 py-6">
            <LogoutButton />

            <section className="flex flex-wrap justify-center items-center gap-4 mb-6">
                <nav className="flex border-2 border-black rounded overflow-hidden">
                    <button
                        className={`px-4 py-2 border-r border-black transition duration-150 ${
                            selectedTab === "result"
                                ? "bg-blue-200 dark:bg-blue-700"
                                : "bg-white dark:bg-[#1a1a1a]"
                        }`}
                        onClick={() => setSelectedTab("result")}
                    >
                        Result
                    </button>
                    <button
                        className={`px-4 py-2 transition duration-150 ${
                            selectedTab === "classroom"
                                ? "bg-blue-200 dark:bg-blue-700"
                                : "bg-white dark:bg-[#1a1a1a]"
                        }`}
                        onClick={() => setSelectedTab("classroom")}
                    >
                        Classroom
                    </button>
                    <button
                        className={`px-4 py-2 transition duration-150 ${
                            selectedTab === "mentee"
                                ? "bg-blue-200 dark:bg-blue-700"
                                : "bg-white dark:bg-[#1a1a1a]"
                        }`}
                        onClick={() => setSelectedTab("mentee")}
                    >
                        Mentee
                    </button>
                </nav>

                <fieldset className="border-2 border-black rounded">
                    <legend className="sr-only">Select Semester</legend>
                    <select
                        className="px-3 py-2 rounded bg-white dark:bg-[#1a1a1a] text-black dark:text-white"
                        value={currentSem}
                        onChange={(e) => setCurrentSem(e.target.value)}
                    >
                        <option value="">Select Semester</option>
                        {sems.map((sem, i) => (
                            <option key={i} value={sem}>
                                {sem}
                            </option>
                        ))}
                    </select>
                </fieldset>
            </section>

            <div className="w-full max-w-6xl flex justify-center items-center">
                {selectedTab === "result" && (
                    <Result usn={id} semester={currentSem} />
                )}
                {selectedTab === "classroom" && <Classroom />}
                {selectedTab === "mentee" && <MenteeRecieveEmails usn={id} />}
                {/* {selectedTab === "none" && <div className="w-[80vw] h-[70vh] flex justify-center items-center border-4 border-black rounded-xl dark:text-white dark:bg-[#1a1a1a] text-black backdrop-blur-sm p-4 overflow-hidden"></div>}  */}

                {/* {selectedTab === "notes" && <FileExplorer />}  */}
            </div>
        </main>
    );
}
