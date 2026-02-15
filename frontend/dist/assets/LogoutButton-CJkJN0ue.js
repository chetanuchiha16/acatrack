import{j as n}from"./vendor-react-D3V3UIE-.js";import{u as r}from"./vendor-router-OdLvNdRw.js";const i=({size:s})=>{const e=r(),t=async()=>{try{sessionStorage.removeItem("jwt_token"),e("/auth",{replace:!0})}catch(o){console.error("Logout failed",o)}};return n.jsx("div",{onClick:t,className:`
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
            `,children:"Logout"})};export{i as L};
