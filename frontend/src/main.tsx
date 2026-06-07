import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { RouterProvider } from "react-router-dom";
import { route } from "./router";
import API_BASE from "./config";
import { client } from "./client/client.gen";
import { getToken, clearToken } from "./utils/storage";

// 🚀 Bridge SDK with configured Axios instance
client.setConfig({
  baseURL: API_BASE,
});

const initialDemoSessionId = sessionStorage.getItem("X-Demo-Session-ID");
if (initialDemoSessionId) {
    client.setConfig({
        headers: {
            "X-Demo-Session-ID": initialDemoSessionId,
        }
    });
}

// ─── Request interceptor: attach JWT & Demo Session Header ───────────────────
client.instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const demoSessionId = sessionStorage.getItem("X-Demo-Session-ID");
    if (demoSessionId) {
        config.headers.set("X-Demo-Session-ID", demoSessionId);
    }
    return config;
});

// ─── Response interceptor: handle 401 globally ───────────────────────────────
client.instance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const url = (error.config?.url ?? "");
            // Always clear token on 401 so localStorage doesn't lie to the app
            clearToken();

            // Never hard-redirect for the auth probe itself
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

// 🔥 Register Firebase Messaging Service Worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("Service Worker registered with scope:", registration.scope);
    })
    .catch((err) => {
      console.error("Service Worker registration failed:", err);
    });
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

createRoot(rootElement).render(
    <StrictMode>
        <RouterProvider router={route} />
    </StrictMode>
);
