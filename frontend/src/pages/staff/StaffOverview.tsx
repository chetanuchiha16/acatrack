import React from "react";
import { NavLink } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import {
    GraduationCap,
    Mail,
    Upload,
    BookOpen,
    Users,
    ArrowRight,
} from "lucide-react";

const tiles = [
    {
        name: "Results",
        desc: "View and manage semester, subject, and overall student results.",
        path: "results",
        icon: <GraduationCap size={28} />,
        gradient: "from-rose-500 to-pink-600",
        bgLight: "bg-rose-50",
        textLight: "text-rose-700",
        borderLight: "border-rose-200",
    },
    {
        name: "Emails",
        desc: "Send emails to individual students, parents, or broadcast to all.",
        path: "emails",
        icon: <Mail size={28} />,
        gradient: "from-blue-500 to-indigo-600",
        bgLight: "bg-blue-50",
        textLight: "text-blue-700",
        borderLight: "border-blue-200",
    },
    {
        name: "Upload Results",
        desc: "Upload and edit student result spreadsheets directly in the browser.",
        path: "upload",
        icon: <Upload size={28} />,
        gradient: "from-emerald-500 to-teal-600",
        bgLight: "bg-emerald-50",
        textLight: "text-emerald-700",
        borderLight: "border-emerald-200",
    },
    {
        name: "Classroom",
        desc: "Upload and manage classroom notes and study materials for students.",
        path: "classroom",
        icon: <BookOpen size={28} />,
        gradient: "from-amber-500 to-orange-600",
        bgLight: "bg-amber-50",
        textLight: "text-amber-700",
        borderLight: "border-amber-200",
    },
    {
        name: "Mentees",
        desc: "View mentee results, schedule meetings, and manage records.",
        path: "mentees",
        icon: <Users size={28} />,
        gradient: "from-violet-500 to-purple-600",
        bgLight: "bg-violet-50",
        textLight: "text-violet-700",
        borderLight: "border-violet-200",
    },
];

const StaffOverview: React.FC = () => {
    const user = useAuthStore((s) => s.user);
    const name = user?.name || "Staff Member";

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <div className="bg-white dark:bg-gray-800/80 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden backdrop-blur-sm">
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Welcome back, {name} 👋
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 max-w-xl">
                        Manage results, classroom sessions, and communications efficiently from your dashboard.
                    </p>
                </div>
            </div>

            {/* Bento Navigation Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {tiles.map((tile) => (
                    <NavLink
                        key={tile.name}
                        to={tile.path}
                        className="group relative bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden backdrop-blur-sm"
                    >
                        {/* Hover gradient overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${tile.gradient} opacity-0 group-hover:opacity-[0.04] dark:group-hover:opacity-[0.08] transition-opacity duration-300 rounded-2xl`}></div>

                        <div className="relative z-10">
                            <div className={`inline-flex p-3 rounded-xl ${tile.bgLight} dark:bg-gray-700/50 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                <span className={`${tile.textLight} dark:text-gray-300`}>{tile.icon}</span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                {tile.name}
                                <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 text-gray-400" />
                            </h3>

                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                {tile.desc}
                            </p>
                        </div>
                    </NavLink>
                ))}
            </div>
        </div>
    );
};

export default StaffOverview;
