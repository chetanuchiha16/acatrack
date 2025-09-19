import React, { useState, useEffect } from "react";
import jssLogo from "./assets/jssLogo.png";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import API_BASE from "./config";
import LogoutButton from "./LogoutButton";
import { useTranslation } from "react-i18next";
import useAuthStore from "./useAuthStore";
import useStudentStore from "./useStudentStore";
import useProtectedPage from "./useProtectedPage";
export default function ParentDashboard() {
    let navigate = useNavigate();
    const { t, i18n } = useTranslation();
    // const location = useLocation();
    // const params = useParams();
    // const { user, fetchAuthStatus, loading: authLoading } = useAuthStore();
    // const {
    //     studentData,
    //     fetchStudentData,
    //     loading: studentLoading,
    // } = useStudentStore();

    // // const { who, id, name, mentor_id } = location.state || {};
    // // const finalWho = who || params.who;
    // // const finalId = id || params.id;

    // // console.log("finalId:", finalId);
    // // console.log("mentor_id", mentor_id);
    // // const [isDark, setIsDark] = useState(false);

    // // Fetch student details
    // // const { studentData, fetchStudentData, loading } = useStudentStore();
    // // Fetch auth status on mount
    // useEffect(() => {
    //     if (!user) fetchAuthStatus();
    // }, [user, fetchAuthStatus]);

    // // useEffect(() => {
    // //     if (!studentData) fetchStudentData();
    // // }, [studentData, fetchStudentData]);
    // // Fetch student details after auth is ready
    // useEffect(() => {
    //     if (user && !studentData) fetchStudentData();
    // }, [user, studentData, fetchStudentData]);

    // useEffect(() => {
    //     if (!authLoading && !user) {
    //         navigate("/auth");
    //     }
    // }, [authLoading, user, navigate]);
    // // if (loading) return <div>Loading...</div>;
    // if (authLoading || studentLoading) return <div>Loading...</div>;
    const { user, studentData, loading } = useProtectedPage("Parent");

    if (loading) return <div>Loading...</div>;

    // Switch language function
    const changeLanguage = (lng) => i18n.changeLanguage(lng);

    const { id, name, who } = user || {};
    return (
        <div className="min-h-screen w-screen dark:bg-gray-900 px-4 sm:px-8 md:px-16 py-4 sm:py-6">
            {/* Header */}
            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 mb-6">
                <img
                    src={jssLogo}
                    alt="JSS Logo"
                    className="drop-shadow-2xl w-28 sm:w-32 md:w-40"
                />
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center flex-1">
                    {t("welcome")}
                </span>
                {/* Language switcher */}
                <div className="flex justify-end gap-2 mb-4">
                    <select
                        value={i18n.language}
                        onChange={(e) => changeLanguage(e.target.value)}
                        className="px-2 py-1 border rounded-md text-sm dark:bg-gray-800 dark:text-gray-100"
                    >
                        <option value="en">
                            English&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        </option>
                        <option value="hi">
                            हिंदी&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        </option>
                        <option value="kan">
                            ಕನ್ನಡ&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                        </option>
                    </select>
                </div>
                <LogoutButton />
            </div>

            {/* Divider */}
            <div className="w-[95%] mx-auto h-[2px] bg-gray-300 my-4 mt-[-4] rounded shadow-sm"></div>

            {/* Welcome Section */}
            <div className="space-y-2 mb-8 text-center sm:text-center lg:text-center">
                {/* <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {t("welcome")}
        </p> */}
                {/* <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
          {t("description")}
        </p> */}
            </div>
            {/* Dashboard Section with Mentor Contact on the left */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                {/* Mentor Contact Card (info only) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">
                        {studentData?.mentor
                            ? `${studentData.student.name}'s Mentor`
                            : "Mentor Contact"}
                    </h2>

                    {studentData?.mentor ? (
                        <div className="space-y-2 text-sm sm:text-base">
                            <p>
                                <span className="font-medium">Name:</span>{" "}
                                {studentData.mentor.name}
                            </p>
                            <p>
                                <span className="font-medium">Email:</span>{" "}
                                <a
                                    href={`mailto:${studentData.mentor.email}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {studentData.mentor.email}
                                </a>
                            </p>
                            <p>
                                <span className="font-medium">Phone:</span>{" "}
                                <a
                                    href={`tel:${studentData.mentor.phone}`}
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {studentData.mentor.phone}
                                </a>
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-600 dark:text-gray-400 italic">
                            No mentor assigned
                        </p>
                    )}
                </div>

                {/* Result Card */}
                <div
                    className="bg-red-300 dark:bg-red-800 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-red-400 dark:hover:bg-red-700 transition-all duration-200"
                    onClick={() => navigate(`/auth/Parent/${id}/ParentResult`)}
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        {t("result")}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        {t("resultDesc")}
                    </p>
                </div>

                {/* Chatbot Card */}
                <div
                    className="bg-blue-300 dark:bg-blue-800 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-blue-400 dark:hover:bg-blue-700 transition-all duration-200"
                    onClick={() => navigate(`/auth/Parent/${id}/ChatBot`)}
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        {t("chatbot")}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        {t("chatbotDesc")}
                    </p>
                </div>
            </div>
        </div>
    );
}
