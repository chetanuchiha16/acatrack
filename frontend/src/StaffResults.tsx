import React, { useState, useEffect } from "react";
import SemesterResults from "./SemesterResults";
import SubjectResults from "./SubjectResults";
import OverallResults from "./OverallResults";
import { listBatchesBatchesGet } from "./client/sdk.gen";

interface BatchesResponse {
  batches: string[];
}

const StaffResults: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("semester");
  const [batches, setBatches] = useState<string[]>([]);
  const [batchYear, setBatchYear] = useState<string>("");

  useEffect(() => {
      listBatchesBatchesGet()
          .then((res) => {
              const fetchedBatches = (res.data as any)?.batches || [];
              setBatches(fetchedBatches);
              if (fetchedBatches.length > 0) {
                  setBatchYear(fetchedBatches[fetchedBatches.length - 1]);
              }
          })
          .catch(() => setBatches([]));
  }, []);

  const tabs = [
    { id: "semester", label: "Semester Results" },
    { id: "subject", label: "Subject Results" },
    { id: "overall", label: "Overall Performance" }
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        {/* Batch Selector Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">Staff Dashboard</h2>
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Batch:</span>
                <select
                    value={batchYear}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBatchYear(e.target.value)}
                    className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 outline-none w-32"
                >
                    <option value="">Select</option>
                    {batches.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
            </div>
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
