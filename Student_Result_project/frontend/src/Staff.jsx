import React, { useState } from "react";
import jssLogo from "./assets/jssLogo.png";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import API_BASE from "./config";
import LogoutButton from "./LogoutButton";
export default function Staff() {
    let navigate = useNavigate();
    const location = useLocation();
    const params = useParams();

    const { who, id, name } = location.state || {};
    const finalWho = who || params.who;
    const finalId = id || params.id;

    console.log("finalId:", finalId);
    const [isDark, setIsDark] = useState(false);
    return (
        <div className="min-h-screen w-screen bg-gray-200 dark:bg-gray-900 px-4 sm:px-8 md:px-16 py-4 sm:py-6">
            {/* Header */}

            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 mb-10">
                <img
                    src={jssLogo}
                    alt="JSS Logo"
                    className="drop-shadow-2xl w-28 sm:w-32 md:w-40"
                />
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center flex-1">
                    Staff Dashboard
                </span>

                {/* Home button (absolute on small screens) */}
                {/* <div
                    className="cursor-pointer px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-700 text-black dark:text-white shadow hover:scale-105 hover:shadow-lg transition-all duration-300 text-center text-sm sm:text-base 
                               absolute right-4 top-2 sm:static sm:right-auto sm:top-auto"
                    // onClick={async () => {
                    //     try {
                    //         const res = await axios.post(`${API_BASE}/logout`);
                    //         console.log(res.data);
                    //         // Redirect after successful logout
                    //         navigate(`/auth`); // or "/" or wherever your login page is
                    //     } catch (error) {
                    //         console.error("Logout failed:", error);
                    //     }
                    // }}
                >
                    Home
                </div> */}
                <LogoutButton />
            </div>

            {/* Welcome Section */}
            <div className="space-y-2 mb-8 text-center sm:text-center lg:text-center">
                <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Welcome to the Staff Dashboard
                </p>

                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
                    Here you can view student results, upload notes, and more.
                </p>
            </div>

            {/* Dashboard Options */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl mx-auto">
                <div
                    className="bg-red-200 dark:bg-red-800 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-red-300 dark:hover:bg-red-700 transition-all duration-200"
                    onClick={() =>
                        navigate(`/auth/Staff/${finalId}/StaffResults`)
                    }
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        Result
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        View and manage results
                    </p>
                </div>

                <div className="bg-blue-200 dark:bg-blue-800 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-blue-300 dark:hover:bg-blue-700 transition-all duration-200">
                    <h2
                        className="text-lg sm:text-xl md:text-2xl font-semibold mb-2"
                        onClick={() => {
                            navigate(`/auth/Staff/${finalId}/SendEmails`);
                        }}
                    >
                        Email Upload
                    </h2>

                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        View and manage results
                    </p>
                </div>

                <div
                    className="bg-green-200 dark:bg-green-800 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-green-300 dark:hover:bg-green-700 transition-all duration-200"
                    onClick={() =>
                        navigate(`/auth/Staff/${finalId}/UploadResults`)
                    }
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        Upload results
                    </h2>

                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        View and manage results
                    </p>
                </div>

                <div
                    className="bg-yellow-100 dark:bg-yellow-700 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-yellow-200 dark:hover:bg-yellow-600 transition-all duration-200"
                    onClick={() =>
                        navigate(`/auth/Staff/${finalId}/StaffClassroom`)
                    }
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        Classroom
                    </h2>

                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        View and manage Classroom
                    </p>
                </div>
                <div
                    className="bg-orange-100 dark:bg-orange-700 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-yellow-200 dark:hover:bg-orange-600 transition-all duration-200"
                    onClick={() =>
                        navigate(`/auth/Staff/${finalId}/MentorDashboard`)
                    }
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        Mentees
                    </h2>

                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        View and manage Mentees
                    </p>
                </div>
            </div>
        </div>
    );
}
