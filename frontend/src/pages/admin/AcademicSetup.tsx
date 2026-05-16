import React, { useState, useEffect } from "react";
import { 
    Database, BookOpen, UserCheck, Link,
    CheckCircle, AlertCircle, Loader2, ChevronRight
} from "lucide-react";
import { 
    initBatchAdminInitBatchPost,
    assignSubjectsAdminAssignSubjectsPost,
    listStaffAdminListStaffGet,
    listSubjectsAdminListSubjectsGet,
    listSectionsAdminListSectionsGet,
    uploadSubjectsExcelAdminUploadSubjectsExcelPost,
    uploadStudentsExcelAdminUploadStudentsExcelPost
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
    const [sectionName, setSectionName] = useState<string>("A");
    
    // File states
    const [subjectFile, setSubjectFile] = useState<File | null>(null);
    const [studentFile, setStudentFile] = useState<File | null>(null);
    
    // Mapping states
    const [teacherUsername, setTeacherUsername] = useState<string>("");
    const [subjectCode, setSubjectCode] = useState<string>("");
    const [mapSectionId, setMapSectionId] = useState<string>("");
    const [staffList, setStaffList] = useState<Array<{username: string, name: string}>>([]);
    const [subjectList, setSubjectList] = useState<Array<{subject_code: string, subject_name: string}>>([]);
    const [sectionList, setSectionList] = useState<Array<{id: number, name: string, batch_year: number}>>([]);

    const fetchDependencies = async () => {
        try {
            const reqs: Promise<any>[] = [];
            let staffIdx = -1;
            let subIdx = -1;
            let secIdx = -1;
            
            if (activeTab === "mapping") {
                staffIdx = reqs.push(listStaffAdminListStaffGet({ headers: { "X-Admin-Secret": secret } })) - 1;
                subIdx = reqs.push(listSubjectsAdminListSubjectsGet({ headers: { "X-Admin-Secret": secret } })) - 1;
            }
            
            if (batchYear && (activeTab === "mapping" || activeTab === "enroll")) {
                secIdx = reqs.push(listSectionsAdminListSectionsGet({
                    headers: { "X-Admin-Secret": secret },
                    query: { batch_year: batchYear }
                })) - 1;
            }
            
            if (reqs.length === 0) return;
            
            const results = await Promise.all(reqs);
            if (staffIdx !== -1 && results[staffIdx].data) setStaffList(results[staffIdx].data as any);
            if (subIdx !== -1 && results[subIdx].data) setSubjectList(results[subIdx].data as any);
            if (secIdx !== -1 && results[secIdx].data) setSectionList(results[secIdx].data as any);
        } catch (err) {
            console.error("Failed to fetch dependencies:", err);
        }
    };

    useEffect(() => {
        fetchDependencies();
    }, [activeTab, secret, batchYear]);


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
            // Refresh sections dropdown after creating new batch/sections
            await fetchDependencies();
        } catch (err: any) {
            setStatus("❌ Error: " + (err.body?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubjects = async () => {
        if (!subjectFile) return setStatus("❌ Select a subject Excel file first.");
        setLoading(true);
        try {
            await uploadSubjectsExcelAdminUploadSubjectsExcelPost({
                headers: { "X-Admin-Secret": secret },
                query: { semester },
                body: { file: subjectFile }
            });
            setStatus("✅ Subjects registered successfully from Excel");
        } catch (err: any) {
            setStatus("❌ Error: " + (err.body?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleEnrollStudents = async () => {
        if (!batchYear) return setStatus("❌ Select a batch year in the header first.");
        if (!studentFile) return setStatus("❌ Select a student Excel file first.");
        setLoading(true);
        try {
            await uploadStudentsExcelAdminUploadStudentsExcelPost({
                headers: { "X-Admin-Secret": secret },
                query: { batch_year: batchYear!, section_name: sectionName },
                body: { file: studentFile }
            });
            setStatus(`✅ Enrolled students from Excel into section ${sectionName}`);
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

    return (
        <div className="flex flex-col">
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

            <div className="flex-1">
                <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                    
                    {/* ── 1. Initialize Batch ── */}
                    {activeTab === "init" && (
                        <div className="space-y-6 max-w-xl relative">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">1. Initialize Section Foundation</h3>
                                <p className="text-sm text-slate-500">Define the batch year and create the required sections (A, B, C…)</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Sections (comma-separated)</label>
                                    <input
                                        type="text"
                                        value={sections}
                                        onChange={(e) => setSections(e.target.value)}
                                        placeholder="e.g. A, B, C"
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-indigo-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleInitBatch}
                                disabled={loading}
                                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Database size={20} className="group-hover:rotate-12 transition-transform" />}
                                Initialize Infrastructure
                            </button>
                        </div>
                    )}

                    {/* ── 2. Register Subjects ── */}
                    {activeTab === "subjects" && (
                        <div className="space-y-6 max-w-xl relative">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">2. Register Academic Subjects</h3>
                                <p className="text-sm text-slate-500">Bulk register subjects for a specific semester using an Excel file.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Target Semester</label>
                                <select
                                    value={semester}
                                    onChange={(e) => setSemester(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-teal-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                >
                                    <option value="">-- Choose Semester --</option>
                                    {[...Array(8)].map((_, i) => (
                                        <option key={i} value={`sem${i + 1}`}>Semester {i + 1}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Subject Registry Excel</label>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        onChange={(e) => setSubjectFile(e.target.files?.[0] ?? null)}
                                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                                    />
                                    <p className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg leading-relaxed">
                                        <span className="text-teal-500 font-bold">REQUIRED HEADERS:</span> <code className="text-teal-500">code</code>, <code className="text-teal-500">name</code>, <code className="text-teal-500">credits</code>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleRegisterSubjects}
                                disabled={loading || !subjectFile}
                                className="bg-teal-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-teal-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <BookOpen size={20} className="group-hover:-translate-y-1 transition-transform" />}
                                Register Catalog
                            </button>
                        </div>
                    )}

                    {/* ── 3. Student Enrollment ── */}
                    {activeTab === "enroll" && (
                        <div className="space-y-6 max-w-xl relative">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">3. Student Enrollment</h3>
                                <p className="text-sm text-slate-500">Bulk enroll students into a section. The active batch year is used automatically.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Target Section</label>
                                <select
                                    value={sectionName}
                                    onChange={(e) => setSectionName(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-blue-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                >
                                    <option value="">-- Choose Section --</option>
                                    {sectionList.map(s => (
                                        <option key={s.id} value={s.name}>Section {s.name} (Batch {s.batch_year})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Student Data Excel</label>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="file"
                                        accept=".xlsx"
                                        onChange={(e) => setStudentFile(e.target.files?.[0] ?? null)}
                                        className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                    />
                                    <p className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg leading-relaxed">
                                        <span className="text-blue-500 font-bold">REQUIRED HEADERS:</span> <code className="text-blue-500">usn</code>, <code className="text-blue-500">name</code>, <code className="text-blue-500">email</code>, <code className="text-blue-500">phone</code>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleEnrollStudents}
                                disabled={loading || !studentFile}
                                className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20} className="group-hover:scale-110 transition-transform" />}
                                Enroll Students
                            </button>
                        </div>
                    )}

                    {/* ── 4. Faculty–Subject Mapping ── */}
                    {activeTab === "mapping" && (
                        <div className="space-y-6 max-w-2xl relative">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">4. Faculty–Subject Mapping</h3>
                                <p className="text-sm text-slate-500">Assign staff to a subject within a section and semester.</p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/20">
                                <h4 className="text-sm font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <AlertCircle size={16} /> Instructions
                                </h4>
                                <p className="text-xs text-purple-600/80 leading-relaxed font-medium">
                                    Select a registered staff member and assign them to a specific subject, section, and semester.
                                    Staff must be registered in the <span className="font-bold underline">Staff Registry</span> first.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase ml-1">Select Staff Member</label>
                                <select
                                    value={teacherUsername}
                                    onChange={(e) => setTeacherUsername(e.target.value)}
                                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-purple-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                >
                                    <option value="">-- Choose Staff --</option>
                                    {staffList.map(s => (
                                        <option key={s.username} value={s.username}>{s.name} ({s.username})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Semester</label>
                                    <select
                                        value={semester}
                                        onChange={(e) => setSemester(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-purple-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                    >
                                        <option value="">-- Semester --</option>
                                        {[...Array(8)].map((_, i) => (
                                            <option key={i} value={`sem${i + 1}`}>Sem {i + 1}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Subject</label>
                                    <select
                                        value={subjectCode}
                                        onChange={(e) => setSubjectCode(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-purple-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                    >
                                        <option value="">-- Subject --</option>
                                        {subjectList.map(s => (
                                            <option key={s.subject_code} value={s.subject_code}>{s.subject_name} ({s.subject_code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Section</label>
                                    <select
                                        value={mapSectionId}
                                        onChange={(e) => setMapSectionId(e.target.value)}
                                        className="w-full px-6 py-4 rounded-2xl bg-slate-50 dark:bg-[#0f1720] border-2 border-transparent focus:border-purple-500 outline-none transition-all font-bold text-slate-700 dark:text-slate-200"
                                    >
                                        <option value="">-- Section --</option>
                                        {sectionList.map(s => (
                                            <option key={s.id} value={s.id}>Sec {s.name} ({s.batch_year})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={handleAssignSubjects}
                                disabled={loading}
                                className="bg-purple-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-purple-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Link size={20} className="group-hover:rotate-45 transition-transform" />}
                                Finalize Mapping
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {status && (
                <div className={`mt-8 p-6 rounded-2xl flex items-center gap-4 ${status.includes("❌") ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                    {status.includes("❌") ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                    <p className="text-sm font-bold">{status}</p>
                </div>
            )}
        </div>
    );
};

export default AcademicSetup;
