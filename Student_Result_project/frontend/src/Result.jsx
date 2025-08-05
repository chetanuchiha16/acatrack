
import { use, useEffect, useState } from "react";

export default function Result() {
    useEffect(() => {
        console.log("aldkjkladf")
        console.log(window.location.pathname)

    }, [])

    return (
        <div className="bg-amber-600 w-screen h-screen overflow-hidden flex flex-col justify-center items-center">
            <h1>Result</h1>
        </div>
    )
}