import React, { Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import HiddenShortcut from "../components/HiddenShortcut";
import LoadingSpinner from "../components/LoadingSpinner";
import App from "../App";
import ErrorPage from "../components/Error";
import API_BASE from "../config";

const StudentLayout = React.lazy(() => import("../layouts/StudentLayout"));
const StudentOverview = React.lazy(() => import("../pages/student/StudentOverview"));
const StudentResultWrapper = React.lazy(() => import("../pages/student/StudentResultWrapper"));
const Classroom = React.lazy(() => import("../pages/student/Classroom"));

const StaffLayout = React.lazy(() => import("../layouts/StaffLayout"));
const StaffOverview = React.lazy(() => import("../pages/staff/StaffOverview"));
const StaffResults = React.lazy(() => import("../pages/staff/StaffResults"));
const ExcelViewer = React.lazy(() => import("../pages/staff/ExcelViewer"));
const TeacherNotesUploader = React.lazy(() => import("../pages/staff/TeacherNotesUploader"));
const SendEmails = React.lazy(() => import("../pages/staff/SendEmails"));
const MentorDashboard = React.lazy(() => import("../pages/staff/MentorDashboard"));
const MentorResults = React.lazy(() => import("../pages/staff/MentorResults"));

const AdminLogin = React.lazy(() => import("../pages/admin/AdminLogin"));
const AdminPanel = React.lazy(() => import("../pages/admin/AdminPanel"));

const ParentDashboard = React.lazy(() => import("../pages/parent/ParentDashboard"));
const ParentResult = React.lazy(() => import("../pages/parent/ParentResult"));

const Auth = React.lazy(() => import("../pages/auth/Auth"));
const ResetPassword = React.lazy(() => import("../pages/auth/ResetPassword"));

const MenteeEmailsWrapper = React.lazy(() => import("./StudentRouteWrappers").then(m => ({ default: m.MenteeEmailsWrapper })));
const MenteeRecordWrapper = React.lazy(() => import("./StudentRouteWrappers").then(m => ({ default: m.MenteeRecordWrapper })));

const withHiddenShortcut = (children: ReactNode) => (
  <>
    <HiddenShortcut />
    <Suspense fallback={<LoadingSpinner message="Loading..." fullScreen={true} />}>
      {children}
    </Suspense>
  </>
);

export const route = createBrowserRouter([
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
