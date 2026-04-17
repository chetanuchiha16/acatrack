import { create } from "zustand";
import { authStatusAuthStatusGet } from "./client/sdk.gen";
import type { AuthStatusResponse } from "./client/types.gen";

export type AuthUser = AuthStatusResponse;

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
            const { data } = await authStatusAuthStatusGet();
            if (data?.logged_in) {
                set({ user: data, loading: false });
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
