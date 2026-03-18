import React from "react";
import { useNavigate } from "react-router-dom";

interface LogoutButtonProps {
    size?: string;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ size }) => {
    const navigate = useNavigate();

    const handleLogout = async (): Promise<void> => {
        try {
            sessionStorage.removeItem("jwt_token"); // kill JWT locally
            navigate("/auth", { replace: true });
        } catch (err: unknown) {
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
};

export default LogoutButton;
