import { useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
export default function Student() {
    let {who,id, name} = useLocation().state || {}
    let navigate = useNavigate()
    
    useEffect(() => {
        // document.body.style.backgroundColor = "white"
        // console.log(who,id, name)

    }, [])
    return(
        <div className="flex justify-center items-center m-auto  text-white gap-x-4">
            <h1 className="absolute top-2 m-auto text-white">Welcome {name}</h1>

            <button className="rounded" onClick={() => navigate(`/auth/${who}/${id}/result`)}>Result</button>
            <button className="rounded">Classroom</button>
        </div>
    )
}