// useStudentStore.ts
import { create } from "zustand";
import API_BASE from "./config";
import { fetchWithAuth } from "./fetchWithAuth";

interface StudentState {
    studentData: unknown;
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
            const data = await res.json();
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
