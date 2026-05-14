import React, { useState } from "react";
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
    <div className="space-y-6">
      <div className="shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">Staff Dashboard</h2>
            {batchYear && (
                <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold uppercase tracking-wider">
                    Batch {batchYear}
                </div>
            )}
        </div>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-center font-medium text-sm sm:text-base transition-all duration-200
                ${
                  activeTab === tab.id
                    ? "bg-blue-500 text-white shadow-inner"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-5 sm:p-6 text-gray-800 dark:text-gray-100">
          {batchYear ? (
              <>
                  {activeTab === "semester" && <SemesterResults batchYear={batchYear} />}
                  {activeTab === "subject" && <SubjectResults batchYear={batchYear} />}
                  {activeTab === "overall" && <OverallResults batchYear={batchYear} />}
              </>
          ) : (
              <div className="text-center text-gray-500 py-10">
                  Please select a batch to view results.
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffResults;
