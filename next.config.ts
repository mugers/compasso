import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Os testes e2e usam uma pasta de build própria (.next-e2e), para poderem
  // rodar sem atrapalhar um `npm run dev` aberto na mesma pasta.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
