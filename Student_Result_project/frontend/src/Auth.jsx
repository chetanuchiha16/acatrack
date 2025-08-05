import { useState, useEffect } from "react";
import jssLogo from "./assets/jssLogo.png";
import axios from "axios";
import { Link, useParams, useNavigate } from "react-router-dom";

export default function Auth() {
    let { who, id } = useParams();
    let navigate = useNavigate();
    console.log(who);
    let [username, setUsername] = useState("");
    let [password, setPassword] = useState("");

    useEffect(() => {
        document.body.style.backgroundImage = "url('../public/jss-1.jpeg')";

        return () => {
            document.body.style.backgroundImage = "none";
        };
    }, []);

    function handleSubmit(e) {
        e.preventDefault();
        axios
            .post(
                "http://localhost:5000/auth",
                { who, username, password },
                { withCredentials: true }
            )
            .then((res) => {
                let data = res.data;
                let status_code = res.status;
                return { data, status_code };
            })
            .then(({ data, status_code }) => {
                if (data.message) {
                    alert(`${data.message} ${status_code}`);
                    console.log(who);
                    navigate(`/auth/${who}/${data.id}`, {
                        state: {
                            who: who,
                            id: data.id,
                            name: data.name,
                        },
                    });
                } else {
                    alert(`${data.error} ${status_code}`);
                }
            });
    }

    return (
        <div className="w-full h-full overflow-hidden flex flex-col justify-center items-center bg-black">
            <div className="drop-shadow-2xl absolute left-10 top-10">
                <img
                    src={jssLogo}
                    alt="jssLogo"
                    className="drop-shadow-2xl w-80"
                />
            </div>
            <h1 className="text-[#1a1a1a] absolute top-14 font-bold">
                JSS Academy of Technical Education,
            </h1>
            <h1 className="text-[#1a1a1a] absolute top-30 font-bold">
                Bengaluru
            </h1>
            <div className="absolute bottom-15">
                <div className="flex w-2xl rounded-t-2xl justify-center">
                    <button
                        onClick={() => navigate("/auth/Student")}
                        className="w-1/3 rounded-tl-2xl"
                    >
                        Student
                    </button>
                    <button
                        onClick={() => navigate("/auth/Staff")}
                        className="w-1/3"
                    >
                        Staff
                    </button>
                    <button
                        onClick={() => navigate("/auth/Parent")}
                        className="w-1/3 rounded-tr-2xl"
                    >
                        Parent
                    </button>
                </div>
                <div className="border-white border-solid border-2 pl-10 w-2xl h-[50vh] flex-col flex gap-4 items-start p-8 rounded-b-2xl justify-start  bg-[#ffffff42]">
                    <h1 className="text-[#1a1a1a]">{who} Login</h1>
                    <form className=" m-7" onSubmit={handleSubmit}>
                        <div className="item-center flex p-2">
                            <label
                                htmlFor="username"
                                className="w-24 text-[#1a1a1a] font-bold"
                            >
                                Username:{" "}
                            </label>
                            <input
                                type="text"
                                id="username"
                                className="p-2 bg-white rounded text-black flex-1"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            ></input>
                        </div>

                        <div className="items-center flex p-2">
                            <label
                                htmlFor="password"
                                className="w-24 text-[#1a1a1a] font-bold"
                            >
                                Password:{" "}
                            </label>
                            <input
                                type="password"
                                id="password"
                                className="p-2 bg-white rounded text-black flex-1"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            ></input>
                        </div>

                        <button className="ml-0 rounded-xl text-white">
                            Login
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
