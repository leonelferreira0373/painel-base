import type { NextConfig } from "next";

// O painel é 100 % estático: sem servidor de aplicação nem base de dados. Tudo o que o analista carrega é processado no navegador.
const config: NextConfig = {
  output: "export",
  // Permite construir noutra pasta sem estragar o servidor de desenvolvimento (NEXT_DIST_DIR=.next-build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default config;
