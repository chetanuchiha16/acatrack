// useStudentStore.ts
import { create } from "zustand";
import { 
    getStudentDetailsParentStudentDetailsGet,
    getStudentProfileAuthStudentDetailsGet 
} from "../client/sdk.gen";
import type { StudentInfo, MentorInfo, StudentData } from "../types";
import useAuthStore from "./useAuthStore";

// Re-export for consumers that previously imported from this file
export type { StudentInfo, MentorInfo, StudentData } from "../types";

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
            const role = useAuthStore.getState().user?.who;
            let res;
            if (role === "Student") {
                res = await getStudentProfileAuthStudentDetailsGet();
            } else {
                res = await getStudentDetailsParentStudentDetailsGet();
            }
            if (res.data) set({ studentData: res.data as StudentData, loading: false });
        } catch (err: unknown) {
            console.error(err);
            const message = err instanceof Error ? err.message : "Unknown error";
            set({ error: message, loading: false });
        }
    },

    clearStudentData: () => set({ studentData: null }),
}));

export default useStudentStore;
