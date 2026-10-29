// A página pública de receber ficheiros por WebRTC (sem entrar no painel): abre-se pela ligação ou pelo QR do aparelho que envia.
import type { Metadata } from "next";
import { PaginaReceber } from "@/components/partilha/PaginaReceber";

export const metadata: Metadata = { title: "Receber ficheiros", robots: { index: false } };

export default function Pagina() {
  return <PaginaReceber />;
}
