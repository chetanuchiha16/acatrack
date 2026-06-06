import { useState, useEffect, useCallback } from "react";
import { 
    LayoutDashboard, Settings, LogOut, 
    Download, Upload, FileArchive, Globe, 
    History, Users, Mail, GraduationCap,
    CheckCircle, AlertCircle, Loader2,
    Database, FileText, ChevronRight, Search
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../../utils/storage";
import { 
    listBatchesAdminListBatchesGet,
    generateAccountsAdminGenerateAccountsPost,
    uploadEmailsAdminUploadEmailsPost,
    uploadMentorsAdminUploadMentorsPost,
    uploadArchivePdftoexcelUploadPost,
    getStatusPdftoexcelStatusJobIdGet,
    listStaffAdminListStaffGet,
    registerStaffAdminRegisterStaffPost,
    uploadStaffListAdminUploadStaffListPost
} from "../../client/sdk.gen";
import AcademicSetup from "./AcademicSetup";

/** Safely extracts a human-readable message from an unknown catch value */
function getErrMsg(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    return "Unknown error";
}

const AdminPanel = () => {
    const navigate = useNavigate();
    const [secret] = useState<string>(localStorage.getItem("admin_secret") || "");
    const [mode, setMode] = useState<string>("missing");
    const [status, setStatus] = useState<string>("");

    const [batchYear, setBatchYear] = useState<number | null>(null);
    const [actionLog, setActionLog] = useState<Array<{id: string, msg: string, type: 'info' | 'success' | 'error' | 'loading', time: string}>>([]);

    const logAction = (msg: string, type: 'info' | 'success' | 'error' | 'loading' = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        const time = new Date().toLocaleTimeString();
        setActionLog(prev => [{id, msg, type, time}, ...prev].slice(0, 10));
        return id;
    };

    const updateLog = (id: string, type: 'success' | 'error' | 'loading' | 'info', newMsg?: string) => {
        setActionLog(prev => prev.map(log => 
            log.id === id ? { ...log, type, msg: newMsg || log.msg } : log
        ));
    };
    const [availableBatches, setAvailableBatches] = useState<number[]>([]);
    const [activeView, setActiveView] = useState<"results" | "setup">("results");
    const [activeConfigTab, setActiveConfigTab] = useState<"setup" | "registry" | "security">("setup");

    const [emailFile, setEmailFile] = useState<File | null>(null);
    const [mentorFile, setMentorFile] = useState<File | null>(null);

    // Payload upload states
    const [pdfZipFile, setPdfZipFile] = useState<File | null>(null);

    const [staffList, setStaffList] = useState<Array<{username: string, name: string, email: string}>>([]);
    const [newStaffName, setNewStaffName] = useState<string>("");
    const [newStaffEmail, setNewStaffEmail] = useState<string>("");
    const [staffFile, setStaffFile] = useState<File | null>(null);
    // Redirect if no secret
    useEffect(() => {
        if (!secret) {
            void navigate("/admin");
        }
    }, [navigate, secret]);

    // Fetch available batches from backend
    const fetchBatches = useCallback(() => {
        if (!secret) return;
        listBatchesAdminListBatchesGet({
            headers: { "X-Admin-Secret": secret },
        })
            .then((res) => {
                const data = res.data as { batches?: number[] } | undefined;
                if (data?.batches) {
                    const batches = data.batches;
                    if (batches.length > 0) {
                        setAvailableBatches(batches);
                        setBatchYear(batches[0]);
                    }
                }
            })
            .catch((err) => {
                console.error("Failed to fetch batches:", err);
                setStatus("❌ Failed to load batch list");
            });
    }, [secret]);

    useEffect(() => {
        fetchBatches();
    }, [secret, fetchBatches]);

    const fetchStaff = useCallback(async () => {
        if (!secret) return;
        try {
            const res = await listStaffAdminListStaffGet({
                headers: { "X-Admin-Secret": secret }
            });
            if (res.data) setStaffList(res.data as unknown as Array<{username: string, name: string, email: string}>);
        } catch (err) {
            console.error("Failed to fetch staff:", err);
        }
    }, [secret]);

    useEffect(() => {
        if (activeConfigTab === "registry") {
            void fetchStaff();
        }
    }, [activeConfigTab, fetchStaff]);




    const generateAccounts = async () => {
        if (!secret) return alert("Admin secret missing");
        if (!batchYear) return alert("Select a batch first");
        setStatus("Generating accounts...");
        try {
            const res = await generateAccountsAdminGenerateAccountsPost({
                query: { mode: mode as "all" | "missing", batch_year: batchYear },
                headers: { "X-Admin-Secret": secret }
            });
            if (res.error) {
                const detail = (res.error as { detail?: string }).detail || "Generation failed";
                throw new Error(detail);
            }
            
            const blob = res.data as unknown as Blob;
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "generated_passwords.csv";
            a.click();
            setStatus("✅ Accounts generated and CSV downloaded");
        } catch (err: unknown) {
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const uploadEmails = async () => {
        if (!emailFile) return setStatus("Please select an email file first.");
        if (!secret) return alert("Admin secret missing");

        const logId = logAction(`Uploading emails from ${emailFile.name}...`, 'loading');
        setStatus("Uploading emails...");
        try {
            const res = await uploadEmailsAdminUploadEmailsPost({
                query: { batch_year: batchYear! },
                headers: { "X-Admin-Secret": secret },
                body: { file: emailFile }
            });
            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }
            if (res.data) {
                const data = res.data as { emails_inserted: number; emails_updated: number };
                updateLog(logId, 'success', `Emails synced: ${data.emails_inserted} new, ${data.emails_updated} updated.`);
                setStatus(`✅ Emails uploaded.`);
            }
        } catch (err: unknown) {
            updateLog(logId, 'error', `Email upload failed: ${getErrMsg(err)}`);
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const uploadMentors = async () => {
        if (!mentorFile) return setStatus("Please select a mentor file first.");
        if (!secret) return alert("Admin secret missing");

        const logId = logAction(`Assigning mentors from ${mentorFile.name}...`, 'loading');
        setStatus("Uploading mentors...");
        try {
            const res = await uploadMentorsAdminUploadMentorsPost({
                query: { batch_year: batchYear! },
                headers: { "X-Admin-Secret": secret },
                body: { file: mentorFile }
            });
            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }

            if (res.data) {
                const data = res.data as { mappings_inserted: number };
                updateLog(logId, 'success', `Mentors assigned: ${data.mappings_inserted} student mappings.`);
                setStatus(`✅ Mentors uploaded.`);
            }
        } catch (err: unknown) {
            updateLog(logId, 'error', `Mentor assignment failed: ${getErrMsg(err)}`);
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const handleRegisterStaff = async () => {
        if (!newStaffName || !newStaffEmail) return alert("Name and Email required");
        if (!secret) return alert("Secret missing");
        
        setStatus("Registering staff...");
        try {
            const res = await registerStaffAdminRegisterStaffPost({
                query: { name: newStaffName, email: newStaffEmail },
                headers: { "X-Admin-Secret": secret }
            });
            if (res.error) throw new Error("Registration failed");
            
            const data = res.data as { username: string; plain_password?: string };
            setStatus(`✅ Registered ${newStaffName}. Username: ${data.username} | Password: ${data.plain_password}`);
            setNewStaffName("");
            setNewStaffEmail("");
            await fetchStaff();
        } catch (err) {
            setStatus("❌ " + getErrMsg(err));
        }
    };

    const handleUploadStaffList = async () => {
        if (!staffFile) return alert("Select a file first");
        if (!secret) return alert("Secret missing");

        setStatus("Processing staff list...");
        try {
            const res = await uploadStaffListAdminUploadStaffListPost({
                body: { file: staffFile },
                headers: { "X-Admin-Secret": secret }
            });
            if (res.error) throw new Error("Bulk upload failed");
            
            const data = res.data as { registered?: unknown[] };
            const count = data.registered?.length || 0;
            setStatus(`✅ Bulk upload successful! Registered ${count} new staff members. All passwords follow the 'staff_username' pattern.`);
            await fetchStaff();
        } catch (err) {
            setStatus("❌ " + getErrMsg(err));
        }
    };




    const uploadPdfZip = async () => {
        if (!batchYear)
            return setStatus("Please select a batch from the dropdown first.");
        if (!pdfZipFile)
            return setStatus("Please select a zip file of PDFs first.");
        if (!secret) return alert("Admin secret missing");

        const logId = logAction(`Uploading ${pdfZipFile.name}...`, 'loading');
        setStatus("Uploading PDF zip...");

        try {
            const res = await uploadArchivePdftoexcelUploadPost({
                headers: { "X-Admin-Secret": secret },
                query: { batch_year: batchYear },
                body: { file: pdfZipFile }
            });

            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }
            if (res.data) {
                const data = res.data as { job_id: string | number };
                updateLog(logId, 'info', `Processing ZIP (Job: ${data.job_id})...`);
                void pollJobStatus(data.job_id, logId);
                setStatus(`✅ Uploaded. Processing...`);
            }
        } catch (err: unknown) {
            updateLog(logId, 'error', `Upload failed: ${getErrMsg(err)}`);
            setStatus("❌ Error: " + getErrMsg(err));
        }
    };

    const pollJobStatus = async (jobId: string | number, logId: string) => {
        try {
            const res = await getStatusPdftoexcelStatusJobIdGet({
                path: { job_id: String(jobId) },
                query: { batch_year: batchYear }
            });
            if (res.error) {
                const errMsg = (res.error as { error?: string }).error || "Unknown error";
                throw new Error(errMsg);
            }

            if (res.data) {
                const data = res.data as { 
                    status: string; 
                    excel_url?: string; 
                    progress?: number; 
                    processed_files?: string[] 
                };
                if (data.status === "done") {
                    updateLog(logId, 'success', `Converted successfully!`);
                    setStatus(`✅ Done! Excel at ${data.excel_url}`);
                } else {
                    const current = data.progress || 0;
                    const total = data.processed_files?.length || 0;
                    updateLog(logId, 'loading', `Processing... ${current} / ${total} PDFs done`);
                    setTimeout(() => { void pollJobStatus(jobId, logId); }, 1000);
                }
            }
        } catch (err: unknown) {
            updateLog(logId, 'error', `Polling error: ${getErrMsg(err)}`);
            setStatus("❌ Error fetching job status: " + getErrMsg(err));
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] flex transition-colors font-sans relative overflow-hidden">
            {/* Animated Mesh Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400 rounded-full blur-[120px] animate-pulse delay-700" />
            </div>

            {/* Sidebar */}
            <div className="w-80 bg-white/70 dark:bg-[#111827]/70 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col shadow-2xl z-30 transition-all duration-500">
                <div className="p-10 border-b border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 transform hover:rotate-6 transition-transform">
                            <GraduationCap size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 leading-tight">
                                AcaTrack
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Management OS</p>
                            </div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-8 space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Navigation</p>
                    <button
                        onClick={() => setActiveView("results")}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.25rem] text-sm font-bold transition-all duration-500 group relative overflow-hidden ${
                            activeView === "results"
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        <LayoutDashboard size={20} className={activeView === "results" ? "text-white" : "group-hover:scale-110 transition-transform"} />
                        Results Center
                        {activeView === "results" && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20" />}
                    </button>
                    <button
                        onClick={() => setActiveView("setup")}
                        className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.25rem] text-sm font-bold transition-all duration-500 group relative overflow-hidden ${
                            activeView === "setup"
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        <Settings size={20} className={activeView === "setup" ? "text-white" : "group-hover:rotate-45 transition-transform"} />
                        Academic Engine
                        {activeView === "setup" && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20" />}
                    </button>

                    {/* ── Batch Selector (primary global control) ── */}
                    <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-2">Active Batch</p>
                        <select
                            value={batchYear ?? ""}
                            onChange={(e) => setBatchYear(e.target.value ? parseInt(e.target.value, 10) : null)}
                            className="w-full px-4 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-200 dark:border-indigo-800 text-sm font-black text-indigo-700 dark:text-indigo-300 outline-none cursor-pointer hover:border-indigo-400 transition-all"
                        >
                            <option value="">— No Batch Selected —</option>
                            {availableBatches.map(b => <option key={b} value={b}>Batch {b}</option>)}
                        </select>
                    </div>
                </nav>

                <div className="p-8">
                    <button
                        onClick={() => {
                            clearToken();
                            void navigate("/admin");
                        }}
                        className="w-full flex items-center gap-4 px-6 py-4 rounded-[1.25rem] text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all active:scale-95"
                    >
                        <LogOut size={20} />
                        Terminate Session
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
                <header className="h-20 bg-white/40 dark:bg-[#0b0f19]/40 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-12 transition-all">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                        {activeView === "results" ? "Command Center" : "Academic Engine"}
                    </h2>
                    <div className="flex items-center gap-3">
                        {batchYear && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">Batch {batchYear}</span>
                            </div>
                        )}
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg">
                            AD
                        </div>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                    <div className="max-w-[1600px] mx-auto">
                        {activeView === "results" ? (
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                {/* Left Column: Tools */}
                                <div className="xl:col-span-8 space-y-6 relative">
                                    {!batchYear && (
                                        <div className="absolute inset-0 z-40 bg-white/10 dark:bg-black/10 backdrop-blur-[2px] flex items-center justify-center rounded-[3rem] border-4 border-dashed border-indigo-500/20">
                                            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-center border border-slate-200 dark:border-slate-800 max-w-sm transform hover:scale-105 transition-transform">
                                                <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                                    <AlertCircle size={32} />
                                                </div>
                                                <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Context Required</h4>
                                                <p className="text-sm text-slate-500 mb-8 font-medium">Please select an academic batch year in the header to unlock operation tools.</p>
                                                <div className="flex justify-center">
                                                    <div className="flex items-center gap-2 text-indigo-500 animate-bounce">
                                                        <span className="text-xs font-black uppercase">Select Batch Above</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}



                                    {/* Conversion Card */}
                                    <section className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none border border-white dark:border-slate-800/50 group relative overflow-hidden transition-all hover:border-teal-500/30">
                                        <div className="absolute top-0 right-0 p-8 text-teal-500/5">
                                            <FileArchive size={150} />
                                        </div>
                                        
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-12 h-12 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center shadow-inner">
                                                <FileArchive size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Binary to Spreadsheet</h3>
                                                <p className="text-xs font-medium text-slate-500">Transform raw PDF archives into structured datasets</p>
                                            </div>
                                        </div>

                                        <div className="relative group/drop">
                                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-8 bg-slate-50/30 dark:bg-[#0b0f19]/30 transition-all group-hover/drop:border-teal-500 group-hover/drop:bg-teal-500/5">
                                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-md mb-4 group-hover/drop:scale-110 transition-transform">
                                                    <Upload size={20} className="text-teal-500" />
                                                </div>
                                                <p className="text-sm font-black text-slate-700 dark:text-slate-300 mb-1">
                                                    {pdfZipFile ? "Archive Ready" : "Upload Payload"}
                                                </p>
                                                <p className="text-xs font-medium text-slate-400 mb-6 text-center max-w-xs">
                                                    {pdfZipFile ? pdfZipFile.name : "Drag and drop your ZIP archive containing PDF results"}
                                                </p>
                                                <label className="cursor-pointer bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-2.5 rounded-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all text-xs uppercase tracking-widest">
                                                    Select File
                                                    <input
                                                        type="file"
                                                        accept=".zip,.rar"
                                                        onChange={(e) => setPdfZipFile(e.target.files?.[0] ?? null)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        <button
                                            onClick={uploadPdfZip}
                                            disabled={!pdfZipFile}
                                            className="mt-6 w-full py-4 bg-teal-600 text-white rounded-xl text-sm font-black shadow-lg shadow-teal-500/30 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 group"
                                        >
                                            <Database size={18} className="group-hover:rotate-12 transition-transform" />
                                            RUN CONVERSION PIPELINE
                                        </button>
                                    </section>
                                </div>

                                {/* Right Column: Status Log */}
                                <div className="xl:col-span-4 space-y-8">
                                    <div className="bg-slate-900 dark:bg-[#111827] rounded-[3rem] p-10 shadow-2xl border border-slate-800 h-[600px] flex flex-col relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />
                                        
                                        <div className="flex items-center justify-between mb-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center">
                                                    <History size={20} className="text-indigo-400" />
                                                </div>
                                                <h3 className="font-black text-white uppercase tracking-[0.2em] text-xs">Runtime Logs</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-4 overflow-y-auto pr-4 custom-scrollbar">
                                            {actionLog.length === 0 ? (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-10">
                                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                                        <Search size={32} className="text-slate-600" />
                                                    </div>
                                                    <p className="text-sm font-bold italic tracking-tight">Waiting for system activities...</p>
                                                </div>
                                            ) : (
                                                actionLog.map(log => (
                                                    <div key={log.id} className="p-5 rounded-[1.5rem] bg-white/5 border border-white/5 hover:border-white/10 transition-all animate-in slide-in-from-right-4 duration-500 group">
                                                        <div className="flex items-start gap-4">
                                                            <div className="mt-1">
                                                                {log.type === 'loading' && <Loader2 size={16} className="text-blue-400 animate-spin" />}
                                                                {log.type === 'success' && <CheckCircle size={16} className="text-emerald-400" />}
                                                                {log.type === 'error' && <AlertCircle size={16} className="text-rose-400" />}
                                                                {log.type === 'info' && <Search size={16} className="text-indigo-400" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-200 leading-relaxed">{log.msg}</p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <div className="h-px flex-1 bg-white/5" />
                                                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">{log.time}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    
                                    {status && (
                                        <div className="p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 relative overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <History size={64} />
                                            </div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] mb-3 text-indigo-200">System Message</p>
                                            <p className="text-sm font-bold leading-relaxed pr-8">{status}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Sub-navigation */}
                                <div className="flex flex-wrap gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
                                    <button onClick={() => setActiveConfigTab("setup")} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeConfigTab === "setup" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>Academic Setup</button>
                                    <button onClick={() => setActiveConfigTab("registry")} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeConfigTab === "registry" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>Registry Sync</button>
                                    <button onClick={() => setActiveConfigTab("security")} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeConfigTab === "security" ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>Security & Access</button>
                                </div>

                                {activeConfigTab === "setup" && (
                                    <section className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl rounded-[2rem] p-8 lg:p-12 shadow-xl border border-white dark:border-slate-800/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center justify-between mb-10">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center shadow-inner">
                                                    <Database size={28} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Academic Foundation Setup</h3>
                                                    <p className="text-xs font-medium text-slate-500">Configure core batches, sections, and subject catalogs</p>
                                                </div>
                                            </div>
                                        </div>
                                        <AcademicSetup secret={secret} batchYear={batchYear} onBatchCreated={fetchBatches} />
                                    </section>
                                )}

                                {activeConfigTab === "registry" && (
                                    <section className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl rounded-[2rem] p-8 lg:p-12 shadow-xl border border-white dark:border-slate-800/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="flex items-center gap-5 mb-10">
                                            <div className="w-14 h-14 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center shadow-inner">
                                                <Users size={28} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Identity & Registry Management</h3>
                                                <p className="text-xs font-medium text-slate-500">Explicit staff registration and student enrollment</p>
                                            </div>
                                        </div>

                                        {/* Staff Registry Section */}
                                        <div className="mb-12 space-y-8">
                                            <div className="p-8 rounded-3xl bg-slate-50/50 dark:bg-[#0b0f19]/50 border border-slate-200 dark:border-slate-800">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-800 dark:text-white">1. Staff Registry</h4>
                                                        <p className="text-xs font-medium text-slate-500">Register teachers here *before* assigning them to students or subjects.</p>
                                                    </div>
                                                    <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                                                        Phase 1: Identity
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                    {/* Quick Add Staff */}
                                                    <div className="space-y-6">
                                                        <h5 className="text-xs font-black uppercase tracking-widest text-slate-400">Quick Register</h5>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <input 
                                                                type="text" 
                                                                placeholder="Full Name" 
                                                                value={newStaffName}
                                                                onChange={(e) => setNewStaffName(e.target.value)}
                                                                className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:border-purple-500 outline-none transition-all"
                                                            />
                                                            <input 
                                                                type="email" 
                                                                placeholder="Official Email" 
                                                                value={newStaffEmail}
                                                                onChange={(e) => setNewStaffEmail(e.target.value)}
                                                                className="px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:border-purple-500 outline-none transition-all"
                                                            />
                                                        </div>
                                                        <button onClick={handleRegisterStaff} className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20">Add Staff Member</button>
                                                        
                                                        <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/20">
                                                            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                                                <AlertCircle size={12} />
                                                                INITIAL PASSWORD: staff_username
                                                            </p>
                                                        </div>

                                                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                                            <h5 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Bulk Staff Upload</h5>
                                                            <div className="flex items-center gap-4">
                                                                <input type="file" onChange={(e) => setStaffFile(e.target.files?.[0] ?? null)} className="flex-1 text-[10px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-600 file:font-bold" />
                                                                <button onClick={handleUploadStaffList} className="px-6 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Upload List</button>
                                                            </div>
                                                            <p className="mt-3 text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-2 rounded-lg leading-relaxed">
                                                                <span className="text-purple-500 font-bold">REQUIRED HEADERS:</span> <code className="text-purple-500">Name</code>, <code className="text-purple-500">Email</code>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Staff List Table */}
                                                    <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                                        <div className="max-h-64 overflow-y-auto">
                                                            <table className="w-full text-left">
                                                                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                                                                    <tr>
                                                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Username</th>
                                                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Name</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                                    {staffList.length === 0 ? (
                                                                        <tr><td colSpan={2} className="px-4 py-8 text-center text-xs text-slate-400 italic">No staff registered yet</td></tr>
                                                                    ) : staffList.map(s => (
                                                                        <tr key={s.username} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                                            <td className="px-4 py-3 text-xs font-mono font-bold text-purple-600">{s.username}</td>
                                                                            <td className="px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300">{s.name}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Emails Upload */}
                                            <div className="p-8 rounded-2xl bg-slate-50/50 dark:bg-[#0b0f19]/50 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/50 transition-all group">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Mail size={20} />
                                                    </div>
                                                    <h4 className="text-md font-black text-slate-800 dark:text-white">Email Database</h4>
                                                </div>
                                                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">Sync parent and student contact records from Excel/CSV sources.</p>
                                                <div className="space-y-4">
                                                    <input type="file" onChange={(e) => setEmailFile(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer" />
                                                    <button onClick={uploadEmails} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs">Execute Email Sync</button>
                                                    <p className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg leading-relaxed">
                                                        <span className="text-emerald-500 font-bold block mb-1">REQUIRED HEADERS:</span>
                                                        <code className="text-emerald-500">student_usn</code>, <code className="text-emerald-500">student_name</code>, <br/>
                                                        <code className="text-emerald-500">Parent_Email</code>, <code className="text-emerald-500">Student_Email</code>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Mentors Upload */}
                                            <div className="p-8 rounded-2xl bg-slate-50/50 dark:bg-[#0b0f19]/50 border border-slate-100 dark:border-slate-800 hover:border-purple-500/50 transition-all group">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Users size={20} />
                                                    </div>
                                                    <h4 className="text-md font-black text-slate-800 dark:text-white">2. Mentor Mapping</h4>
                                                </div>
                                                <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">Assign registered staff to their student mentees.</p>
                                                <div className="space-y-4">
                                                    <input type="file" onChange={(e) => setMentorFile(e.target.files?.[0] ?? null)} className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer" />
                                                    <button onClick={uploadMentors} className="w-full py-3 bg-purple-600 text-white rounded-xl font-black shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs">Assign Faculty Links</button>
                                                    <p className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg leading-relaxed">
                                                        <span className="text-purple-500 font-bold block mb-1">REQUIRED HEADERS:</span>
                                                        <code className="text-purple-500">Mentor_Username</code>, <code className="text-purple-500">student_usn</code>. <br/>
                                                        The username must exist in the Staff Registry.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {activeConfigTab === "security" && (
                                    <section className="bg-white/70 dark:bg-[#1e293b]/70 backdrop-blur-xl rounded-[2rem] p-8 lg:p-12 shadow-xl border border-white dark:border-slate-800/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/5 dark:to-orange-900/5 border border-amber-100 dark:border-amber-900/20 relative overflow-hidden group">
                                            <div className="flex flex-col md:flex-row items-center gap-8 relative">
                                                <div className="flex-1 text-center md:text-left">
                                                    <div className="flex items-center justify-center md:justify-start gap-3 text-amber-600 mb-2">
                                                        <AlertCircle size={20} />
                                                        <span className="text-xs font-black uppercase tracking-[0.2em]">Security Zone</span>
                                                    </div>
                                                    <h4 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">Credential Maintenance</h4>
                                                    <p className="text-sm font-medium text-slate-500">Mass-generate or overwrite user access credentials for this batch.</p>
                                                </div>
                                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                                                    <select
                                                        value={mode}
                                                        onChange={(e) => setMode(e.target.value)}
                                                        className="w-full sm:w-64 px-6 py-3 rounded-xl bg-white dark:bg-[#0b0f19] border border-amber-200 dark:border-amber-800/50 text-sm font-bold outline-none shadow-sm focus:border-amber-500 transition-all"
                                                    >
                                                        <option value="missing">New Accounts Only</option>
                                                        <option value="all">Full Re-generation</option>
                                                    </select>
                                                    <button onClick={generateAccounts} className="w-full sm:w-auto px-8 py-3 bg-amber-600 text-white rounded-xl font-black hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all active:scale-95 text-xs uppercase tracking-widest whitespace-nowrap">
                                                        Generate Access
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminPanel;
