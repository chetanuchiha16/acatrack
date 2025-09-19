// useAuthStore.js
import { create } from "zustand";
import axios from "axios";
import API_BASE from "./config";

const useAuthStore = create((set) => ({
  user: null,
  loading: false,
  error: null,

  fetchAuthStatus: async () => {
    set({ loading: true, error: null });
    try {
      const res = await axios.get(`${API_BASE}/auth/status`, {
        withCredentials: true, // IMPORTANT: keep session cookie
      });
      if (res.data.logged_in) {
        set({ user: res.data, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  clearAuth: () => set({ user: null }),
}));

export default useAuthStore;
