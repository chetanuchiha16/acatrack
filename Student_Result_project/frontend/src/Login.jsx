import { useState, useEffect } from "react";
import jssLogo from "./assets/jssLogo.png"

export default function Login() {
    let [who, setWho] = useState("Student");
    return (
        <div className="w-full h-full overflow-hidden flex flex-col justify-center items-center">
            {/* <div className="drop-shadow-2xl"> */}

            {/* <img src={jssLogo} alt="jssLogo"  className="w-2xl drop-shadow-2xl"/> */}
            {/* </div> */}
            {/* <h1 className="text-[#1a1a1a]">JSS Academy of Technical Education, Bengaluru</h1> */}
            <div className="flex w-2xl rounded-t-2xl justify-center">
                <button
                    onClick={() => setWho("Student")}
                    className="w-1/3 rounded-tl-2xl"
                >
                    Student
                </button>
                <button onClick={() => setWho("Teacher")} className="w-1/3">
                    Teacher
                </button>
                <button
                    onClick={() => setWho("Parent")}
                    className="w-1/3 rounded-tr-2xl"
                >
                    Parent
                </button>
            </div>
            <div className="border-white border-solid border-2 pl-10 w-2xl h-[50vh] flex-col flex gap-4 items-start p-8 rounded-b-2xl justify-start backdrop-blur-sm bg-[#ffffff1f]">
                <h1 className="text-[#1a1a1a]">{who}</h1>
                <div className=" m-7">
                    <div className="item-center flex p-2">
                        <label
                            htmlFor="username"
                            className="w-24 text-[#1a1a1a]"
                        >
                            Username:{" "}
                        </label>
                        <input
                            type="text"
                            id="username"
                            className="p-2 bg-white rounded text-black flex-1"
                        ></input>
                    </div>

                    <div className="items-center flex p-2">
                        <label
                            htmlFor="password"
                            className="w-24 text-[#1a1a1a]"
                        >
                            Password:{" "}
                        </label>
                        <input
                            type="password"
                            id="password"
                            className="p-2 bg-white rounded text-black flex-1"
                        ></input>
                    </div>

                    <button className="ml-0 rounded-xl">Submit</button>
                </div>
            </div>
        </div>
    );
}
