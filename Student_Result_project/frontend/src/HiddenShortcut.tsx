import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const HiddenShortcut: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.shiftKey && e.altKey && e.key.toLowerCase() === "a") {
                navigate("/admin");
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [navigate]);

    return null; // nothing visible
};

export default HiddenShortcut;
