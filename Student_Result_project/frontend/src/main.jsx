import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "./Auth.jsx";
import Student from "./Student.jsx";
// import Result from "./Result.jsx";
import Error from "./Error.jsx";
import Staff from "./Staff.jsx";
import StaffResults from "./StaffResults.jsx"
import ExcelViewer from "./ExcelViewer.jsx";
import TeacherNotesUploader from "./TeacherNotesUploader.jsx";
import ChatBot from "./Chatbot.jsx";
import SemesterResults from "./SemesterResults.jsx";
import SendEmails from "./SendEmails.jsx";
import AdminLogin from "./AdminLogin.jsx";
import HiddenShortcut from "./HiddenShortcut.jsx"; // wherever your file is
import AdminPanel from "./AdminPanel.jsx";
import MentorResults from "./MentorResults.jsx";
import MentorDashboard from "./MentorDashboard.jsx";
import API_BASE from "./config.js";
import ParentDashboard from "./ParentDashboard.jsx";
import ParentResult from "./ParentResult.jsx";
import ResetPassword from "./ResetPassword.jsx";
function RootLayout({ children }) {
  
  return (
    <>
      <HiddenShortcut />
      {children}
    </>
  );
}

const route = createBrowserRouter([
  { path: "/auth/Parent/:id/ParentResult", element: <RootLayout><ParentResult /></RootLayout> },
  { path: "/auth/Parent/:id/ChatBot", element: <RootLayout><ChatBot /></RootLayout> },
  { path: "/auth/Parent/:id", element: <RootLayout><ParentDashboard /></RootLayout> },
    { path: "/auth/Staff/:id/MentorDashboard", element: <RootLayout><MentorDashboard /></RootLayout> },
    { path: "/auth/Staff/:id/MentorResults", element: <RootLayout><MentorResults /></RootLayout> },
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
    { path: "*", element: <RootLayout><Error /></RootLayout> },
]);


createRoot(document.getElementById("root")).render(
    <StrictMode>
        <RouterProvider router={route} />
    </StrictMode>
);
