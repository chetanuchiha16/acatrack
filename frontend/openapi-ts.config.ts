import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "http://localhost:5000/openapi.json",
  output: "src/client",
  plugins: [
    "@hey-api/typescript",
    {
      name: "@hey-api/sdk",
      // If you are using the latest version, the client is often 
      // inferred or set here if using specific templates.
    },
    // Explicitly define the axios client if using the new plugin system
    {
      name: "@hey-api/client-axios",
    },
  ],
});