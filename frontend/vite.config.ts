import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules")) {
                        if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
                        if (id.includes("react-router")) return "vendor-router";
                        if (id.includes("firebase") || id.includes("@firebase")) return "vendor-firebase";
                        if (id.includes("@mlc-ai/web-llm")) return "vendor-webllm";
                        if (id.includes("exceljs")) return "vendor-exceljs";
                        if (id.includes("lucide-react") || id.includes("react-icons")) return "vendor-icons";
                    }
                },
            },
        },
    },
});
