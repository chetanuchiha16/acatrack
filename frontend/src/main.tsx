import React, { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "./Auth";
import StudentLayout from "./StudentLayout";
import StudentOverview from "./StudentOverview";
import StudentResultWrapper from "./StudentResultWrapper";
import Classroom from "./Classroom";
import { MenteeEmailsWrapper, MenteeRecordWrapper } from "./StudentRouteWrappers";
import ErrorPage from "./Error";
import Staff from "./Staff";
import StaffResults from "./StaffResults";
import ExcelViewer from "./ExcelViewer";
import TeacherNotesUploader from "./TeacherNotesUploader";
import SemesterResults from "./SemesterResults";
import SendEmails from "./SendEmails";
import AdminLogin from "./AdminLogin";
import HiddenShortcut from "./HiddenShortcut"; 
import AdminPanel from "./AdminPanel";
import MentorResults from "./MentorResults";
import MentorDashboard from "./MentorDashboard";
import API_BASE from "./config";
import ParentDashboard from "./ParentDashboard";
import ParentResult from "./ParentResult";
import ResetPassword from "./ResetPassword";
import { client } from "./client/client.gen";
import { getToken, clearToken } from "./utils/storage";

// 🚀 Bridge SDK with configured Axios instance
client.setConfig({
  baseURL: API_BASE,
});

// ─── Request interceptor: attach JWT ─────────────────────────────────────────
client.instance.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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

const withHiddenShortcut = (children: ReactNode) => (
  <>
    <HiddenShortcut />
    {children}
  </>
);

const route = createBrowserRouter([
  { path: "/auth/Parent/:id/ParentResult", element: withHiddenShortcut(<ParentResult />) },
  { path: "/auth/Parent/:id", element: withHiddenShortcut(<ParentDashboard />) },
  { path: "/auth/Staff/:id/MentorDashboard", element: withHiddenShortcut(<MentorDashboard />) },
  { path: "/auth/Staff/:id/MentorResults", element: withHiddenShortcut(<MentorResults batchYear="" />) },
  { path: "/auth/Staff/:id/SendEmails", element: withHiddenShortcut(<SendEmails />) },
  { path: "/auth/Staff/:id/UploadResults", element: withHiddenShortcut(<ExcelViewer excel_route={`${API_BASE}/excel/template.xlsx`} />) },
  { path: "/auth/Staff/:id/StaffClassroom", element: withHiddenShortcut(<TeacherNotesUploader />) },
  { path: "/auth/Staff/:id/StaffResults", element: withHiddenShortcut(<StaffResults />) },
  { path: "/auth/Staff/:id", element: withHiddenShortcut(<Staff />) },
  { 
    path: "/auth/Student/:id", 
    element: withHiddenShortcut(<StudentLayout />),
    children: [
      { index: true, element: <StudentOverview /> },
      { path: "results", element: <StudentResultWrapper /> },
      { path: "classroom", element: <Classroom /> },
      { path: "mentee", element: <MenteeEmailsWrapper /> },
      { path: "record", element: <MenteeRecordWrapper /> },
    ]
  },
  { path: "/auth/:who", element: withHiddenShortcut(<Auth />) },
  { path: "/reset-password/:token", element: withHiddenShortcut(<ResetPassword />) },
  { path: "/auth/", element: withHiddenShortcut(<Auth />) },
  { path: "/auth", element: withHiddenShortcut(<Auth />) },
  { path: "/admin/panel", element: withHiddenShortcut(<AdminPanel />) },
  { path: "/admin", element: withHiddenShortcut(<AdminLogin />) },
  { path: "/", element: withHiddenShortcut(<App />) },
  { path: "*", element: withHiddenShortcut(<ErrorPage />) },
]);

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
