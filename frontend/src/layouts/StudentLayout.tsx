import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import jssLogo from "../assets/jssLogo.png";
import LogoutButton from "../components/LogoutButton";
import useProtectedPage from "../hooks/useProtectedPage";
import LoadingSpinner from "../components/LoadingSpinner";
import { 
    LayoutDashboard, 
    GraduationCap, 
    BookOpen, 
    Mail, 
    FileText,
    Menu,
    X
} from "lucide-react";

const StudentLayout: React.FC = () => {
    const { user, loading } = useProtectedPage("Student");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    if (loading) return <LoadingSpinner message="Authenticating Dashboard..." fullScreen={true} />;
    if (!user) return null;

    const id = user.id || "";
    
    const navItems = [
        { name: "Overview", path: `/auth/Student/${id}`, icon: <LayoutDashboard size={20} />, exact: true },
        { name: "Results", path: `/auth/Student/${id}/results`, icon: <GraduationCap size={20} /> },
        { name: "Classroom", path: `/auth/Student/${id}/classroom`, icon: <BookOpen size={20} /> },
        { name: "Mentee Record", path: `/auth/Student/${id}/record`, icon: <FileText size={20} /> },
        { name: "Mentorship Emails", path: `/auth/Student/${id}/mentee`, icon: <Mail size={20} /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside 
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="h-full flex flex-col">
                    {/* Sidebar Header */}
                    <div className="px-6 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <img src={jssLogo} alt="JSS Logo" className="w-32 h-auto cursor-pointer" onClick={() => navigate(`/auth/Student/${id}`)} />
                        <button 
                            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            onClick={() => setSidebarOpen(false)}
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        <div className="mb-4 px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Menu
                        </div>
                        {navItems.map((item) => (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                end={item.exact}
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                                        isActive
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                    }`
                                }
                            >
                                {item.icon}
                                {item.name}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.id}</p>
                        </div>
                        <div className="w-full flex justify-center">
                            <LogoutButton size="sm" />
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header (Mobile mainly, or for breadcrumbs) */}
                <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-sm lg:hidden">
                    <div className="flex items-center gap-3">
                        <button 
                            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white lg:hidden"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={24} />
                        </button>
                        <span className="font-semibold text-gray-800 dark:text-gray-100">Dashboard</span>
                    </div>
                    <img src={jssLogo} alt="JSS Logo" className="w-20 h-auto sm:hidden" />
                </header>

                {/* Main Content Scrollable Area */}
                <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 p-4 sm:p-6 lg:p-8 flex flex-col">
                    <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StudentLayout;
