// Rota /recuperar-email/: recuperar o e-mail de uma conta.
import type { Metadata } from "next";
import { PaginaRecuperarEmail } from "@/components/auth/Paginas";

export const metadata: Metadata = { title: "Recuperar e-mail", robots: { index: false } };

export default function Pagina() {
  return <PaginaRecuperarEmail />;
}
