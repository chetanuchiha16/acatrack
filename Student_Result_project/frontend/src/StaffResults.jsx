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
    <div className="min-h-screen  p-6">
      <div className="max-w-6xl mx-auto  shadow-lg rounded-lg">
        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 p-4 text-center font-medium ${
                activeTab === tab.id
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === "semester" && <SemesterResults />}
          {activeTab === "subject" && <SubjectResults />}
          {activeTab === "overall" && <OverallResults />}
        </div>
      </div>
    </div>
  );
}
