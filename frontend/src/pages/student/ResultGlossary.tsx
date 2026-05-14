import React, { useState } from "react";
import { Info } from "lucide-react";

const ResultGlossary: React.FC = () => {
    const [isOpen, setIsOpen] = useState<boolean>(false);

    return (
        <div className="relative mt-2 sm:mt-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors p-1 rounded-md"
            >
                <Info size={16} />
                <span>What do these terms mean?</span>
            </button>

            {isOpen && (
                <div className="absolute z-10 w-64 sm:w-80 mt-2 p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl right-0 sm:left-0 sm:right-auto text-sm text-gray-700 dark:text-gray-300">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">Quick Guide</h4>
                    <ul className="space-y-3">
                        <li>
                            <strong className="text-gray-900 dark:text-white">SGPA:</strong> Your grade for just this semester (out of 10).
                        </li>
                        <li>
                            <strong className="text-gray-900 dark:text-white">CGPA:</strong> Your overall overall grade across all semesters (out of 10).
                        </li>
                        <li>
                            <strong className="text-gray-900 dark:text-white">IA:</strong> Internal Marks. These are marks from tests and assignments given by the teacher during classes.
                        </li>
                        <li>
                            <strong className="text-gray-900 dark:text-white">SEE:</strong> Semester End Exam. These are the marks from the final board exams.
                        </li>
                        <li>
                            <strong className="text-gray-900 dark:text-white">Credits:</strong> The weight or importance of a subject. Higher credits mean the subject impacts your grade more.
                        </li>
                    </ul>
                    <button 
                        onClick={() => setIsOpen(false)}
                        className="mt-4 w-full py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-center font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
    );
};

export default ResultGlossary;
