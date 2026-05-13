import React, { useState, useEffect, useRef } from "react";
import { FaFolder, FaFilePdf } from "react-icons/fa";
import { 
    listNotesAuthStaffUploadNotesGet,
    uploadNoteAuthStaffUploadNotesPost
} from "./client/sdk.gen";
interface FileItemProps {
    name: string;
    isFolder: boolean;
    onClick: () => void;
    selected: boolean;
}

function FileItem({ name, isFolder, onClick, selected }: FileItemProps) {
    return (
        <div
            className={`flex flex-col items-center w-24 sm:w-28 m-2 p-3 rounded-xl cursor-pointer transition 
        hover:bg-indigo-100 dark:hover:bg-indigo-800 shadow-sm
        ${selected ? "ring-2 ring-indigo-400 dark:ring-indigo-300" : ""}`}
            onClick={onClick}
        >
            <div className="text-4xl mb-1 text-amber-500">
                {isFolder ? (
                    <FaFolder />
                ) : (
                    <FaFilePdf className="text-red-500" />
                )}
            </div>
            <div className="text-xs sm:text-sm text-center break-words dark:text-gray-200 text-gray-800">
                {name}
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

    return (
        <div className="flex flex-wrap justify-center">
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
                                // PDF file: open in new tab
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
        setCurrentPath("/" + parts.join("/"));
    };

    const handleFileSelect = (file: File) => {
        if (file.type !== "application/pdf") {
            setUploadStatus("❌ Only PDF files are allowed.");
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
            const refreshRes = await listNotesAuthStaffUploadNotesGet();
            setFileTree(refreshRes.data as Record<string, unknown>);
        } catch (err) {
            console.error(err);
            setUploadStatus("❌ Upload error");
        }
    };

    return (
        <div className="w-screen min-h-screen bg-gradient-to-br from-gray-50-50 to-slate-200 dark:from-gray-900 dark:to-gray-800 flex justify-center items-center p-4">
            <div className="w-full sm:w-[90vw] lg:w-[85vw] xl:w-[78vw] h-auto min-h-[90vh] mx-auto flex flex-col border border-gray-300 dark:border-gray-700 rounded-2xl shadow-lg dark:text-gray-100 dark:bg-gray-900 bg-white text-gray-900 p-6 overflow-hidden">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center mb-6 gap-3 text-center">
                    <h2 className="text-xl sm:text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
                        📄 Upload Notes (PDF)
                    </h2>
                    {currentPath && (
                        <button
                            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-300 dark:hover:text-indigo-200 transition"
                            onClick={goBack}
                        >
                            🔙 Back
                        </button>
                    )}
                </div>

                {/* Drop Zone / File Grid */}
                <div
                    className={`flex-1 p-6 rounded-xl border-2 border-dashed transition cursor-pointer ${
                        dragActive
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40"
                            : "border-gray-300 dark:border-gray-600"
                    }`}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                    }}
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
                        <p className="text-center text-gray-500 dark:text-gray-400">
                            Loading...
                        </p>
                    )}
                    <p className="mt-4 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {dragActive
                            ? "📂 Drop file here to upload to this folder"
                            : "Drag & drop or click the button below to select a PDF"}
                    </p>
                </div>

                {/* Upload Button */}
                <div className="mt-6 flex justify-center">
                    <button
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 active:scale-95 transition"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        📤 Upload PDF
                    </button>
                </div>

                <input
                    type="file"
                    ref={fileInputRef}
                    accept="application/pdf"
                    onChange={(e) => {
                        if (e.target.files?.[0])
                            handleFileSelect(e.target.files[0]);
                    }}
                    className="hidden"
                />

                {/* Progress Bar */}
                {uploadProgress > 0 && (
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
                        <div
                            className="bg-indigo-500 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                )}

                {/* Upload Status */}
                {uploadStatus && (
                    <p
                        className={`mt-3 text-sm text-center ${
                            uploadStatus.startsWith("✅")
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                        }`}
                    >
                        {uploadStatus}
                    </p>
                )}
            </div>
        </div>
    );
}
