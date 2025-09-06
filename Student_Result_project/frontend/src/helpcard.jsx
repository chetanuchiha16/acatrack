import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function HelpCard() {
    const [open, setOpen] = useState(false);

    return (
        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-200 rounded-2xl shadow-md mt-4 p-4 max-w-sm text-sm">

            {/* Header with toggle */}
            <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setOpen(!open)}
            >
                <h3 className="font-semibold text-purple-700 text-lg flex items-center gap-2">
                    ℹ️ Help & Commands
                </h3>
                {open ? <ChevronUp size={20} className="text-purple-600" /> : <ChevronDown size={20} className="text-purple-600" />}
            </div>

            {/* Collapsible content */}
            {open && (
                <div className="mt-4 text-sm text-gray-700">
                    <p className="mb-3 text-gray-600">You can interact with the bot using these commands:</p>

                    <div className="grid gap-3">
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <b className="text-purple-700">list</b>
                            <p className="text-gray-600 text-xs">Show all students</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <b className="text-purple-700">fetch report [name]</b>
                            <p className="text-gray-600 text-xs">Get the full student report</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <b className="text-purple-700">backlog report [name]</b>
                            <p className="text-gray-600 text-xs">View backlog details only</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <b className="text-purple-700">AI summary [name]</b>
                            <p className="text-gray-600 text-xs">AI-generated performance insights</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                            <b className="text-purple-700">download report [name]</b>
                            <p className="text-gray-600 text-xs">Get download links for reports</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}
