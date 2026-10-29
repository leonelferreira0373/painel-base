// Apaga de vez, sozinha, o que passou do prazo da reciclagem: ao abrir o painel e de minuto a minuto. Não desenha nada.
"use client";

import { useEffect } from "react";
import { purgarExpirados } from "@/lib/reciclagem";

export function PurgaDaReciclagem() {
  useEffect(() => {
    void purgarExpirados();
    const t = window.setInterval(() => void purgarExpirados(), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return null;
}
