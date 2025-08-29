import React, { useState } from "react";
import Result from "./Result";
import { semesterOptions } from "./config";

export default function ParentResult() {
    const [usn, setUsn] = useState("");
    const [sem, setSem] = useState(semesterOptions[0]);

    return (
        <div className="max-w-md min-w-full  mt-10 p-6 justify-center items-center rounded shadow">
            <h2 className="text-2xl font-bold mb-6 text-center">
                Student Result Lookup
            </h2>
            <form className="space-y-4 mb-6">
                <div>
                    <label className="block mb-1 font-medium text-gray-700">
                        USN
                    </label>
                    <input
                        type="text"
                        value={usn}
                        onChange={(e) => setUsn(e.target.value)}
                        placeholder="Enter USN"
                        className="w-[20%] px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400"
                    />
                </div>
                <div>
                    <label className="block mb-1 font-medium text-gray-700">
                        Semester
                    </label>
                    <select
                        value={sem}
                        onChange={(e) => setSem(e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring focus:border-blue-400"
                    >
                        {semesterOptions.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                </div>
            </form>
            <div className="w-full max-w-6xl flex justify-center m-auto items-center">
                
            <Result usn={usn} semester={sem} />
            </div>
        </div>
    );
}
