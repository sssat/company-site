// frontend/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,

    // trycloudflare 랜덤 서브도메인 허용
    allowedHosts: [".trycloudflare.com"],

    // HMR은 터널 도메인으로 붙도록 (도메인만 프로토콜/공백 X)
    hmr: {
      host: "antonio-steam-borders-nirvana.trycloudflare.com",
      protocol: "wss",
      clientPort: 443,
    },

    // 프록시로 백엔드(로컬 8080, Spring)로 연결 → 외부에선 한 개 도메인만 보임
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: "localhost",
    port: 5173,
  },
});
