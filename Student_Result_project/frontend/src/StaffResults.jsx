import React, { useState } from "react";
import SemesterResults from "./SemesterResults";
import SubjectResults from "./SubjectResults";
import OverallResults from "./OverallResults";

export default function StaffResults() {
  const [activeTab, setActiveTab] = useState("semester");

  const tabs = [
    { id: "semester", label: "Semester Results" },
    { id: "subject", label: "Subject Results" },
    { id: "overall", label: "Overall Performance" }
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        
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
          {activeTab === "semester" && <SemesterResults />}
          {activeTab === "subject" && <SubjectResults />}
          {activeTab === "overall" && <OverallResults />}
        </div>
      </div>
    </div>
  );
}
