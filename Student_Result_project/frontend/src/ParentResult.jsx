import React, { useState } from "react";
import Result from "./Result";
import { semesterOptions } from "./config";
import jssLogo from "./assets/jssLogo.png";

const languages = {
  en: {
    title: "Parent Dashboard",
    usn: "Student USN",
    enterUsn: "Enter USN",
    semester: "Semester",
    result: "Result",
    info: "Enter your child’s USN and choose Result to view performance.",
    table: "Table",
    card: "Cards",
  },
  hi: {
    title: "अभिभावक डैशबोर्ड",
    usn: "छात्र का यूएसएन",
    enterUsn: "यूएसएन दर्ज करें",
    semester: "सेमेस्टर",
    result: "परिणाम",
    info: "अपने बच्चे का यूएसएन दर्ज करें और परिणाम देखने के लिए चुनें।",
    table: "टेबल",
    card: "कार्ड",
  },
  kn: {
    title: "ಪಾಲಕರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    usn: "ವಿದ್ಯಾರ್ಥಿ ಯುಎಸ್ಎನ್",
    enterUsn: "ಯುಎಸ್ಎನ್ ನಮೂದಿಸಿ",
    semester: "ಸೆಮಿಸ್ಟರ್",
    result: "ಫಲಿತಾಂಶ",
    info: "ನಿಮ್ಮ ಮಗುವಿನ ಯುಎಸ್ಎನ್ ನಮೂದಿಸಿ ಮತ್ತು ಫಲಿತಾಂಶ ಆಯ್ಕೆಮಾಡಿ.",
    table: "ಕೋಷ್ಟಕ",
    card: "ಕಾರ್ಡ್",
  },
};

export default function ParentResult() {
  const [usn, setUsn] = useState("");
  const [sem, setSem] = useState("");
  const [view, setView] = useState("table");
  const [lang, setLang] = useState("en");
  const [selectedTab, setSelectedTab] = useState("");

  const t = languages[lang];

  const isReady = selectedTab === "result" && usn.trim() !== "" && sem !== "";

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
              className="w-20 h-auto drop-shadow-lg"
            />
          </div>

          {/* Title */}
          <div className="text-[22px] sm:text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 text-center">
            {t.title}
          </div>

          {/* Language */}
          <div>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="px-2 py-1 border rounded-md text-sm dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="kn">ಕನ್ನಡ</option>
            </select>
          </div>
        </div>
      </div>

      {/* Page container */}
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Student USN input card */}
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 shadow-lg">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.usn}
            </label>
            <input
              type="text"
              value={usn}
              onChange={(e) => setUsn(e.target.value.toUpperCase())}
              placeholder={t.enterUsn}
              className="w-full px-4 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100"
            />
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {t.info}
          </p>
        </section>

        {/* Tabs + semester selector */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Tabs */}
          <div className="w-full flex justify-center sm:justify-start">
            <nav
              className="inline-flex rounded-md bg-gray-50 dark:bg-[#0b1220] border border-gray-200 dark:border-gray-700 overflow-hidden"
              role="tablist"
            >
              <button
                onClick={() => setSelectedTab("result")}
                className={`px-3 py-2 text-xs sm:text-sm transition ${
                  selectedTab === "result"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {t.result}
              </button>
            </nav>
          </div>

          {/* Semester + view */}
          <div className="w-full sm:w-auto flex items-center gap-3">
            {selectedTab === "result" ? (
              <>
                {/* Semester Select */}
                <label className="relative block w-40">
                  <select
                    value={sem}
                    onChange={(e) => setSem(e.target.value)}
                    className="appearance-none w-full px-3 py-2 rounded-md bg-white dark:bg-[#0f1720] text-sm text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t.semester}</option>
                    {semesterOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Cards / Table Toggle */}
                <div className="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 shadow-sm hidden sm:inline-flex">
                  <button
                    onClick={() => setView("cards")}
                    className={`px-3 py-2 text-xs sm:text-sm transition ${
                      view === "cards"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {t.card}
                  </button>
                  <button
                    onClick={() => setView("table")}
                    className={`px-3 py-2 text-xs sm:text-sm transition ${
                      view === "table"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {t.table}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center sm:text-left">
                {t.info}
              </div>
            )}
          </div>
        </section>

        {/* Result content */}
        <section>
          {isReady && (
            <Result usn={usn.toUpperCase()} semester={sem} view={view} />
          )}
        </section>
      </div>
    </main>
  );
}
