import { useState, type ChangeEvent, type FormEvent } from "react";
import { uploadFormMenteeUploadFormPost } from "../../client/sdk.gen";
import { User, Users, GraduationCap, Briefcase, Trophy, ChevronLeft, ChevronRight, Lock, Trash2, Plus, FileText, CheckCircle } from "lucide-react";

interface MenteeRecordFillingProps { usn: string; name: string; }
interface RecordEntry { [key: string]: string; }
interface MenteeSummary { cultural_activities: string; co_curricular_activities: string; hackathon: string; coding_competitions: string; other_achievements: string; [key: string]: string; }

interface MenteeFormData {
    name: string; usn: string; mentor_name: string; mentor_phone: string;
    phone_number: string; email: string; temporary_address: string; permanent_address: string;
    father_name: string; Contact: string; Occupation: string;
    mother_name: string; Contact_Mother: string; Occupation_Mother: string;
    sgpa: string[]; projects: RecordEntry[]; internships: RecordEntry[];
    activities: RecordEntry[]; summary: MenteeSummary;
    [key: string]: unknown;
}

const STEPS = [
    { label: "Personal", icon: User },
    { label: "Parents", icon: Users },
    { label: "Academics", icon: GraduationCap },
    { label: "Experience", icon: Briefcase },
    { label: "Activities", icon: Trophy },
] as const;

export default function MenteeRecordFilling({ usn, name }: MenteeRecordFillingProps) {
    const [step, setStep] = useState(0);
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<MenteeFormData>({
        name: name || "", usn: usn || "", mentor_name: "", mentor_phone: "",
        phone_number: "", email: "", temporary_address: "", permanent_address: "",
        father_name: "", Contact: "", Occupation: "",
        mother_name: "", Contact_Mother: "", Occupation_Mother: "",
        sgpa: Array(8).fill(""), projects: [], internships: [],
        activities: [], summary: { cultural_activities: "", co_curricular_activities: "", hackathon: "", coding_competitions: "", other_achievements: "" },
    });

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name: n, value } = e.target;
        setFormData(prev => ({ ...prev, [n]: value }));
    };

    const handleArrayChange = (index: number, value: string, key: keyof MenteeFormData) => {
        const arr = [...(formData[key] as string[])];
        arr[index] = value;
        setFormData(prev => ({ ...prev, [key]: arr }));
    };

    const addRow = (key: "projects" | "internships" | "activities") => {
        setFormData(prev => ({ ...prev, [key]: [...prev[key], {}] }));
    };

    const removeRow = (key: "projects" | "internships" | "activities", index: number) => {
        setFormData(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
    };

    const handleObjectArrayChange = (key: "projects" | "internships" | "activities", index: number, field: string, value: string) => {
        const arr = [...formData[key]];
        arr[index] = { ...arr[index], [field]: value };
        setFormData(prev => ({ ...prev, [key]: arr }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await uploadFormMenteeUploadFormPost({ body: formData as unknown as { [key: string]: unknown } });
            if (res.data) {
                const data = res.data as { status: string; filename: string };
                if (data.status === "success") setMessage(`PDF generated successfully: ${data.filename}`);
            }
        } catch { setMessage("Error submitting form."); }
        finally { setSubmitting(false); }
    };

    const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
    const back = () => setStep(s => Math.max(s - 1, 0));

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl"><FileText className="w-5 h-5 text-blue-500" /></div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Mentee Record Form</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Fill out your academic and personal details</p>
                    </div>
                </div>
                <div className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-1 mb-4">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const done = i < step;
                    const active = i === step;
                    return (
                        <button key={i} type="button" onClick={() => setStep(i)}
                            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                active ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                                : done ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400"
                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                            }`}
                        >
                            {done ? <CheckCircle size={14} /> : <Icon size={14} />}
                            <span className="hidden sm:inline">{s.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Form card */}
            <form onSubmit={handleSubmit}>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-5">

                    {/* Step 0: Personal */}
                    {step === 0 && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                <User size={14} className="text-blue-500" /> Personal Information
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Field label="Full Name" value={formData.name} locked />
                                <Field label="USN" value={formData.usn} locked />
                                <Field label="Mentor Name" name="mentor_name" value={formData.mentor_name} onChange={handleChange} />
                                <Field label="Mentor Phone" name="mentor_phone" value={formData.mentor_phone} onChange={handleChange} />
                                <Field label="Phone Number" name="phone_number" value={formData.phone_number} onChange={handleChange} />
                                <Field label="Email Address" name="email" value={formData.email} onChange={handleChange} type="email" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FieldArea label="Temporary Address" name="temporary_address" value={formData.temporary_address} onChange={handleChange} />
                                <FieldArea label="Permanent Address" name="permanent_address" value={formData.permanent_address} onChange={handleChange} />
                            </div>
                        </div>
                    )}

                    {/* Step 1: Parents */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                <Users size={14} className="text-blue-500" /> Parent / Guardian Details
                            </h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Father</p>
                                    <Field label="Name" name="father_name" value={formData.father_name} onChange={handleChange} />
                                    <Field label="Contact Number" name="Contact" value={formData.Contact} onChange={handleChange} />
                                    <Field label="Occupation" name="Occupation" value={formData.Occupation} onChange={handleChange} />
                                </div>
                                <div className="rounded-lg border border-gray-100 dark:border-gray-700 p-4 space-y-3">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mother</p>
                                    <Field label="Name" name="mother_name" value={formData.mother_name} onChange={handleChange} />
                                    <Field label="Contact Number" name="Contact_Mother" value={formData.Contact_Mother} onChange={handleChange} />
                                    <Field label="Occupation" name="Occupation_Mother" value={formData.Occupation_Mother} onChange={handleChange} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Academics */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                <GraduationCap size={14} className="text-blue-500" /> Semester-wise SGPA
                            </h3>
                            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                                {formData.sgpa.map((val, i) => (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Sem {i + 1}</span>
                                        <input
                                            value={val}
                                            onChange={e => handleArrayChange(i, e.target.value, "sgpa")}
                                            placeholder="0.00"
                                            className="w-full text-center text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Projects & Internships */}
                    {step === 3 && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                <Briefcase size={14} className="text-blue-500" /> Projects & Internships
                            </h3>

                            {/* Projects */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Projects ({formData.projects.length})</p>
                                    <button type="button" onClick={() => addRow("projects")}
                                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                        <Plus size={13} /> Add
                                    </button>
                                </div>
                                {formData.projects.length === 0 && <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">No projects added yet</p>}
                                <div className="space-y-2">
                                    {formData.projects.map((proj, i) => (
                                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-start">
                                            {["company", "address", "duration", "stipend"].map(f => (
                                                <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={proj[f] || ""}
                                                    onChange={e => handleObjectArrayChange("projects", i, f, e.target.value)}
                                                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                                            ))}
                                            <button type="button" onClick={() => removeRow("projects", i)}
                                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Internships */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Internships ({formData.internships.length})</p>
                                    <button type="button" onClick={() => addRow("internships")}
                                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                        <Plus size={13} /> Add
                                    </button>
                                </div>
                                {formData.internships.length === 0 && <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">No internships added yet</p>}
                                <div className="space-y-2">
                                    {formData.internships.map((intern, i) => (
                                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-start">
                                            {["company", "address", "duration", "stipend"].map(f => (
                                                <input key={f} placeholder={f.charAt(0).toUpperCase() + f.slice(1)} value={intern[f] || ""}
                                                    onChange={e => handleObjectArrayChange("internships", i, f, e.target.value)}
                                                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                                            ))}
                                            <button type="button" onClick={() => removeRow("internships", i)}
                                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Activities & Summary */}
                    {step === 4 && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                                <Trophy size={14} className="text-blue-500" /> Activities & Achievements
                            </h3>

                            {/* Activities */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Activities ({formData.activities.length})</p>
                                    <button type="button" onClick={() => addRow("activities")}
                                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                        <Plus size={13} /> Add
                                    </button>
                                </div>
                                {formData.activities.length === 0 && <p className="text-xs text-gray-400 py-3 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">No activities added yet</p>}
                                <div className="space-y-2">
                                    {formData.activities.map((act, i) => (
                                        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-start">
                                            {[{k:"Sports",l:"Sports"},{k:"conference_details",l:"Conference"},{k:"papers_published",l:"Papers"},{k:"certifications_from_MOOC",l:"MOOC Certs"}].map(({k,l}) => (
                                                <input key={k} placeholder={l} value={act[k] || ""}
                                                    onChange={e => handleObjectArrayChange("activities", i, k, e.target.value)}
                                                    className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400" />
                                            ))}
                                            <button type="button" onClick={() => removeRow("activities", i)}
                                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Summary</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {([
                                        ["cultural_activities", "Cultural Activities"],
                                        ["co_curricular_activities", "Co-curricular Activities"],
                                        ["hackathon", "Hackathons"],
                                        ["coding_competitions", "Coding Competitions"],
                                        ["other_achievements", "Other Achievements"],
                                    ] as [string, string][]).map(([key, label]) => (
                                        <div key={key}>
                                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
                                            <textarea
                                                value={formData.summary[key]}
                                                onChange={e => setFormData(prev => ({ ...prev, summary: { ...prev.summary, [key]: e.target.value } }))}
                                                rows={2}
                                                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation + Submit */}
                <div className="flex items-center justify-between mt-4">
                    <button type="button" onClick={back} disabled={step === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                        <ChevronLeft size={16} /> Back
                    </button>

                    {step < STEPS.length - 1 ? (
                        <button type="button" onClick={next}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95">
                            Next <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button type="submit" disabled={submitting}
                            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50">
                            <FileText size={16} /> {submitting ? "Generating…" : "Submit & Generate PDF"}
                        </button>
                    )}
                </div>

                {message && (
                    <div className={`mt-4 text-sm font-medium text-center p-3 rounded-lg border ${message.includes("success") ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"}`}>
                        {message}
                    </div>
                )}
            </form>
        </div>
    );
}

// ── Reusable input components ──────────────────────────────────────────────────

function Field({ label, name, value, onChange, locked, type = "text" }: {
    label: string; name?: string; value: string; onChange?: (e: ChangeEvent<HTMLInputElement>) => void; locked?: boolean; type?: string;
}) {
    return (
        <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                {locked && <Lock size={10} className="text-gray-400" />} {label}
            </label>
            <input type={type} name={name} value={value} onChange={onChange} readOnly={locked}
                className={`w-full text-sm border rounded-lg p-2.5 focus:outline-none transition-all ${
                    locked
                        ? "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                }`}
            />
        </div>
    );
}

function FieldArea({ label, name, value, onChange }: {
    label: string; name: string; value: string; onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}) {
    return (
        <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>
            <textarea name={name} value={value} onChange={onChange} rows={3}
                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
            />
        </div>
    );
}
