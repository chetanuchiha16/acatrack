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

import Classroom from "./Classroom.jsx";
const route = createBrowserRouter([
    // { path: "/auth/Student/:id/result", element: <Result /> },
    { path: "/auth/Staff/:id/SendEmails", element: <SendEmails /> },
    { path: "/auth/Staff/:id/UploadResults", element: <ExcelViewer excel_path={`template.xlsx`}/> },
    { path: "/auth/Staff/:id/StaffClassroom", element: <TeacherNotesUploader /> },
    { path: "/auth/Staff/:id/StaffResults", element: <StaffResults /> },
    { path: "/auth/Parent/:id", element: <ChatBot/> },
    { path: "/auth/Staff/:id", element: <Staff /> },
    { path: "/auth/Student/:id", element: <Student /> },
    { path: "/auth/:who", element: <Auth /> },
    { path: "/auth/", element: <Auth /> },
    { path: "/auth", element: <Auth /> },
    // { path: "/logout", element: <Auth /> },
    { path: `/`, element: < App/> },
    { path: `*`, element: <Error /> },
]);

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <RouterProvider router={route} />
    </StrictMode>
);
