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
        
            <div
                onClick={handleLogout}
                className="
        button
        !bg-red-500 hover:!bg-red-600 active:!bg-red-700 
        !text-white
        shadow-md 
        hover:scale-105 hover:shadow-lg 
        active:scale-95
        rounded-sm md:rounded-md
        p-2 
        transition-all duration-200 ease-in-out
        text-sm sm:text-md md:text-lg font-medium
    "
            >
                Logout
            </div>

       
    );
}
