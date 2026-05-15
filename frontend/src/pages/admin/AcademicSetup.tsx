import React, { useState } from "react";
import { 
    initBatchAdminInitBatchPost,
    registerSubjectsAdminRegisterSubjectsPost,
    enrollStudentsAdminEnrollStudentsPost,
    assignSubjectsAdminAssignSubjectsPost
} from "../../client/sdk.gen";

interface AcademicSetupProps {
    secret: string;
    batchYear: number | null;
}

const AcademicSetup: React.FC<AcademicSetupProps> = ({ secret, batchYear }) => {
    const [activeTab, setActiveTab] = useState<string>("init");
    const [status, setStatus] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);

    // Form states
    const [newBatch, setNewBatch] = useState<string>("");
    const [sections, setSections] = useState<string>("A, B, C");
    const [semester, setSemester] = useState<string>("sem1");
    const [subjectJson, setSubjectJson] = useState<string>("");
    const [studentJson, setStudentJson] = useState<string>("");
    const [sectionName, setSectionName] = useState<string>("A");
    
    // Mapping states
    const [teacherUsername, setTeacherUsername] = useState<string>("");
    const [subjectCode, setSubjectCode] = useState<string>("");
    const [mapSectionId, setMapSectionId] = useState<string>("");

    const handleInitBatch = async () => {
        setLoading(true);
        try {
            await initBatchAdminInitBatchPost({
                headers: { "X-Admin-Secret": secret },
                query: { 
                    batch_year: parseInt(newBatch, 10),
                    sections: sections.split(",").map(s => s.trim())
                }
            });
            setStatus("✅ Batch initialized successfully");
        } catch (err: any) {
            setStatus("❌ Error: " + (err.body?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubjects = async () => {
        setLoading(true);
        try {
            const subjects = JSON.parse(subjectJson);
            await registerSubjectsAdminRegisterSubjectsPost({
                headers: { "X-Admin-Secret": secret },
                query: { semester },
                body: subjects
            });
            setStatus("✅ Subjects registered successfully");
        } catch (err: any) {
            setStatus("❌ Error: " + (err.body?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollStudents = async () => {
        setLoading(true);
        try {
            const students = JSON.parse(studentJson);
            await enrollStudentsAdminEnrollStudentsPost({
                headers: { "X-Admin-Secret": secret },
                query: { batch_year: batchYear!, section_name: sectionName },
                body: students
            });
            setStatus(`✅ Enrolled ${students.length} students`);
        } catch (err: any) {
            setStatus("❌ Error: " + (err.body?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleAssignSubjects = async () => {
        setLoading(true);
        try {
            await assignSubjectsAdminAssignSubjectsPost({
                headers: { "X-Admin-Secret": secret },
                query: {
                    teacher_username: teacherUsername,
                    subject_code: subjectCode,
                    section_id: parseInt(mapSectionId, 10),
                    semester,
                    batch_year: batchYear!
                }
            });
            setStatus("✅ Subject assigned to teacher");
        } catch (err: any) {
            setStatus("❌ Error: " + (err.body?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                {["init", "subjects", "enroll", "mapping"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === tab 
                                ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === "init" && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">1. Initialize Batch</h3>
                        <p className="text-sm text-gray-500">Create the sections for a new academic year.</p>
                        <input
                            type="number"
                            value={newBatch}
                            onChange={(e) => setNewBatch(e.target.value)}
                            placeholder="Batch Year (e.g. 2023)"
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                        />
                        <input
                            type="text"
                            value={sections}
                            onChange={(e) => setSections(e.target.value)}
                            placeholder="Sections (comma separated)"
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                        />
                        <button
                            onClick={handleInitBatch}
                            disabled={loading}
                            className="bg-indigo-600 text-white w-full py-2 rounded-lg hover:bg-indigo-700 transition"
                        >
                            {loading ? "Processing..." : "Initialize"}
                        </button>
                    </div>
                )}

                {activeTab === "subjects" && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">2. Register Subjects</h3>
                        <input
                            type="text"
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            placeholder="Semester (e.g. sem1)"
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                        />
                        <textarea
                            value={subjectJson}
                            onChange={(e) => setSubjectJson(e.target.value)}
                            placeholder='[{"code": "CS101", "name": "Intro", "credits": 4}]'
                            className="w-full h-40 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-mono text-xs"
                        />
                        <button
                            onClick={handleRegisterSubjects}
                            disabled={loading}
                            className="bg-teal-600 text-white w-full py-2 rounded-lg hover:bg-teal-700 transition"
                        >
                            Register Subjects
                        </button>
                    </div>
                )}

                {activeTab === "enroll" && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">3. Enroll Students</h3>
                        <input
                            type="text"
                            value={sectionName}
                            onChange={(e) => setSectionName(e.target.value)}
                            placeholder="Section Name (e.g. A)"
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                        />
                        <textarea
                            value={studentJson}
                            onChange={(e) => setStudentJson(e.target.value)}
                            placeholder='[{"usn": "1JS23CS001", "name": "John"}]'
                            className="w-full h-40 px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-mono text-xs"
                        />
                        <button
                            onClick={handleEnrollStudents}
                            disabled={loading}
                            className="bg-blue-600 text-white w-full py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            Enroll Students
                        </button>
                    </div>
                )}

                {activeTab === "mapping" && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">4. Staff Mapping</h3>
                        <input
                            type="text"
                            value={teacherUsername}
                            onChange={(e) => setTeacherUsername(e.target.value)}
                            placeholder="Teacher Username"
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                        />
                        <input
                            type="text"
                            value={subjectCode}
                            onChange={(e) => setSubjectCode(e.target.value)}
                            placeholder="Subject Code"
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                        />
                        <input
                            type="number"
                            value={mapSectionId}
                            onChange={(e) => setMapSectionId(e.target.value)}
                            placeholder="Section ID"
                            className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                        />
                        <button
                            onClick={handleAssignSubjects}
                            disabled={loading}
                            className="bg-purple-600 text-white w-full py-2 rounded-lg hover:bg-purple-700 transition"
                        >
                            Assign Subject
                        </button>
                    </div>
                )}
            </div>

            {/* Status Footer */}
            {status && (
                <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 break-words">{status}</p>
                </div>
            )}
        </div>
    );
};

export default AcademicSetup;
