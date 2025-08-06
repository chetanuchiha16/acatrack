import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Result from "./Result";
import Classroom from "./Classroom";
export default function Student() {
    let { who, id, name } = useLocation().state || {};
    // let navigate = useNavigate()
    let [selectedTab, setSelectedTab] = useState("result");

    let sems = ["SEM1", "SEM2", "SEM3", "SEM4", "SEM5", "SEM6"];
    let [currentSem, setCurrentSem] = useState("");

    useEffect(() => {}, []);
    return (
        <div className="flex justify-center items-center m-auto">
            <h1 className="absolute top-2 m-auto ">Welcome {name}</h1>

            {/* <button className="rounded" onClick={() => navigate(`/auth/${who}/${id}/result`)}>Result</button> */}
            <div className="relative">
                <div className="flex items-center justify-center min-h-[46px]">
                    <div className=" border-4 border-b-0 border-black w-fit absolute left-0">
                        <button
                            className="border border-black"
                            onClick={() => setSelectedTab((prev) => "result")}
                        >
                            Result
                        </button>
                        <button
                            className=""
                            onClick={() =>
                                setSelectedTab((prev) => "classroom")
                            }
                        >
                            Classroom
                        </button>
                    </div>
                    <div className="max-w-fit min-h-[46px] justify-self-center border-4 border-b-0 border-black">
                        <select
                            className="h-[46px]"
                            id="current"
                            value={currentSem}
                            onChange={(e) => setCurrentSem(e.target.value)}
                        >
                            {sems.map((sem, i) => (
                                <option
                                    className="dark:bg-[#1a1a1a]"
                                    key={i}
                                    value={sem}
                                    id={i}
                                >
                                    {sem}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {selectedTab === "result" && <Result />}
                {selectedTab === "classroom" && <Classroom />}
            </div>

            {/* <button className="rounded">Classroom</button> */}
        </div>
    );
}
