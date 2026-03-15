import React from "react";
import "./App.css";
import Auth from "./Auth";
import HiddenShortcut from "./HiddenShortcut";
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
