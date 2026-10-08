import type { NextConfig } from "next";

// Сборка в статику для GitHub Pages. Путь репозитория подставляет CI.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
