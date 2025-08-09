import React, { useState } from "react";
import jssLogo from "./assets/jssLogo.png";
import { useLocation, useNavigate } from "react-router-dom";

export default function Staff() {
    let navigate = useNavigate();
    let { who, id, name } = useLocation().state || {};
    const [isDark, setIsDark] = useState(false);

    return (
        <div className="min-h-screen w-screen bg-gray-200 dark:bg-gray-900 px-20 py-3">
            {/* Header */}
            <div className="text-4xl font-bold mb-12 text-gray-800 dark:text-gray-100 flex items-center justify-between">
                <img
                    src={jssLogo}
                    alt="JSS Logo"
                    className="drop-shadow-2xl w-40"
                />

                <span className="flex-1 text-center">Staff Dashboard</span>

                <div className="cursor-pointer px-3 py-1.5 rounded-lg bg-gray-300 dark:bg-gray-700 text-black dark:text-white shadow hover:scale-105 hover:shadow-lg transition-all duration-300 text-center text-sm">
                    Home
                </div>
            </div>

            {/* Welcome */}
            <div className="space-y-2">
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Welcome to the Staff Dashboard
                </p>
                <p className="text-base text-gray-700 dark:text-gray-300 mb-10">
                    Here you can view student results, upload notes, and more.
                </p>
            </div>

            {/* Dashboard Options */}
            <div className="grid grid-cols-2 gap-4 w-[80%] mx-auto">
                <div
                    className="bg-red-200 dark:bg-red-800 text-black dark:text-white text-2xl font-semibold cursor-pointer rounded-xl shadow-lg p-10 hover:bg-red-300 dark:hover:bg-red-700 transition-all duration-200"
                    onClick={() => navigate(`/auth/Staff/${id}/StaffResults`)}
                >
                    <h2 className="text-2xl font-semibold mb-2">Result</h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        View and manage results
                    </p>
                </div>

                <div className="bg-blue-200 dark:bg-blue-800 text-black dark:text-white text-2xl font-semibold cursor-pointer rounded-xl shadow-lg p-10 hover:bg-blue-300 dark:hover:bg-blue-700 transition-all duration-200">
                    <h2 className="text-2xl font-semibold mb-2">
                        Subject-wise Upload
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        View and manage results
                    </p>
                </div>

                <div
                    className="bg-green-200 dark:bg-green-800 text-black dark:text-white text-2xl font-semibold cursor-pointer rounded-xl shadow-lg p-10 hover:bg-green-300 dark:hover:bg-green-700 transition-all duration-200"
                    onClick={() => navigate(`/auth/Staff/${id}/UploadResults`)}
                >
                    <h2 className="text-2xl font-semibold mb-2">
                        Upload results
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        View and manage results
                    </p>
                </div>

                <div className="bg-yellow-100 dark:bg-yellow-700 text-black dark:text-white text-2xl font-semibold cursor-pointer rounded-xl shadow-lg p-10 hover:bg-yellow-200 dark:hover:bg-yellow-600 transition-all duration-200">
                    <h2
                        className="text-2xl font-semibold mb-2"
                        onClick={() =>
                            navigate(`/auth/Staff/${id}/StaffClassroom`)
                        }
                    >
                        Classroom
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        View and manage Classroom
                    </p>
                </div>
            </div>
        </div>
    );
}
