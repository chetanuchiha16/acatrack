import React from "react";
import "./styles/App.css";
import Auth from "./pages/auth/Auth";
import HiddenShortcut from "./components/HiddenShortcut";
import "./i18n";

const App: React.FC = () => {
    return (
        <>
            <Auth />
            <HiddenShortcut/>
        </>
    );
};

export default App;
