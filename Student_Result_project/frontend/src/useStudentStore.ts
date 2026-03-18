// useStudentStore.ts
import { create } from "zustand";
import API_BASE from "./config";
import { fetchWithAuth } from "./fetchWithAuth";
import type { StudentInfo, MentorInfo, StudentData } from "./types";

// Re-export for consumers that previously imported from this file
export type { StudentInfo, MentorInfo, StudentData } from "./types";

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
