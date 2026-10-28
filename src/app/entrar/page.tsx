// Rota /entrar/: iniciar sessão.
import type { Metadata } from "next";
import { PaginaEntrar } from "@/components/auth/Paginas";

export const metadata: Metadata = { title: "Iniciar sessão", robots: { index: false } };

export default function Pagina() {
  return <PaginaEntrar />;
}
