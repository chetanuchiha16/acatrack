// axiosInstance.ts
import axios, { InternalAxiosRequestConfig } from "axios";
import API_BASE from "./config";

const axiosInstance = axios.create({
    baseURL: API_BASE,
});

// Add token to every request automatically
axiosInstance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = sessionStorage.getItem("jwt_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default axiosInstance;
