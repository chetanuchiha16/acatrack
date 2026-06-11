import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HiddenShortcut() {
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e) => {
            console.log("Key pressed:", e.key, e.shiftKey, e.altKey);
            if (e.shiftKey && e.altKey && e.key.toLowerCase() === "a") {
                navigate("/admin");
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [navigate]);

    return null; // nothing visible
}
