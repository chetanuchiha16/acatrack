import React, { useEffect, useState } from "react";
import { Folder, FileText, ChevronRight, ArrowLeft, FolderOpen, BookOpen } from "lucide-react";
import { listNotesAuthStudentNotesGet } from "../../client/sdk.gen";
import LoadingSpinner from "../../components/LoadingSpinner";

export type FileTreeNode = string | FileTree;
export interface FileTree { [key: string]: FileTreeNode; }

function isFileTree(node: unknown): node is FileTree {
    return typeof node === "object" && node !== null && !Array.isArray(node);
}

function getDirAtPath(tree: FileTree | null, path: string): FileTree | null {
    if (!tree) return null;
    if (!path) return tree;
    const parts = path.split("/").filter(Boolean);
    let current: FileTreeNode = tree;
    for (const part of parts) {
        if (!isFileTree(current)) return {};
        const next: FileTreeNode = (current as FileTree)[part];
        if (!next) return {};
        current = next;
    }
    return isFileTree(current) ? current : {};
}

const FileExplorer: React.FC = () => {
    const [fileTree, setFileTree] = useState<FileTree | null>(null);
    const [currentPath, setCurrentPath] = useState<string>("");

    useEffect(() => {
        listNotesAuthStudentNotesGet()
            .then(res => { const data = res.data as unknown; setFileTree(isFileTree(data) ? data : {}); })
            .catch(err => console.error("Failed to load notes:", err));
    }, []);

    const currentDir = fileTree ? getDirAtPath(fileTree, currentPath) : null;
    const pathParts = currentPath.split("/").filter(Boolean);

    const goBack = () => {
        const parts = pathParts.slice(0, -1);
        setCurrentPath(parts.length ? "/" + parts.join("/") : "");
    };

    const goToSegment = (index: number) => {
        const parts = pathParts.slice(0, index + 1);
        setCurrentPath("/" + parts.join("/"));
    };

    const entries = currentDir ? Object.entries(currentDir) : [];
    const folders = entries.filter(([, v]) => isFileTree(v));
    const files = entries.filter(([, v]) => !isFileTree(v));

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl">
                        <BookOpen className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Classroom</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Browse uploaded notes and materials</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                        <Folder size={14} className="text-amber-500" />
                        <span className="font-bold text-gray-900 dark:text-white">{folders.length}</span>
                        <span className="text-xs text-gray-400">folders</span>
                    </div>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                    <div className="flex items-center gap-1.5">
                        <FileText size={14} className="text-rose-500" />
                        <span className="font-bold text-gray-900 dark:text-white">{files.length}</span>
                        <span className="text-xs text-gray-400">files</span>
                    </div>
                </div>
            </div>

            {/* Breadcrumb bar */}
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 shadow-sm mb-4 overflow-x-auto">
                {currentPath && (
                    <button onClick={goBack} className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mr-1 shrink-0">
                        <ArrowLeft size={16} />
                    </button>
                )}
                <button onClick={() => setCurrentPath("")}
                    className={`text-xs font-bold px-2 py-1 rounded-md transition-colors shrink-0 ${!currentPath ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                    Root
                </button>
                {pathParts.map((part, i) => (
                    <React.Fragment key={i}>
                        <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 shrink-0" />
                        <button onClick={() => goToSegment(i)}
                            className={`text-xs font-bold px-2 py-1 rounded-md transition-colors shrink-0 ${i === pathParts.length - 1 ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                            {part}
                        </button>
                    </React.Fragment>
                ))}
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                {!currentDir ? (
                    <LoadingSpinner message="Fetching classroom materials..." fullScreen={false} />
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                            <FolderOpen size={32} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400">This folder is empty</p>
                        <p className="text-xs text-gray-400 mt-1 max-w-xs">No files or subdirectories have been uploaded here yet.</p>
                    </div>
                ) : (
                    <div>
                        {/* Table header */}
                        <div className="grid grid-cols-[1fr_auto] px-4 py-2 border-b border-gray-100 dark:border-gray-700 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            <span>Name</span>
                            <span>Type</span>
                        </div>

                        {/* Folders first, then files */}
                        {folders.map(([name]) => {
                            const fullPath = `${currentPath}/${name}`;
                            const subTree = currentDir[name] as FileTree;
                            const count = Object.keys(subTree).length;
                            return (
                                <div key={fullPath} onClick={() => setCurrentPath(fullPath)}
                                    className="grid grid-cols-[1fr_auto] items-center px-4 py-2.5 border-b border-gray-50 dark:border-gray-700/50 cursor-pointer hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                                            <Folder size={16} className="text-amber-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{name}</p>
                                            <p className="text-xs text-gray-400">{count} item{count !== 1 ? "s" : ""}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">Folder</span>
                                </div>
                            );
                        })}

                        {files.map(([name, value]) => {
                            const fullPath = `${currentPath}/${name}`;
                            return (
                                <div key={fullPath} onClick={() => { if (typeof value === "string") window.open(value, "_blank"); }}
                                    className="grid grid-cols-[1fr_auto] items-center px-4 py-2.5 border-b border-gray-50 dark:border-gray-700/50 cursor-pointer hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-colors group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 rounded-lg group-hover:bg-rose-100 dark:group-hover:bg-rose-900/30 transition-colors">
                                            <FileText size={16} className="text-rose-500" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{name}</p>
                                    </div>
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">PDF</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileExplorer;
