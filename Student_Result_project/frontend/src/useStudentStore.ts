// useStudentStore.ts
import { create } from "zustand";
import API_BASE from "./config";
import { fetchWithAuth } from "./fetchWithAuth";

// Typed from actual API shape used across components
export interface StudentInfo {
    usn: string;
    name: string;
    [key: string]: unknown; // allow extra fields from API
}

export interface MentorInfo {
    name: string;
    email: string;
    phone: string;
    [key: string]: unknown;
}

export interface StudentData {
    student: StudentInfo;
    mentor: MentorInfo | null;
    [key: string]: unknown;
}

interface StudentState {
    studentData: StudentData | null;
    loading: boolean;
    error: string | null;
    fetchStudentData: () => Promise<void>;
    clearStudentData: () => void;
}

const useStudentStore = create<StudentState>((set) => ({
    studentData: null,
    loading: false,
    error: null,

    fetchStudentData: async () => {
        set({ loading: true, error: null });
        try {
            const res = await fetchWithAuth(
                `${API_BASE}/parent/student-details`,
                {}
            );
            const data: StudentData = await res.json();
            set({ studentData: data, loading: false });
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Unknown error";
            set({ error: message, loading: false });
        }
    },

    clearStudentData: () => set({ studentData: null }),
}));

export default useStudentStore;
