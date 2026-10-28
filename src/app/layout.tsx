// Estrutura de todas as páginas: fonte, metadados, script do tema e fornecedores de estado.
import "@fontsource-variable/inter";
import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/Shell";
import { PROJETO } from "@/dados/projeto";
import { T } from "@/dados/textos";
import { ContaProvider } from "@/lib/conta";
import { Provider } from "@/lib/estado";
import { SCRIPT_TEMA } from "@/lib/tema-script";
import "./globals.css";

const BASE = PROJETO.urlSite;

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: T.meta.titulo,
  description: T.meta.descricao,
  openGraph: { title: T.meta.titulo, description: T.meta.descricao, url: BASE, locale: "pt_PT", type: "website" },
  twitter: { card: "summary_large_image", title: T.meta.titulo, description: T.meta.descricao },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#fcfcfc", interactiveWidget: "resizes-content" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT" data-mode="light" suppressHydrationWarning>
      <head>
        {/* Única exceção a «nada de HTML em texto»: tem de correr já, antes de pintar, para o tema não piscar (next/script só corre depois do JavaScript). */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="bg-kumo-canvas text-kumo-default">
        <Provider>
          <ContaProvider>
            <Shell>{children}</Shell>
          </ContaProvider>
        </Provider>
      </body>
    </html>
  );
}
