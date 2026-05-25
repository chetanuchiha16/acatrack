import React from "react";
import useProtectedPage from "../../hooks/useProtectedPage";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "../../components/LoadingSpinner";
import {
  BookOpen,
  GraduationCap,
  Mail,
  FileText,
  ChevronRight,
} from "lucide-react";

interface LocationState {
    branch?: string;
}

const StudentOverview: React.FC = () => {
    const { user, loading } = useProtectedPage("Student");
    const location = useLocation();
    const params = useParams<{ id: string, branch?: string }>();
    const navigate = useNavigate();

    if (loading) return <LoadingSpinner message="Authenticating Dashboard..." fullScreen={true} />;
    if (!user) return null;

    const locationState = location.state as LocationState | null;
    const finalBranch = locationState?.branch || params.branch || "BE in Computer Science and Engineering";
    const finalName = user.name || "Student";
    const finalUsn = user.id || "USN";

    const navigateTo = (path: string) => {
        void navigate(`/auth/Student/${finalUsn}/${path}`, { state: locationState });
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Welcome Banner */}
            <section className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 shadow-lg text-white relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2">
                        Welcome back, {finalName.split(" ")[0]}! 👋
                    </h1>
                    <p className="text-blue-100 max-w-xl text-sm sm:text-base">
                        Here's an overview of your academic progress, classroom updates, and mentorship status.
                    </p>
                </div>
                {/* Decorative background element */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            </section>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">USN</p>
                        <p className="font-extrabold text-base text-gray-900 dark:text-white truncate max-w-[120px]">{finalUsn}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Branch</p>
                        <p className="font-extrabold text-base text-gray-900 dark:text-white truncate max-w-[150px]" title={finalBranch}>{finalBranch}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Mentorship Record</p>
                        <p className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">Active</p>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                        <Mail size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Emails</p>
                        <p className="font-extrabold text-base text-amber-600 dark:text-amber-400">Check Inbox</p>
                    </div>
                </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Results Card */}
                <div 
                    onClick={() => navigateTo("results")}
                    className="lg:col-span-2 group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                                <GraduationCap size={28} />
                            </div>
                            <ChevronRight className="text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Semester Results</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            View your SGPA, CGPA, and detailed subject-wise performance. Access AI-driven insights for improvement.
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-100 dark:border-gray-700 text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center">
                        View Academic Performance
                    </div>
                </div>

                {/* Mentee Record Card */}
                <div 
                    onClick={() => navigateTo("record")}
                    className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[220px]"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <FileText size={28} />
                            </div>
                            <ChevronRight className="text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Mentee Record</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Fill and submit your regular mentorship meeting details.
                        </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-100 dark:border-gray-700 text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center">
                        Update Record
                    </div>
                </div>

                {/* Classroom Card */}
                <div 
                    onClick={() => navigateTo("classroom")}
                    className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[200px]"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <BookOpen size={28} />
                            </div>
                            <ChevronRight className="text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Classroom</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            Access notes, assignments, and announcements shared by your teachers.
                        </p>
                    </div>
                </div>

                {/* Mentee Emails Card */}
                <div 
                    onClick={() => navigateTo("mentee")}
                    className="lg:col-span-2 group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col justify-between min-h-[200px]"
                >
                    <div className="p-6 flex flex-col sm:flex-row gap-6">
                        <div className="flex-shrink-0">
                            <div className="p-4 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl">
                                <Mail size={32} />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                Mentorship Messages
                                <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 rounded-full font-medium">Inbox</span>
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-lg mb-4">
                                Stay connected with your mentor. Check for recent announcements, meeting links, or personalized feedback sent directly to you.
                            </p>
                            <span className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center group-hover:underline">
                                Open Inbox <ChevronRight size={16} className="ml-1" />
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default StudentOverview;
