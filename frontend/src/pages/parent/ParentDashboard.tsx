import React from "react";
import jssLogo from "../../assets/jssLogo.png";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { useTranslation } from "react-i18next";
import useProtectedPage from "../../hooks/useProtectedPage";
import LoadingSpinner from "../../components/LoadingSpinner";

const ParentDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    
    const { user, studentData, loading } = useProtectedPage("Parent");

    if (loading) return <LoadingSpinner message="Authenticating Dashboard..." fullScreen={true} />;

    // Switch language function
    const changeLanguage = async (lng: string): Promise<void> => {
        await i18n.changeLanguage(lng);
    };

    const { id } = user || {};
    
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
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => changeLanguage(e.target.value)}
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
            <div className="space-y-2 mb-6 text-center sm:text-center lg:text-center">
            </div>
            
            {/* Dashboard Section with Mentor Contact on the left */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 max-w-5xl mx-auto mt-4">
                {/* Mentor Contact Card (info only) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4">
                        {studentData?.mentor
                            ? `${studentData.student?.name || "Student"}'s Mentor`
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
                    className="bg-green-500 dark:bg-green-700 text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-green-600 dark:hover:bg-green-800 transition-all duration-200 flex flex-col items-center justify-center text-center"
                    onClick={() => navigate(`/auth/Parent/${id}/ParentResult`)}
                >
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
                        {t("viewResults")}
                    </h2>
                </div>



            </div>
        </div>
    );
};

export default ParentDashboard;
