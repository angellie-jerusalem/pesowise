import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",

  // npm run dev: send api.php requests to XAMPP
  server: {
    proxy: {
      "/api.php": { target: "http://localhost", rewrite: () => "/pesowise/api.php" }
    }
  }
});
