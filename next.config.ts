import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "pdf-parse"],
  outputFileTracingIncludes: {
    "/api/manuais/[id]": ["./src/data/manuals/*.pdf"],
    "/api/cartoes-aniversario/extract": [
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
    "/api/crachas/extract": [
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  async headers() {
    const privateHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Pragma", value: "no-cache" },
    ];
    return [
      { source: "/api/:path*", headers: privateHeaders },
      { source: "/dashboard/:path*", headers: privateHeaders },
      { source: "/primeiro-acesso", headers: privateHeaders },
      { source: "/redefinir-senha", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
