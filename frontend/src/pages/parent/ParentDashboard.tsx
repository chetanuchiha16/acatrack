import React from "react";
import { brandingConfig } from "../../config";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../../components/LogoutButton";
import { useTranslation } from "react-i18next";
import useProtectedPage from "../../hooks/useProtectedPage";
import LoadingSpinner from "../../components/LoadingSpinner";
import { 
    Users, GraduationCap, Mail, Phone, Calendar, 
    ArrowRight, UserCheck, Languages, BookOpen, UserCircle
} from "lucide-react";

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
        <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative overflow-hidden">
            {/* Animated Mesh Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-400 rounded-full blur-[130px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400 rounded-full blur-[130px] animate-pulse delay-1000" />
            </div>

            {/* Main Content Wrap */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 flex-1 flex flex-col gap-6">
                
                {/* Header Glass Card */}
                <header className="w-full bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-slate-800/50 rounded-[2rem] p-4 sm:p-6 shadow-xl shadow-slate-100/50 dark:shadow-none flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {brandingConfig.collegeLogo ? (
                            <img
                                src={brandingConfig.collegeLogo}
                                alt="College Logo"
                                className="h-12 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <GraduationCap className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden sm:inline">AcaTrack</span>
                            </div>
                        )}
                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-[0.2em]">Parent Portal</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                                {t("welcome", "Welcome to Parent Dashboard")}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        {/* Language Selector */}
                        <div className="relative flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200/50 dark:border-slate-700/50">
                            <Languages size={16} className="text-slate-400 dark:text-slate-500 mr-2" />
                            <select
                                value={i18n.language}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => changeLanguage(e.target.value)}
                                className="bg-transparent text-xs font-black text-slate-700 dark:text-slate-200 outline-none cursor-pointer pr-4 uppercase"
                            >
                                <option value="en">English</option>
                                <option value="hi">हिंदी</option>
                                <option value="kan">ಕನ್ನಡ</option>
                            </select>
                        </div>
                        <LogoutButton />
                    </div>
                </header>

                {/* Dashboard Bento Sections */}
                <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1">
                    
                    {/* Ward (Student) Info Card - 7 Columns on Large Screens */}
                    <section className="lg:col-span-7 bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl border border-white dark:border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50 dark:shadow-none flex flex-col justify-between relative overflow-hidden group">
                        {/* Soft visual accent */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] -mr-32 -mt-32" />
                        
                        <div>
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center">
                                        <GraduationCap size={20} />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs">
                                        Student Profile Overview
                                    </h2>
                                </div>
                                <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    Active Ward
                                </span>
                            </div>

                            {studentData?.student ? (
                                <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
                                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 transform group-hover:rotate-6 transition-all duration-500">
                                        <UserCircle size={44} className="stroke-[1.5]" />
                                    </div>
                                    <div className="space-y-3 flex-1 text-center sm:text-left">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                            {studentData.student.name}
                                        </h3>
                                        
                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                                            <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                                                {studentData.student.usn}
                                            </div>
                                            <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                                <Calendar size={12} />
                                                <span>Batch {studentData.student.batch_year}</span>
                                            </div>
                                            {studentData.student.section && (
                                                <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 text-xs font-bold text-blue-600 dark:text-blue-400">
                                                    Section {studentData.student.section}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-slate-500 dark:text-slate-400 font-bold italic">
                                        No student details registered for this account.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Informative Stats Footer */}
                        {studentData?.student && (
                            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                                <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-[#0b0f19]/30 border border-slate-100 dark:border-slate-800/80">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Affiliation</span>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{brandingConfig.collegeName}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-[#0b0f19]/30 border border-slate-100 dark:border-slate-800/80">
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Academic Status</span>
                                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <UserCheck size={12} /> Verified Profile
                                    </span>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Mentor Contact Card - 5 Columns on Large Screens */}
                    <section className="lg:col-span-5 bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl border border-white dark:border-slate-800/50 rounded-[2.5rem] p-8 shadow-xl shadow-slate-100/50 dark:shadow-none flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[80px] -mr-32 -mt-32" />

                        <div>
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center">
                                        <Users size={20} />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs">
                                        Academic Mentor
                                    </h2>
                                </div>
                                <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    Direct Contact
                                </span>
                            </div>

                            {studentData?.mentor ? (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black text-base shadow-sm">
                                            {studentData.mentor.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black text-slate-800 dark:text-white leading-snug">
                                                {studentData.mentor.name}
                                            </h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department Advisor</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 pt-2">
                                        {studentData.mentor.email && (
                                            <a
                                                href={`mailto:${studentData.mentor.email}`}
                                                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-[#0b0f19]/30 border border-slate-100 dark:border-slate-800/80 text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200/50 dark:hover:border-indigo-900/50 transition-all duration-300 group/link"
                                            >
                                                <Mail size={16} className="text-slate-400 group-hover/link:text-indigo-500 transition-colors" />
                                                <span className="truncate flex-1">{studentData.mentor.email}</span>
                                            </a>
                                        )}
                                        {studentData.mentor.phone && (
                                            <a
                                                href={`tel:${studentData.mentor.phone}`}
                                                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-[#0b0f19]/30 border border-slate-100 dark:border-slate-800/80 text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200/50 dark:hover:border-indigo-900/50 transition-all duration-300 group/link"
                                            >
                                                <Phone size={16} className="text-slate-400 group-hover/link:text-indigo-500 transition-colors" />
                                                <span className="truncate flex-1">{studentData.mentor.phone}</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-slate-500 dark:text-slate-400 font-bold italic text-sm">
                                        No academic mentor assigned yet.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                            Need help? Reach out directly to your ward's counselor for attendance or academic updates.
                        </div>
                    </section>
                    
                    {/* View Results Button Box - Full Width 12 Columns */}
                    <div className="col-span-1 lg:col-span-12">
                        <button
                            onClick={() => navigate(`/auth/Parent/${id}/ParentResult`)}
                            className="w-full py-8 px-8 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white rounded-[2.5rem] font-black text-xl sm:text-2xl shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex flex-col sm:flex-row items-center justify-between gap-4 group relative overflow-hidden text-left"
                        >
                            {/* Glass reflections */}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
                            
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shadow-inner">
                                    <BookOpen size={28} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="tracking-tight leading-none mb-1.5">{t("viewResults", "View Ward Academic Results")}</h3>
                                    <p className="text-xs sm:text-sm font-medium text-white/70">Analyze semester performance, GPA trajectory, and deep AI diagnostics</p>
                                </div>
                            </div>
                            
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center group-hover:translate-x-2 transition-transform duration-500 self-end sm:self-center">
                                <ArrowRight size={24} />
                            </div>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;
