import { useState } from "react";
import "./App.css";
import Auth from "./Auth";
import AdminLogin from "./AdminLogin";
import HiddenShortcut from "./HiddenShortcut";
import "./i18n";

function App() {
    const [count, setCount] = useState(0);

    return (
        <>
            <Auth />
            <HiddenShortcut/>
        </>
    );
}

export default App;
