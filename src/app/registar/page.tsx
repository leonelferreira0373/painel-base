// Rota /registar/: criar conta.
import type { Metadata } from "next";
import { PaginaRegistar } from "@/components/auth/Paginas";

export const metadata: Metadata = { title: "Registar-se", robots: { index: false } };

export default function Pagina() {
  return <PaginaRegistar />;
}
