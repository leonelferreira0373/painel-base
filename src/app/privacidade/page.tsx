// Rota /privacidade/: política de privacidade.
import type { Metadata } from "next";
import { PaginaPrivacidade } from "@/components/auth/Documentos";

export const metadata: Metadata = { title: "Política de privacidade", robots: { index: false } };

export default function Pagina() {
  return <PaginaPrivacidade />;
}
