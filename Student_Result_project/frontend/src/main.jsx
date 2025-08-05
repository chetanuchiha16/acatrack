import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "./Auth.jsx";
import Student from "./Student.jsx";
import Result from "./Result.jsx";

const route = createBrowserRouter([
    { path: "/auth/Student/:id/result", element: <Result /> },
    { path: "/auth/:who/:id", element: <Student /> },
    { path: "/auth/:who", element: <Auth /> },
    { path: "/auth/", element: <Auth /> },
    { path: `/`, element: <App /> },
]);

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <RouterProvider router={route} />
    </StrictMode>
);
