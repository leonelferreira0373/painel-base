// Rota /repor-palavra-passe/: escolher a nova palavra-passe.
import type { Metadata } from "next";
import { PaginaReporSenha } from "@/components/auth/Paginas";

export const metadata: Metadata = { title: "Repor palavra-passe", robots: { index: false } };

export default function Pagina() {
  return <PaginaReporSenha />;
}
