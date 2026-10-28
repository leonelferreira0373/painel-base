// Rota /termos/: termos de utilização.
import type { Metadata } from "next";
import { PaginaTermos } from "@/components/auth/Documentos";

export const metadata: Metadata = { title: "Termos de utilização", robots: { index: false } };

export default function Pagina() {
  return <PaginaTermos />;
}
