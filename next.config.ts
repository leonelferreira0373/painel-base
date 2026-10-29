import type { NextConfig } from "next";

// O painel é 100 % estático: sem servidor de aplicação nem base de dados. Tudo o que o analista carrega é processado no navegador.
const config: NextConfig = {
  output: "export",
  // Permite construir noutra pasta sem estragar o servidor de desenvolvimento (NEXT_DIST_DIR=.next-build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // o círculo «N» do Next no canto do ecrã (só em desenvolvimento) tapava os botões e o campo do chat nos testes no telemóvel
  devIndicators: false,
  reactStrictMode: true,
  trailingSlash: true,
  images: { unoptimized: true },
  // O assistente de IA (github.com/ferreirakorp/ai-chat) vem em TypeScript: o Next compila-o.
  transpilePackages: ["ai-chat"],
};

export default config;
