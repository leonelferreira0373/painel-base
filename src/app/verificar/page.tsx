// Rota /verificar/: segundo passo da entrada (código de verificação).
import type { Metadata } from "next";
import { PaginaVerificar } from "@/components/auth/Paginas";

export const metadata: Metadata = { title: "Verificação em dois passos", robots: { index: false } };

export default function Pagina() {
  return <PaginaVerificar />;
}
