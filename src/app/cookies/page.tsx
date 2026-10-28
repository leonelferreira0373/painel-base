// Rota /cookies/: política de cookies.
import type { Metadata } from "next";
import { PaginaCookies } from "@/components/auth/Documentos";

export const metadata: Metadata = { title: "Política de cookies", robots: { index: false } };

export default function Pagina() {
  return <PaginaCookies />;
}
