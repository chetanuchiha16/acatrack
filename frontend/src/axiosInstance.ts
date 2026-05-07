// axiosInstance.ts
import axios, { type InternalAxiosRequestConfig, type AxiosError } from "axios";
import API_BASE from "./config";
import { getToken, clearToken } from "./utils/storage";

const axiosInstance = axios.create({
    baseURL: API_BASE,
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ─── Response interceptor: handle 401 globally ───────────────────────────────
axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        if (error.response?.status === 401) {
            const url = (error.config?.url ?? "");
            // Always clear token on 401 so localStorage doesn't lie to the app
            clearToken();

            // Never hard-redirect for the auth probe itself — let the store/hook
            // handle it via React Router. A hard reload here creates an infinite
            // remount loop: 401 → reload → mount → probe → 401 → reload → ∞
            const isAuthProbe = url.includes("/auth/status");
            if (!isAuthProbe) {
                if (!window.location.pathname.startsWith("/auth")) {
                    window.location.href = "/auth";
                }
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
