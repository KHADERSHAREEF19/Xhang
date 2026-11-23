import { defineConfig } from "vite";
export const CSP =
  "default-src 'self'; script-src 'self'; worker-src 'self' blob:; media-src 'self' blob:; img-src 'self' data: blob:; style-src 'self'; connect-src 'self'";
export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "production-csp",
      apply: "build",
      transformIndexHtml() {
        return [
          {
            tag: "meta",
            attrs: { "http-equiv": "Content-Security-Policy", content: CSP },
            injectTo: "head-prepend",
          },
        ];
      },
    },
  ],
  server: { host: "0.0.0.0", port: 5173, strictPort: true, allowedHosts: true },
  worker: { format: "es" },
});
