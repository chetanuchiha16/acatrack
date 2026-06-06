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

    if (loading) {
        return <LoadingSpinner message="Authenticating Dashboard..." fullScreen={true} />;
    }
    
    const staffId = user?.id;
    const staffName = user?.name;
    const mentorId = user?.mentor_id;

    const cards = [
        {
            title: "Result Viewer",
            desc: "View and manage all student results",
            bgColor: "bg-red-300 dark:bg-red-800",
            hoverColor: "hover:bg-red-400 dark:hover:bg-red-700",
            action: () => void navigate(`/auth/Staff/${staffId}/StaffResults`)
        },
        {
            title: "Email Dispatcher",
            desc: "Send emails and manage communications",
            bgColor: "bg-blue-300 dark:bg-blue-800",
            hoverColor: "hover:bg-blue-400 dark:hover:bg-blue-700",
            action: () => void navigate(`/auth/Staff/${staffId}/SendEmails`)
        },
        {
            title: "Upload Results",
            desc: "Upload and update student results files",
            bgColor: "bg-green-300 dark:bg-green-800",
            hoverColor: "hover:bg-green-400 dark:hover:bg-green-700",
            action: () => void navigate(`/auth/Staff/${staffId}/UploadResults`)
        },
        {
            title: "Classroom Manager",
            desc: "Upload and manage classroom sessions",
            bgColor: "bg-yellow-200 dark:bg-yellow-700",
            hoverColor: "hover:bg-yellow-300 dark:hover:bg-yellow-600",
            action: () => void navigate(`/auth/Staff/${staffId}/StaffClassroom`)
        },
        {
            title: "Mentees Portal",
            desc: "View and manage all assigned mentees",
            bgColor: "bg-orange-200 dark:bg-orange-700",
            hoverColor: "hover:bg-orange-300 dark:hover:bg-orange-600",
            action: () => void navigate(`/auth/Staff/${staffId}/MentorDashboard`, { state: { mentor_id: mentorId } })
        }
    ];

    return (
        <div className="min-h-screen w-screen bg-gray-100 dark:bg-gray-900 px-4 sm:px-8 md:px-16 py-4 sm:py-6">
            {/* Top Navigation Row */}
            <div className="flex flex-row items-center justify-between mb-6">
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
                
                <h1 className="text-2xl mt-4 sm:mt-0 sm:text-3xl sm:mr-23 md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center">
                    Staff Portal
                </h1>
                
                <div>
                    <LogoutButton size="sm" />
                </div>
            </div>

            {/* Separator Line */}
            <div className="w-[95%] mx-auto h-[2px] bg-gray-300 my-4 mt-[-4] rounded shadow-sm" />

            {/* Welcome message */}
            <div className="space-y-2 mb-8 mt-2 text-center">
                <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    Welcome back, {staffName || "Staff Member"}
                </p>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
                    Manage student performance metrics, coordinate communication cycles, and log classroom events.
                </p>
            </div>

            {/* Grid of Navigation Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-5xl mx-auto">
                {cards.map((card, idx) => (
                    <div
                        key={idx}
                        className={`${card.bgColor} ${card.hoverColor} text-black dark:text-white cursor-pointer rounded-xl shadow-lg p-6 sm:p-8 transition-all duration-200`}
                        onClick={card.action}
                    >
                        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2">
                            {card.title}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                            {card.desc}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Staff;
