import React, { StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "./Auth";
import ErrorPage from "./Error";
import HiddenShortcut from "./HiddenShortcut";
import LoadingSpinner from "./LoadingSpinner";
import API_BASE from "./config";
import { client } from "./client/client.gen";
import { getToken, clearToken } from "./utils/storage";

// ─── Lazy-loaded page components (code-split per route) ──────────────────────
const StudentLayout = React.lazy(() => import("./StudentLayout"));
const StudentOverview = React.lazy(() => import("./StudentOverview"));
const StudentResultWrapper = React.lazy(() => import("./StudentResultWrapper"));
const Classroom = React.lazy(() => import("./Classroom"));
const StaffLayout = React.lazy(() => import("./StaffLayout"));
const StaffOverview = React.lazy(() => import("./StaffOverview"));
const StaffResults = React.lazy(() => import("./StaffResults"));
const ExcelViewer = React.lazy(() => import("./ExcelViewer"));
const TeacherNotesUploader = React.lazy(() => import("./TeacherNotesUploader"));
const SemesterResults = React.lazy(() => import("./SemesterResults"));
const SendEmails = React.lazy(() => import("./SendEmails"));
const AdminLogin = React.lazy(() => import("./AdminLogin"));
const AdminPanel = React.lazy(() => import("./AdminPanel"));
const MentorResults = React.lazy(() => import("./MentorResults"));
const MentorDashboard = React.lazy(() => import("./MentorDashboard"));
const ParentDashboard = React.lazy(() => import("./ParentDashboard"));
const ParentResult = React.lazy(() => import("./ParentResult"));
const ResetPassword = React.lazy(() => import("./ResetPassword"));


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
    <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={true} />}>
      {children}
    </Suspense>
  </>
);

// Lazy-load the route wrappers too
const MenteeEmailsWrapper = React.lazy(() => import("./StudentRouteWrappers").then(m => ({ default: m.MenteeEmailsWrapper })));
const MenteeRecordWrapper = React.lazy(() => import("./StudentRouteWrappers").then(m => ({ default: m.MenteeRecordWrapper })));

const route = createBrowserRouter([
  { path: "/auth/Parent/:id/ParentResult", element: withHiddenShortcut(<ParentResult />) },
  { path: "/auth/Parent/:id", element: withHiddenShortcut(<ParentDashboard />) },
  {
    path: "/auth/Staff/:id",
    element: withHiddenShortcut(<StaffLayout />),
    children: [
      { index: true, element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><StaffOverview /></Suspense> },
      { path: "results", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><StaffResults /></Suspense> },
      { path: "emails", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><SendEmails /></Suspense> },
      { path: "upload", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><ExcelViewer excel_route={`${API_BASE}/excel/template.xlsx`} /></Suspense> },
      { path: "classroom", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><TeacherNotesUploader /></Suspense> },
      { path: "mentees", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><MentorDashboard /></Suspense> },
      { path: "mentees/results", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><MentorResults batchYear="" /></Suspense> },
    ]
  },
  { 
    path: "/auth/Student/:id", 
    element: withHiddenShortcut(<StudentLayout />),
    children: [
      { index: true, element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><StudentOverview /></Suspense> },
      { path: "results", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><StudentResultWrapper /></Suspense> },
      { path: "classroom", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><Classroom /></Suspense> },
      { path: "mentee", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><MenteeEmailsWrapper /></Suspense> },
      { path: "record", element: <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={false} />}><MenteeRecordWrapper /></Suspense> },
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
