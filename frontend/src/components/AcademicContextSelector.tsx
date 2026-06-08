import React, { useEffect, useState, useRef } from 'react';
import { Calendar, Layers, Hash, ChevronDown } from 'lucide-react';
import useStaffStore from '../store/useStaffStore';

const AcademicContextSelector: React.FC = () => {
    const { batchYear, semester, section, setSemester, setSection, assignments, availableSems } = useStaffStore();
    
    const [isSemOpen, setIsSemOpen] = useState(false);
    const [isSecOpen, setIsSecOpen] = useState(false);
    
    const semRef = useRef<HTMLDivElement>(null);
    const secRef = useRef<HTMLDivElement>(null);

    const semesters = availableSems;
    
    // Filter sections based on teacher's assignments for the active semester
    const sections = React.useMemo(() => {
        const semAssignments = assignments.filter(
            a => a.semester === semester && a.section_name
        );
        const assignedSections = Array.from(
            new Set(semAssignments.map(a => a.section_name as string))
        ).sort();

        return assignedSections.length > 0
            ? assignedSections
            : ['ALL', 'A', 'B', 'C', 'D'];
    }, [assignments, semester]);

    // Self-healing: auto-select the first allowed section if the current one is not allowed
    useEffect(() => {
        if (sections.length > 0 && !sections.includes(section)) {
            setSection(sections[0]);
        }
    }, [sections, section, setSection]);

    // Close dropdowns on clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (semRef.current && !semRef.current.contains(event.target as Node)) {
                setIsSemOpen(false);
            }
            if (secRef.current && !secRef.current.contains(event.target as Node)) {
                setIsSecOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex flex-wrap items-center gap-3 p-1.5 bg-gray-100/50 dark:bg-gray-900/30 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 backdrop-blur-sm shadow-inner relative z-20">
            {/* Semester Selector */}
            <div 
                ref={semRef}
                className="group relative flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-indigo-500/50 cursor-pointer select-none transition-all duration-300"
                onClick={() => setIsSemOpen(!isSemOpen)}
            >
                <Calendar className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col pr-1">
                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Semester</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        {semester}
                    </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isSemOpen ? 'rotate-180 text-indigo-500' : ''}`} />

                {isSemOpen && (
                    <div className="absolute top-full left-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl z-[100] py-1.5 animate-fadeIn backdrop-blur-md">
                        {semesters.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSemester(s);
                                    setIsSemOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-xs font-bold uppercase transition-all duration-200 first:rounded-t-lg last:rounded-b-lg
                                    ${semester === s 
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-l-2 border-indigo-500 pl-3' 
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Section Selector */}
            <div 
                ref={secRef}
                className="group relative flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:border-emerald-500/50 cursor-pointer select-none transition-all duration-300"
                onClick={() => setIsSecOpen(!isSecOpen)}
            >
                <Layers className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col pr-1">
                    <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest leading-none mb-0.5">Section</span>
                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                        {section}
                    </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isSecOpen ? 'rotate-180 text-emerald-500' : ''}`} />

                {isSecOpen && (
                    <div className="absolute top-full left-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-xl shadow-xl z-[100] py-1.5 animate-fadeIn backdrop-blur-md">
                        {sections.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSection(s);
                                    setIsSecOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-xs font-bold transition-all duration-200 first:rounded-t-lg last:rounded-b-lg
                                    ${section === s 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-l-2 border-emerald-500 pl-3' 
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-2 border-transparent'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Batch Display (Fixed from Sidebar) */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-200/30 dark:border-gray-700/30 opacity-70 select-none">
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
