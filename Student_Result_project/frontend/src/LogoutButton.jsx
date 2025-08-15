import axios from "axios";
import { useNavigate } from "react-router-dom";
import API_BASE from "./config";

export default function LogoutButton() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await axios.post(
                `${API_BASE}/logout`,
                {},
                { withCredentials: true }
            );
            navigate("/auth", { replace: true });
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50">
            <div
                onClick={handleLogout}
                className="cursor-pointer px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-700 text-black dark:text-white shadow hover:scale-105 hover:shadow-lg transition-all duration-300 text-center text-sm sm:text-base"
            >
                Logout
            </div>
        </div>
    );
}
