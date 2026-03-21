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
            // Token expired or invalid — clear storage and redirect to login
            clearToken();
            // Use window.location so router context isn't required here
            if (!window.location.pathname.startsWith("/auth")) {
                window.location.href = "/auth";
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;
