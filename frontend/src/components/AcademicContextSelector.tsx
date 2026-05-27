import React, { useEffect } from 'react';
import { Calendar, Layers, Hash, ChevronDown } from 'lucide-react';
import useStaffStore from '../store/useStaffStore';

const AcademicContextSelector: React.FC = () => {
    const { batchYear, semester, section, setSemester, setSection, assignments } = useStaffStore();
    
    const semesters = ['sem1', 'sem2', 'sem3', 'sem4', 'sem5', 'sem6', 'sem7', 'sem8'];
    
    // Filter sections based on teacher's assignments for the active semester
    const semAssignments = assignments.filter(
        a => a.semester === semester && a.section_name
    );
    const assignedSections = Array.from(
        new Set(semAssignments.map(a => a.section_name as string))
    ).sort();

    const sections = assignedSections.length > 0
        ? assignedSections
        : ['ALL', 'A', 'B', 'C', 'D'];

    // Self-healing: auto-select the first allowed section if the current one is not allowed
    useEffect(() => {
        if (sections.length > 0 && !sections.includes(section)) {
            setSection(sections[0]);
        }
    }, [sections, section, setSection]);

    return (
        <div className="flex flex-wrap items-center gap-3 p-1.5 bg-gray-100/50 dark:bg-gray-900/30 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm shadow-inner">
            {/* Semester Selector */}
            <div className="group relative flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-500/50 transition-all duration-300">
                <Calendar className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Semester</span>
                    <div className="relative flex items-center">
                        <select 
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="appearance-none bg-transparent text-xs font-black text-gray-900 dark:text-white outline-none cursor-pointer pr-4 z-10 uppercase"
                        >
                            {semesters.map(s => (
                                <option key={s} value={s} className="bg-white dark:bg-gray-900">{s.toUpperCase()}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-0 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Section Selector */}
            <div className="group relative flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-emerald-500/50 transition-all duration-300">
                <Layers className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Section</span>
                    <div className="relative flex items-center">
                        <select 
                            value={section}
                            onChange={(e) => setSection(e.target.value)}
                            className="appearance-none bg-transparent text-xs font-black text-gray-900 dark:text-white outline-none cursor-pointer pr-4 z-10"
                        >
                            {sections.map(s => (
                                <option key={s} value={s} className="bg-white dark:bg-gray-900">{s}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-0 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Batch Display (Fixed from Sidebar) */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-200/30 dark:border-gray-700/30 opacity-70">
                <Hash className="w-4 h-4 text-amber-500" />
                <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Active Batch</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white tracking-tight">
                        {batchYear || '---'}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default AcademicContextSelector;
