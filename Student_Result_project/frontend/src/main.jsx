import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Auth from "./Auth.jsx";
import Student from "./Student.jsx";

const route = createBrowserRouter([
    { path: `/`, element: <App /> },
    { path: "/auth/", element: <Auth /> },
    { path: "/auth/:who", element: <Auth /> },
    {path:"/auth/:who/:id", element:<Student/>}
]);

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <RouterProvider router={route} />
    </StrictMode>
);
