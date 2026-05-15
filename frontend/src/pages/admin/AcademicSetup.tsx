import React, { useState, useEffect } from "react";
import { 
    Database, BookOpen, UserCheck, Link,
    CheckCircle, AlertCircle, Loader2, ChevronRight
} from "lucide-react";
import { 
    initBatchAdminInitBatchPost,
    registerSubjectsAdminRegisterSubjectsPost,
    enrollStudentsAdminEnrollStudentsPost,
    assignSubjectsAdminAssignSubjectsPost,
    listStaffAdminListStaffGet
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
    const [staffList, setStaffList] = useState<Array<{username: string, name: string}>>([]);

    const fetchStaff = async () => {
        try {
            const res = await listStaffAdminListStaffGet({
                headers: { "X-Admin-Secret": secret }
            });
            if (res.data) setStaffList(res.data as any);
        } catch (err) {
            console.error("Failed to fetch staff:", err);
        }
    };

    useEffect(() => {
        if (activeTab === "mapping") {
            fetchStaff();
        }
    }, [activeTab, secret]);


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
        if (!batchYear) return setStatus("❌ Select a batch year in the header first.");
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
        if (!batchYear) return setStatus("❌ Select a batch year in the header first.");
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

    const tabs = [
        { id: "init", label: "Initialize Batch", icon: Database, color: "text-indigo-500", bg: "bg-indigo-500/10" },
        { id: "subjects", label: "Register Subjects", icon: BookOpen, color: "text-teal-500", bg: "bg-teal-500/10" },
        { id: "enroll", label: "Enroll Students", icon: UserCheck, color: "text-blue-500", bg: "bg-blue-500/10" },
        { id: "mapping", label: "Staff Mapping", icon: Link, color: "text-purple-500", bg: "bg-purple-500/10" }
    ];

    const templates = {
        subjects: '[{"code": "21CS31", "name": "Data Structures", "credits": 4}, {"code": "21CS32", "name": "Analog Electronics", "credits": 3}]',
        students: '[{"usn": "1JS23CS001", "name": "Alice Johnson"}, {"usn": "1JS23CS002", "name": "Bob Smith"}]'
    };

    return (
        <div className="flex flex-col">
            {/* Tabs Sidebar/Header */}
            <div className="flex flex-wrap gap-4 mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
                            activeTab === tab.id 
                                ? `${tab.bg} ${tab.color} ring-2 ring-inset ring-current/20 shadow-lg shadow-current/10` 
                                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1">
                <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                    
                    {activeTab === "init" && (
                        <div className="space-y-6 max-w-2xl relative">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">1. Initialize Section Foundation</h3>
                                <p className="text-sm text-slate-500">Define the batch year and create the required sections (A, B, C...)</p>
                            </div>
                            
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Academic Batch Year</label>
                                    <input
                                        type="number"
                                        value={newBatch}
                                        onChange={(e) => setNewBatch(e.target.value)}
                                        placeholder="e.g. 2023"
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Section List</label>
                                    <input
                                        type="text"
                                        value={sections}
                                        onChange={(e) => setSections(e.target.value)}
                                        placeholder="Sections (e.g. A, B, C)"
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleInitBatch}
                                    disabled={loading}
                                    className="mt-4 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Database size={20} className="group-hover:rotate-12 transition-transform" />}
                                    Initialize Infrastructure
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "subjects" && (
                        <div className="space-y-6 relative">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">2. Register Academic Subjects</h3>
                                    <p className="text-sm text-slate-500 text-pretty">Bulk register subjects for a specific semester using JSON format.</p>
                                </div>
                                <button 
                                    onClick={() => setSubjectJson(templates.subjects)}
                                    className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 dark:bg-teal-900/20 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-colors"
                                >
                                    Insert Template
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Target Semester</label>
                                    <input
                                        type="text"
                                        value={semester}
                                        onChange={(e) => setSemester(e.target.value)}
                                        placeholder="e.g. sem1"
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-teal-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Subject Registry (JSON Array)</label>
                                    <textarea
                                        value={subjectJson}
                                        onChange={(e) => setSubjectJson(e.target.value)}
                                        placeholder='[{"code": "21CS31", "name": "Data Structures", "credits": 4}]'
                                        className="w-full h-48 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-teal-500 outline-none transition-all font-mono text-sm leading-relaxed"
                                    />
                                </div>
                                <button
                                    onClick={handleRegisterSubjects}
                                    disabled={loading}
                                    className="bg-teal-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-teal-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <BookOpen size={20} className="group-hover:-translate-y-1 transition-transform" />}
                                    Register Catalog
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "enroll" && (
                        <div className="space-y-6 relative">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">3. Student Enrollment</h3>
                                    <p className="text-sm text-slate-500">Map students to their respective batch and section.</p>
                                </div>
                                <button 
                                    onClick={() => setStudentJson(templates.students)}
                                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                                >
                                    Insert Template
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Target Section</label>
                                    <input
                                        type="text"
                                        value={sectionName}
                                        onChange={(e) => setSectionName(e.target.value)}
                                        placeholder="e.g. A"
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Student Data (JSON Array)</label>
                                    <textarea
                                        value={studentJson}
                                        onChange={(e) => setStudentJson(e.target.value)}
                                        placeholder='[{"usn": "1JS23CS001", "name": "John Doe"}]'
                                        className="w-full h-48 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-blue-500 outline-none transition-all font-mono text-sm leading-relaxed"
                                    />
                                </div>
                                <button
                                    onClick={handleEnrollStudents}
                                    disabled={loading}
                                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20} className="group-hover:scale-110 transition-transform" />}
                                    Enroll Students
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "mapping" && (
                        <div className="space-y-6 max-w-2xl relative">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">4. Faculty-Subject Mapping</h3>
                                <p className="text-sm text-slate-500">Assign specific staff members to subjects within sections.</p>
                            </div>

                            <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/20 mb-8">
                                <h4 className="text-sm font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <AlertCircle size={16} /> Instructions
                                </h4>
                                <p className="text-xs text-purple-600/80 leading-relaxed font-medium">
                                    Select a registered staff member and assign them to a specific subject code and section. 
                                    Staff members must be registered in the <span className="font-bold underline">Staff Registry</span> before they appear here.
                                </p>
                            </div>

                            <div className="space-y-6 pt-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Select Staff Member</label>
                                    <select
                                        value={teacherUsername}
                                        onChange={(e) => setTeacherUsername(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-purple-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                    >
                                        <option value="">-- Choose Staff --</option>
                                        {staffList.map(s => (
                                            <option key={s.username} value={s.username}>
                                                {s.name} ({s.username})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase ml-1">Subject Code</label>
                                        <input
                                            type="text"
                                            value={subjectCode}
                                            onChange={(e) => setSubjectCode(e.target.value)}
                                            placeholder="e.g. 21CS41"
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-purple-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase ml-1">Section ID</label>
                                        <input
                                            type="number"
                                            value={mapSectionId}
                                            onChange={(e) => setMapSectionId(e.target.value)}
                                            placeholder="ID from DB"
                                            className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-purple-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAssignSubjects}
                                    disabled={loading}
                                    className="mt-4 bg-purple-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Link size={20} className="group-hover:rotate-45 transition-transform" />}
                                    Finalize Mapping
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Footer */}
            {status && (
                <div className={`mt-8 p-6 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 shadow-sm border ${
                    status.includes("❌") ? "bg-rose-50 dark:bg-rose-900/10 text-rose-600 border-rose-100 dark:border-rose-900/20" : "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 border-emerald-100 dark:border-emerald-900/20"
                }`}>
                    {status.includes("❌") ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <p className="text-sm font-bold tracking-tight">{status}</p>
                </div>
            )}
        </div>
    );
};

export default AcademicSetup;
