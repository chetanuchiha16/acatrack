import React, { useState, useEffect } from "react";
import Result from "./Result";
import { semesterOptions } from "./config";
import jssLogo from "./assets/jssLogo.png";
import { useTranslation } from "react-i18next";
import useStudentStore from "./parent_student_details";

export default function ParentResult() {
  const [sem, setSem] = useState("");
  const [view, setView] = useState("table");
  const [selectedTab, setSelectedTab] = useState("result");

  const { t, i18n } = useTranslation();

  // Zustand store
  const { studentData, loading, fetchStudentData } = useStudentStore();

  // Fetch data on mount
  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Set default semester when data arrives
  useEffect(() => {
    if (studentData && semesterOptions.length > 0) {
      setSem(semesterOptions[semesterOptions.length - 1]);
    }
  }, [studentData]);

  const isReady =
    selectedTab === "result" && studentData?.student?.usn && sem !== "";

  const changeLanguage = (lng) => i18n.changeLanguage(lng);

  if (loading) return <div>Loading...</div>;
  if (!studentData) return <div>{t("noData", "No data available")}</div>;

  console.log(studentData);

  return (
    <main className="min-h-screen w-full bg-gray-100 dark:bg-gray-900 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto w-full mb-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src={jssLogo}
              alt="Logo"
              className="drop-shadow-2xl w-28 sm:w-32 md:w-40"
            />
          </div>

          {/* Title */}
          <div className="text-[22px] sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center">
            {t("title")}
          </div>

          {/* Language + Back button side by side */}
          <div className="flex items-center gap-2">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="px-2 py-1 border rounded-md text-sm dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="kan">ಕನ್ನಡ</option>
            </select>

            <button
              onClick={() => {
                const currentPath = window.location.pathname; 
                const newPath = currentPath.replace(/\/ParentResult$/, ""); 
                window.location.href = newPath;
              }}
              className="px-3 py-1 bg-gray-700 text-white rounded-lg hover:bg-gray-900 transition-transform transform hover:scale-105"
            >
              ⬅ Back
            </button>
          </div>
        </div>
      </div>


      {/* Divider */}
      <div className="w-[95%] mx-auto h-[2px] bg-gray-300 my-4 mt-[-4] rounded shadow-sm"></div>

      {/* Page container */}
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="w-full flex justify-center sm:justify-start">
            <nav
              className="inline-flex rounded-md bg-gray-50 dark:bg-[#0b1220] border border-gray-200 dark:border-gray-700 overflow-hidden"
              role="tablist"
            ></nav>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            {selectedTab === "result" ? (
              <>
                <label className="relative block w-40">
                  <select
                    value={sem}
                    onChange={(e) => setSem(e.target.value)}
                    className="appearance-none w-full px-3 py-2 rounded-md bg-white dark:bg-[#0f1720] text-sm text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t("semester")}</option>
                    {semesterOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 shadow-sm hidden sm:inline-flex">
                  <button
                    onClick={() => setView("cards")}
                    className={`px-3 py-2 text-xs sm:text-sm transition ${
                      view === "cards"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {t("card")}
                  </button>
                  <button
                    onClick={() => setView("table")}
                    className={`px-3 py-2 text-xs sm:text-sm transition ${
                      view === "table"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {t("table")}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
                {t("info")}
              </div>
            )}
          </div>
        </section>

        <section>
          {isReady && (
            <Result
              usn={studentData.student.usn}
              semester={sem}
              view={view}
            />
          )}
        </section>
      </div>
    </main>
  );
}
