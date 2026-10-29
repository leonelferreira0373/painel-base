// Definições da conta > Exportar: cada formato em que se pode exportar tem o seu interruptor. A janela de exportar só oferece os que estão ligados aqui.
"use client";

import { Button } from "@cloudflare/kumo";
import { FORMATOS, estaLigado, type FormatoDeExportar } from "@/lib/exportar/formatos";
import { useConta } from "@/lib/conta";
import { Ic } from "../Icones";
import { Cartao, Interruptor, Linha } from "./Pecas";

export function SecaoExportar() {
  const { conta, mudar } = useConta();
  const definir = (id: FormatoDeExportar, v: boolean) => {
    const f = FORMATOS.find((x) => x.id === id);
    mudar({ exportar: { ...conta.exportar, [id]: v } }, `${v ? "Ligou" : "Desligou"} a exportação em ${f?.rotulo ?? id}`);
  };
  const todos = (v: boolean) => mudar({ exportar: Object.fromEntries(FORMATOS.map((f) => [f.id, v])) }, v ? "Ligou todos os formatos de exportação" : "Desligou todos os formatos de exportação");
  return (
    <Cartao
      titulo="Exportar como"
      acoes={
        <span className="inline-flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => todos(true)}>
            Ligar todos
          </Button>
          <Button size="sm" variant="secondary" onClick={() => todos(false)}>
            Desligar todos
          </Button>
        </span>
      }
    >
      {FORMATOS.map((f) => (
        <Linha
          key={f.id}
          titulo={
            <span className="inline-flex items-center gap-2">
              <Ic nome={f.icone} tamanho={18} />
              Exportar como {f.rotulo}
            </span>
          }
        >
          <Interruptor marcado={estaLigado(conta.exportar, f.id)} aoMudar={(v) => definir(f.id, v)} rotulo={`Exportar como ${f.rotulo}`} />
        </Linha>
      ))}
    </Cartao>
  );
}
