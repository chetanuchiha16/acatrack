import React, { useState, useEffect } from "react";
import {
    Folder,
    FileText,
    ChevronRight,
    ArrowLeft,
    MoreVertical,
    FileUp,
    Loader2
} from "lucide-react";
import { listNotesAuthStudentNotesGet } from "../../client/sdk.gen";

export type FileTreeNode = string | FileTree;
export interface FileTree { [key: string]: FileTreeNode; }

function isFileTree(node: unknown): node is FileTree {
    return typeof node === "object" && node !== null && !Array.isArray(node);
}

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
    tree: FileTree;
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
                <p className="text-xs opacity-60">No files or subdirectories uploaded here yet</p>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap justify-center sm:justify-start w-full">
            {entries.map(([name, value]) => {
                const fullPath = `${path}/${name}`;
                const isFolder = isFileTree(value);

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
            .then((res) => {
                const data = res.data as unknown;
                setFileTree(isFileTree(data) ? data : {});
            })
            .catch((err) => console.error("Failed to load notes:", err));
    }, []);

    const currentDir = fileTree ? getDirAtPath(fileTree, currentPath) : null;

    const goBack = () => {
        const parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        setCurrentPath(parts.length > 0 ? "/" + parts.join("/") : "");
    };

    const breadcrumbs = currentPath.split("/").filter(Boolean);

    return (
        <div className="w-full h-full max-h-[85vh] flex flex-col bg-white dark:bg-gray-800/80 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
            {/* Explorer Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center gap-3 flex-shrink-0">
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

            {/* Explorer Content */}
            <div className="flex-1 p-8 overflow-y-auto">
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
        </div>
    );
};

export default FileExplorer;
