// axiosInstance.js
import axios from "axios";
import API_BASE from "./config";
const axiosInstance = axios.create({
    baseURL: API_BASE, // or API_BASE
});

// Add token to every request automatically
axiosInstance.interceptors.request.use((config) => {
    const token = sessionStorage.getItem("jwt_token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default axiosInstance;
