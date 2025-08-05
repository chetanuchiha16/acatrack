import { useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
export default function Student() {
    let {id, name} = useLocation().state || {}

    useEffect(() => {
        document.body.style.backgroundColor = "white"
        

    }, [])
    return(
        <div className="flex justify-center items-center m-auto  gap-x-4">
            <h1 className="absolute top-2 m-auto text-black">Welcome {name}</h1>

            <button className="rounded w-30 h-10">Result</button>
            <button className="rounded">Classroom</button>
        </div>
    )
}