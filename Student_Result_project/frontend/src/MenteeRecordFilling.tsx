import { useState } from "react";
import axios from "axios";
import API_BASE from "./config";

interface MenteeRecordFillingProps {
    usn: string;
    name: string;
}

interface RecordEntry {
    [key: string]: string;
}

interface MenteeSummary {
    cultural_activities: string;
    co_curricular_activities: string;
    hackathon: string;
    coding_competitions: string;
    other_achievements: string;
}

interface MenteeFormData {
    name: string;
    usn: string;
    mentor_name: string;
    mentor_phone: string;
    phone_number: string;
    email: string;
    temporary_address: string;
    permanent_address: string;
    father_name: string;
    Contact: string;
    Occupation: string;
    mother_name: string;
    Contact_Mother: string;
    Occupation_Mother: string;
    sgpa: string[];
    projects: RecordEntry[];
    internships: RecordEntry[];
    activities: RecordEntry[];
    summary: MenteeSummary;
}

export default function MenteeRecordFilling({ usn, name }: MenteeRecordFillingProps) {
    const [formData, setFormData] = useState<MenteeFormData>({
        name: name || "",
        usn: usn || "",
        mentor_name: "",
        mentor_phone: "",
        phone_number: "",
        email: "",
        temporary_address: "",
        permanent_address: "",
        father_name: "",
        Contact: "",
        Occupation: "",
        mother_name: "",
        Contact_Mother: "",
        Occupation_Mother: "",
        sgpa: Array(8).fill(""),
        projects: [],
        internships: [],
        activities: [],
        summary: {
            cultural_activities: "",
            co_curricular_activities: "",
            hackathon: "",
            coding_competitions: "",
            other_achievements: "",
        },
    });

    const [message, setMessage] = useState("");

    // Handle normal input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Handle array inputs like SGPA
    const handleArrayChange = (index: number, value: string, key: keyof MenteeFormData) => {
        const currentArr = formData[key] as string[];
        const newArr = [...currentArr];
        newArr[index] = value;
        setFormData((prev) => ({ ...prev, [key]: newArr }));
    };

    // Add dynamic rows for projects, internships, activities
    const addRow = (key: "projects" | "internships" | "activities") => {
        setFormData((prev) => ({
            ...prev,
            [key]: [...prev[key], {}],
        }));
    };

    const handleObjectArrayChange = (
        key: "projects" | "internships" | "activities",
        index: number,
        field: string,
        value: string
    ) => {
        const newArr = [...formData[key]];
        newArr[index] = { ...newArr[index], [field]: value };
        setFormData((prev) => ({ ...prev, [key]: newArr }));
    };

    // Submit form
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {
            const res = await axios.post(
                `${API_BASE}/mentee/upload_form`,
                formData
            );
            if (res.data.status === "success") {
                setMessage(`PDF generated successfully: ${res.data.filename}`);
                console.log(formData.Contact_Mother, formData.Occupation_Mother);

            }
        } catch (err) {
            setMessage("Error submitting form.");
            console.error(err);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white text-center">
                Mentee Record Form
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        "name",
                        "usn",
                        "mentor_name",
                        "mentor_phone",
                        "phone_number",
                        "email",
                        "temporary_address",
                        "permanent_address",
                    ].map((field) => {
                        const isAddressField =
                            field === "temporary_address" ||
                            field === "permanent_address";

                        return isAddressField ? (
                            <textarea
                                key={field}
                                name={field}
                                placeholder={field
                                    .replace("_", " ")
                                    .toUpperCase()}
                                value={formData[field]}
                                onChange={handleChange}
                                rows={5} // fixed visible height
                                maxLength={100} // ✅ limit characters
                                className="w-48 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm 
             resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 
             dark:bg-gray-700 dark:text-white overflow-y-auto break-words whitespace-pre-wrap"
                            />
                        ) : (
                            <input
                                key={field}
                                type="text"
                                name={field}
                                placeholder={field
                                    .replace("_", " ")
                                    .toUpperCase()}
                                value={formData[field]}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm h-12 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                            />
                        );
                    })}
                </div>

                {/* Parent Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                        "father_name",
                        "mother_name",
                        "Contact",
                        "Contact_Mother",
                        "Occupation",
                        "Occupation_Mother",
                    ].map((field) =>
                        field.toLowerCase().includes("occupation") ? (
                            <textarea
                                key={field}
                                name={field}
                                placeholder={field
                                    .replace("_", " ")
                                    .toUpperCase()}
                                value={formData[field] || ""}
                                onChange={handleChange}
                                rows={2}
                                maxLength={20}
                                className="w-36 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm 
        resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 
        dark:bg-gray-700 dark:text-white overflow-y-auto break-words whitespace-pre-wrap"
                            />
                        ) : (
                            <input
                                key={field}
                                name={field}
                                placeholder={field
                                    .replace("_", " ")
                                    .toUpperCase()}
                                value={formData[field] || ""}
                                onChange={handleChange}
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm h-12 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
                            />
                        )
                    )}
                </div>

                {/* SGPA */}
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mt-4">
                    SGPA (Sem 1 - 8)
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {formData.sgpa.map((val, i) => (
                        <input
                            key={i}
                            placeholder={`Sem ${i + 1}`}
                            value={val}
                            onChange={(e) =>
                                handleArrayChange(i, e.target.value, "sgpa")
                            }
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white text-center"
                        />
                    ))}
                </div>

                {/* Projects */}
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mt-4">
                    Projects
                </h3>
                {formData.projects.map((proj, i) => (
                    <div
                        key={i}
                        className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2"
                    >
                        {["company", "address", "duration", "stipend"].map(
                            (field) => (
                                <textarea
                                    key={field}
                                    name={field}
                                    placeholder={field
                                        .replace("_", " ")
                                        .toUpperCase()}
                                    value={proj[field] || ""}
                                    onChange={(e) =>
                                        handleObjectArrayChange(
                                            "projects",
                                            i,
                                            field,
                                            e.target.value
                                        )
                                    }
                                    rows={2}
                                    maxLength={34}
                                    className="w-36 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm 
          resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 
          dark:bg-gray-700 dark:text-white overflow-y-auto break-words whitespace-pre-wrap"
                                />
                            )
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    onClick={() => addRow("projects")}
                    className="text-blue-600 hover:underline mb-4"
                >
                    + Add Project
                </button>

                {/* Internships */}
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mt-4">
                    Internships
                </h3>
                {formData.internships.map((intern, i) => (
  <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
    {["company", "address", "duration", "stipend"].map((field) => (
      <textarea
        key={field}
        name={field}
        placeholder={field.replace("_", " ").toUpperCase()}
        value={intern[field] || ""}
        onChange={(e) => handleObjectArrayChange("internships", i, field, e.target.value)}
        rows={2}
        maxLength={34}
        className="w-36 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm 
          resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 
          dark:bg-gray-700 dark:text-white overflow-y-auto break-words whitespace-pre-wrap"
      />
    ))}
  </div>
))}
                <button
                    type="button"
                    onClick={() => addRow("internships")}
                    className="text-blue-600 hover:underline mb-4"
                >
                    + Add Internship
                </button>

                {/* Activities */}
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mt-4">
                    Activities
                </h3>
                {formData.activities.map((act, i) => (
  <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-2">
    {["Sports", "conference_details", "papers_published", "certifications_from_MOOC"].map((field) => (
      <textarea
        key={field}
        name={field}
        placeholder={field.replace("_", " ").toUpperCase()}
        value={act[field] || ""}
        onChange={(e) => handleObjectArrayChange("activities", i, field, e.target.value)}
        rows={3}
        maxLength={49}
        className="w-36 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm 
          resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 
          dark:bg-gray-700 dark:text-white overflow-y-auto break-words whitespace-pre-wrap"
      />
    ))}
  </div>
))}
                <button
                    type="button"
                    onClick={() => addRow("activities")}
                    className="text-blue-600 hover:underline mb-4"
                >
                    + Add Activity
                </button>

                {/* Summary */}
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mt-4">
                    Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.keys(formData.summary).map((key) => (
                        <textarea
                            key={key}
                            name={key}
                            placeholder={key.replace("_", " ").toUpperCase()}
                            value={formData.summary[key]}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    summary: {
                                        ...prev.summary,
                                        [key]: e.target.value,
                                    },
                                }))
                            }
                            rows={3}
                            maxLength={49} // ✅ limit characters
                            className="w-36 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm 
             resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 
             dark:bg-gray-700 dark:text-white overflow-y-auto break-words whitespace-pre-wrap"
                        />
                    ))}
                </div>

                <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition mt-6 w-full sm:w-auto"
                >
                    Submit & Generate PDF
                </button>
            </form>

            {message && (
                <p className="mt-4 text-center text-sm text-gray-700 dark:text-gray-300">
                    {message}
                </p>
            )}
        </div>
    );
}
