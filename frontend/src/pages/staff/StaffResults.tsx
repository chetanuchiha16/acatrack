import React, { useState } from "react";
import { GraduationCap } from "lucide-react";
import SemesterResults from "../student/SemesterResults";
import SubjectResults from "../student/SubjectResults";
import OverallResults from "../student/OverallResults";
import useStaffStore from "../../store/useStaffStore";

const StaffResults: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("semester");
  const { batchYear } = useStaffStore();

  const tabs = [
    { id: "semester", label: "Semester Results" },
    { id: "subject", label: "Subject Results" },
    { id: "overall", label: "Overall Performance" }
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Modern Segmented Control for Tabs */}
      <div className="flex justify-center mb-6 flex-shrink-0">
        <div className="inline-flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ease-in-out
                ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm transform scale-100"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 transform scale-95"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-white dark:bg-gray-800/50 rounded-3xl border border-gray-200 dark:border-gray-700/50 shadow-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {batchYear ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "semester" && <SemesterResults batchYear={batchYear} />}
                    {activeTab === "subject" && <SubjectResults batchYear={batchYear} />}
                    {activeTab === "overall" && <OverallResults batchYear={batchYear} />}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                        <GraduationCap className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Batch Selected</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                        Please select an active batch year from the sidebar to view detailed results and analytics.
                    </p>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default StaffResults;
