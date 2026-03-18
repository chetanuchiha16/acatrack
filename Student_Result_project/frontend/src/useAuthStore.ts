// useAuthStore.ts
import { create } from "zustand";
import axiosInstance from "./axiosInstance";
import API_BASE from "./config";

export interface AuthUser {
    id?: string;
    name?: string;
    mentor_id?: string;
    logged_in: boolean;
    who: string;
    [key: string]: unknown;
}

interface AuthState {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
    fetchAuthStatus: () => Promise<void>;
    clearAuth: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: false,
    error: null,

    fetchAuthStatus: async () => {
        set({ loading: true, error: null });
        try {
            const res = await axiosInstance.get(`${API_BASE}/auth/status`, {
                withCredentials: true,
            });
            if (res.data.logged_in) {
                set({ user: res.data, loading: false });
            } else {
                set({ user: null, loading: false });
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            set({ error: message, loading: false });
        }
    },

    clearAuth: () => set({ user: null }),
}));

export default useAuthStore;
