// Campo de palavra-passe com o botão «Mostrar» dentro do campo, como o da Cloudflare (o do Kumo traz também «Copiar», que aqui não faz sentido).
"use client";

import { Button } from "@cloudflare/kumo";
import { useId, useState } from "react";
import { Ic } from "../Icones";

export function CampoSenha({ label, value, onValueChange, autoComplete, tamanho = "lg", error }: { label: string; value: string; onValueChange: (v: string) => void; autoComplete?: string; tamanho?: "base" | "lg"; error?: string }) {
  const id = useId();
  const [ver, setVer] = useState(false);
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="m-0 select-none text-base font-medium text-kumo-default">
        {label}
      </label>
      <div className={`relative flex w-full cursor-text items-center rounded-lg border-0 bg-kumo-control text-base text-kumo-default ring focus-within:ring-[1.5px] focus-within:ring-kumo-focus/50 ${error ? "ring-kumo-danger" : "ring-kumo-line"} ${tamanho === "lg" ? "h-10" : "h-9"}`}>
        <input id={id} type={ver ? "text" : "password"} value={value} autoComplete={autoComplete} onChange={(e) => onValueChange(e.target.value)} className={`h-full min-w-0 grow rounded-none border-0 bg-transparent text-base outline-none ${tamanho === "lg" ? "pl-4 pr-2.5" : "pl-3 pr-2.5"}`} />
        <div className="relative z-[1] flex shrink-0 items-center pr-0.5">
          <Button type="button" variant="ghost" icon={<Ic nome={ver ? "esconder" : "olho"} tamanho={20} />} aria-label={ver ? "Esconder" : "Mostrar"} aria-pressed={ver} onClick={() => setVer((v) => !v)} />
        </div>
      </div>
      {error && <span className="text-[13px] text-kumo-danger">{error}</span>}
    </div>
  );
}
