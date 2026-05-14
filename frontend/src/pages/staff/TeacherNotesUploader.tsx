import React, { useState, useEffect, useRef } from "react";
import { 
    Folder, 
    FileText, 
    ChevronRight, 
    Upload as UploadIcon, 
    ArrowLeft,
    MoreVertical,
    FileUp,
    Loader2
} from "lucide-react";
import { 
    listNotesAuthStaffUploadNotesGet,
    uploadNoteAuthStaffUploadNotesPost
} from "../../client/sdk.gen";

interface FileItemProps {
    name: string;
    isFolder: boolean;
    onClick: () => void;
    selected: boolean;
}

function FileItem({ name, isFolder, onClick, selected }: FileItemProps) {
    return (
        <div
            className={`group flex flex-col items-center w-32 m-3 p-4 rounded-2xl cursor-pointer transition-all duration-300 border
            ${selected 
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-md scale-105" 
                : "bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg hover:-translate-y-1"
            }`}
            onClick={onClick}
        >
            <div className={`text-4xl mb-3 transition-transform duration-300 group-hover:scale-110 ${isFolder ? "text-amber-400" : "text-red-500"}`}>
                {isFolder ? <Folder size={48} fill="currentColor" fillOpacity={0.2} /> : <FileText size={48} fill="currentColor" fillOpacity={0.1} />}
            </div>
            <div className="text-xs font-bold text-center break-words dark:text-gray-200 text-gray-700 line-clamp-2 px-1">
                {name}
            </div>
            
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400">
                    <MoreVertical size={14} />
                 </button>
            </div>
        </div>
    );
}

interface FileGridProps {
    tree: Record<string, unknown>;
    path?: string;
    setPath: (path: string) => void;
}

function FileGrid({ tree, path = "", setPath }: FileGridProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const entries = Object.entries(tree);

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 w-full">
                <FileUp size={64} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">This folder is empty</p>
                <p className="text-xs opacity-60">Drag and drop files to upload</p>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap justify-center sm:justify-start w-full">
            {entries.map(([name, value]) => {
                const fullPath = `${path}/${name}`;
                const isFolder = typeof value === "object" && value !== null;

                return (
                    <FileItem
                        key={fullPath}
                        name={name}
                        isFolder={isFolder}
                        selected={selected === fullPath}
                        onClick={() => {
                            setSelected(fullPath);
                            if (isFolder) {
                                setPath(fullPath);
                            } else if (typeof value === "string") {
                                window.open(value, "_blank");
                            }
                        }}
                    />
                );
            })}
        </div>
    );
}

function getDirAtPath(tree: Record<string, unknown>, path: string): Record<string, unknown> {
    if (!path) return tree;
    const parts = path.split("/").filter(Boolean);
    let current: unknown = tree;
    for (const part of parts) {
        const next = (current as Record<string, unknown>)?.[part];
        if (next && typeof next === "object") {
            current = next;
        } else {
            return {};
        }
    }
    return current as Record<string, unknown>;
}

export default function TeacherNotesUploader() {
    const [fileTree, setFileTree] = useState<Record<string, unknown> | null>(null);
    const [currentPath, setCurrentPath] = useState<string>("");
    const [dragActive, setDragActive] = useState<boolean>(false);
    const [uploadStatus, setUploadStatus] = useState<string>("");
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        listNotesAuthStaffUploadNotesGet()
            .then((res) => setFileTree(res.data as Record<string, unknown>))
            .catch((err) => console.error("Failed to load notes:", err));
    }, []);

    const currentDir = fileTree ? getDirAtPath(fileTree, currentPath) : null;

    const goBack = () => {
        const parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        setCurrentPath(parts.length > 0 ? "/" + parts.join("/") : "");
    };

    const handleFileSelect = (file: File) => {
        if (file.type !== "application/pdf") {
            setUploadStatus("❌ Only PDF files are allowed.");
            setTimeout(() => setUploadStatus(""), 3000);
            return;
        }
        void uploadFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        setUploadStatus("Uploading...");
        try {
            const res = await uploadNoteAuthStaffUploadNotesPost({
                body: { 
                    file: file as unknown as File,
                    path: currentPath 
                },
                onUploadProgress: (progressEvent: { loaded: number; total?: number }) => {
                    if (progressEvent.total) {
                        setUploadProgress(
                            Math.round((progressEvent.loaded / progressEvent.total) * 100)
                        );
                    }
                }
            } as unknown as Parameters<typeof uploadNoteAuthStaffUploadNotesPost>[0]);

            if ("error" in res && res.error) throw new Error("Upload failed");

            setUploadStatus("✅ Uploaded successfully");
            setUploadProgress(0);
            setTimeout(() => setUploadStatus(""), 3000);
            const refreshRes = await listNotesAuthStaffUploadNotesGet();
            setFileTree(refreshRes.data as Record<string, unknown>);
        } catch (err) {
            console.error(err);
            setUploadStatus("❌ Upload error");
            setTimeout(() => setUploadStatus(""), 3000);
        }
    };

    const breadcrumbs = currentPath.split("/").filter(Boolean);

    return (
        <div className="w-full space-y-6">
            <div className="w-full flex flex-col bg-white dark:bg-gray-800/80 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[75vh] backdrop-blur-sm">
                {/* Explorer Header */}
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full">
                        <button
                            onClick={goBack}
                            disabled={!currentPath}
                            className={`p-2 rounded-xl transition-all ${
                                !currentPath 
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" 
                                : "text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 shadow-sm active:scale-95"
                            }`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        
                        {/* Breadcrumbs */}
                        <div className="flex items-center text-sm font-bold overflow-x-auto no-scrollbar whitespace-nowrap">
                            <button 
                                onClick={() => setCurrentPath("")}
                                className={`hover:text-blue-500 transition-colors ${!currentPath ? "text-gray-900 dark:text-white" : "text-gray-400"}`}
                            >
                                Root
                            </button>
                            {breadcrumbs.map((part, idx) => (
                                <React.Fragment key={idx}>
                                    <ChevronRight size={14} className="mx-1 text-gray-300" />
                                    <button
                                        onClick={() => setCurrentPath("/" + breadcrumbs.slice(0, idx + 1).join("/"))}
                                        className={`hover:text-blue-500 transition-colors ${idx === breadcrumbs.length - 1 ? "text-gray-900 dark:text-white" : "text-gray-400"}`}
                                    >
                                        {part}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <button
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <UploadIcon size={18} />
                        Upload PDF
                    </button>
                </div>

                {/* Explorer Content */}
                <div
                    className={`flex-1 p-8 overflow-y-auto transition-colors ${
                        dragActive ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                    }`}
                    onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                >
                    {currentDir ? (
                        <FileGrid
                            tree={currentDir}
                            path={currentPath}
                            setPath={setCurrentPath}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 w-full h-full">
                            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                            <p className="text-sm font-medium text-gray-500">Loading files...</p>
                        </div>
                    )}
                </div>

                {/* Status Bar */}
                {(uploadProgress > 0 || uploadStatus) && (
                    <div className="px-6 py-3 bg-gray-50/80 dark:bg-gray-900/80 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-3 flex-1 mr-4">
                            {uploadProgress > 0 && (
                                <div className="w-full max-w-[200px] bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="bg-blue-500 h-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                            )}
                            <span className={`text-xs font-bold ${
                                uploadStatus.startsWith("✅") ? "text-emerald-500" : 
                                uploadStatus.startsWith("❌") ? "text-rose-500" : "text-blue-500 animate-pulse"
                            }`}>
                                {uploadStatus}
                            </span>
                        </div>
                        {uploadProgress > 0 && (
                            <span className="text-[10px] font-black text-gray-400">{uploadProgress}%</span>
                        )}
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                accept="application/pdf"
                onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                }}
                className="hidden"
            />
        </div>
    );
}
