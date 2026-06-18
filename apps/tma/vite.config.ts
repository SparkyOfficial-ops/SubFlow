import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@subflow/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      buffer: path.resolve(__dirname, "../../node_modules/buffer/index.js"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2022",
  },
});
