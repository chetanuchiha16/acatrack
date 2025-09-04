import { create } from "zustand";
import API_BASE from "./config";

const useStudentStore = create((set) => ({
  studentData: null,
  loading: false,
  error: null,

  fetchStudentData: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/parent/student-details`, { credentials: "include" });
      const data = await res.json();
      set({ studentData: data, loading: false });
    } catch (err) {
      console.error(err);
      set({ error: err.message, loading: false });
    }
  },

  clearStudentData: () => set({ studentData: null }),
}));

export default useStudentStore;
