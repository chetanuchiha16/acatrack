import React from "react";
import { brandingConfig } from "../../config";
import { GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import useProtectedPage from "../../hooks/useProtectedPage";
import LoadingSpinner from "../../components/LoadingSpinner";

const Staff: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading } = useProtectedPage("Staff");

    if (loading) return <LoadingSpinner message="Authenticating Dashboard..." fullScreen={true} />;
    
    const id = user?.id;
    const name = user?.name;
    const mentor_id = user?.mentor_id;
    
    return (
        <div className="min-h-screen w-screen bg-gray-100 dark:bg-gray-900 px-4 sm:px-8 md:px-16 py-4 sm:py-6">
            {/* Header */}

            <div className="flex flex-row items-center justify-between mb-6 ">
                {brandingConfig.collegeLogo ? (
                    <img
                        src={brandingConfig.collegeLogo}
                        alt="College Logo"
                        className="drop-shadow-2xl w-28 sm:w-32 md:w-40"
                    />
                ) : (
                    <div className="flex items-center gap-2">
                        <GraduationCap className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                        <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white hidden sm:inline">AcaTrack</span>
                    </div>
                )}
                <div className="text-2xl mt-4 sm:mt-0 sm:text-3xl sm:mr-23 md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center">
                    Staff Dashboard
                </div>
                <div>
                    <LogoutButton size="sm" />
                </div>
            </div>

            {/* Divider */}
            <div className="w-[95%] mx-auto h-[2px] bg-gray-300 my-4 mt-[-4] rounded shadow-sm"></div>

            {/* Welcome Section */}
            <div className="space-y-2 mb-8 mt-2 text-center sm:text-center lg:text-center">
                <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Welcome , {name || "Staff Member"}
                </p>

                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
                    Manage results, classroom sessions, and communications
                    efficiently from your dashboard.
                </p>
            </div>

            {/* Dashboard Options */}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl mx-auto">
                <div
                    className="bg-red-300 dark:bg-red-800 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-red-400 dark:hover:bg-red-700 transition-all duration-200 "
                    onClick={() => void navigate(`/auth/Staff/${id}/StaffResults`)}
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        Result
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        View and manage results
                    </p>
                </div>

                <div
                    className="bg-blue-300 dark:bg-blue-800 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-blue-400 dark:hover:bg-blue-700 transition-all duration-200"
                    onClick={() => {
                        void navigate(`/auth/Staff/${id}/SendEmails`);
                    }}
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        Email Upload
                    </h2>

                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        Send emails and manage communications
                    </p>
                </div>

                <div
                    className="bg-green-300 dark:bg-green-800 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-green-400 dark:hover:bg-green-700 transition-all duration-200"
                    onClick={() => void navigate(`/auth/Staff/${id}/UploadResults`)}
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        Upload results
                    </h2>

                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        Upload and update student results
                    </p>
                </div>

                <div
                    className="bg-yellow-200 dark:bg-yellow-700 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-yellow-300 dark:hover:bg-yellow-600 transition-all duration-200"
                    onClick={() => void navigate(`/auth/Staff/${id}/StaffClassroom`)}
                >
                    <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                        Classroom
                    </h2>

                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                        Upload and manage classroom sessions
                    </p>
                </div>
                <div
                    className="bg-orange-200 dark:bg-orange-700 text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 hover:bg-orange-300 dark:hover:bg-orange-600 transition-all duration-200"
                    onClick={() =>
                        navigate(`/auth/Staff/${id}/MentorDashboard`, {
                            state: { mentor_id },
                        })
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
};

export default Staff;
