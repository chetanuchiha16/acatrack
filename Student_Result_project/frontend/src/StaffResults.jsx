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
      <div className="max-w-6xl mx-auto shadow-lg rounded-lg bg-white dark:bg-gray-800">
        
        {/* Tabs */}
        <div className="flex flex-col sm:flex-row border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 p-3 sm:p-4 text-center font-medium text-sm sm:text-base transition-colors duration-200 ${
                activeTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 text-gray-800 dark:text-gray-100">
          {activeTab === "semester" && <SemesterResults />}
          {activeTab === "subject" && <SubjectResults />}
          {activeTab === "overall" && <OverallResults />}
        </div>
      </div>
    </div>
  );
}
