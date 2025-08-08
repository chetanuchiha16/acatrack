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
const route = createBrowserRouter([
    // { path: "/auth/Student/:id/result", element: <Result /> },
    { path: "/auth/Staff/:id/StaffResults", element: <StaffResults /> },
    { path: "/auth/Staff/:id", element: <Staff /> },
    { path: "/auth/Student/:id", element: <Student /> },
    { path: "/auth/:who", element: <Auth /> },
    { path: "/auth/", element: <Auth /> },
    { path: `/`, element: <App /> },
    { path: `*`, element: <Error /> },
]);

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <RouterProvider router={route} />
    </StrictMode>
);
