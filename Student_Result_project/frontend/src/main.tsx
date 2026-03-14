import React, { StrictMode, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "./Auth";
import Student from "./Student";
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

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <>
      <HiddenShortcut />
      {children}
    </>
  );
};

const route = createBrowserRouter([
  { path: "/auth/Parent/:id/ParentResult", element: <RootLayout><ParentResult /></RootLayout> },
  { path: "/auth/Parent/:id", element: <RootLayout><ParentDashboard /></RootLayout> },
  { path: "/auth/Staff/:id/MentorDashboard", element: <RootLayout><MentorDashboard /></RootLayout> },
  { path: "/auth/Staff/:id/MentorResults", element: <RootLayout><MentorResults batchYear="" /></RootLayout> },
  { path: "/auth/Staff/:id/SendEmails", element: <RootLayout><SendEmails /></RootLayout> },
  { path: "/auth/Staff/:id/UploadResults", element: <RootLayout><ExcelViewer excel_route={`${API_BASE}/excel/template.xlsx`} /></RootLayout> },
  { path: "/auth/Staff/:id/StaffClassroom", element: <RootLayout><TeacherNotesUploader /></RootLayout> },
  { path: "/auth/Staff/:id/StaffResults", element: <RootLayout><StaffResults /></RootLayout> },
  { path: "/auth/Staff/:id", element: <RootLayout><Staff /></RootLayout> },
  { path: "/auth/Student/:id", element: <RootLayout><Student /></RootLayout> },
  { path: "/auth/:who", element: <RootLayout><Auth /></RootLayout> },
  { path: "/reset-password/:token", element: <RootLayout><ResetPassword /></RootLayout> },
  { path: "/auth/", element: <RootLayout><Auth /></RootLayout> },
  { path: "/auth", element: <RootLayout><Auth /></RootLayout> },
  { path: "/admin/panel", element: <RootLayout><AdminPanel /></RootLayout> },
  { path: "/admin", element: <RootLayout><AdminLogin /></RootLayout> },
  { path: "/", element: <RootLayout><App /></RootLayout> },
  { path: "*", element: <RootLayout><ErrorPage /></RootLayout> },
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
