// Rota /recuperar-palavra-passe/: pedir a ligação para repor a palavra-passe.
import type { Metadata } from "next";
import { PaginaRecuperarSenha } from "@/components/auth/Paginas";

export const metadata: Metadata = { title: "Recuperar palavra-passe", robots: { index: false } };

export default function Pagina() {
  return <PaginaRecuperarSenha />;
}
