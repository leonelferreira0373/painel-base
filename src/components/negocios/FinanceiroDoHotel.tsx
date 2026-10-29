// O financeiro do hotel: receita, ocupação, diária média, RevPAR e previsão, a partir das reservas e dos quartos do próprio painel (mudar o estado de uma reserva muda os números). Cada cartão tem o gráfico dos últimos 14 dias.
"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/estado";
import { calcularFinanceiro, type ReservaDoHotel } from "@/lib/hotel";
import { Grafico } from "../graficos/Graficos";
import { LinhaOrdenada } from "../LinhaOrdenada";
import { Painel, Pagina, Titulo } from "../ui";
import { dataCurta, dinheiro, Estatistica, inteiro, percentagem } from "../super/SuperPecas";

export function FinanceiroDoHotel() {
  const { registos } = useApp();
  const reservas = useMemo(() => (registos.reservas ?? []) as unknown as ReservaDoHotel[], [registos.reservas]);
  const quartos = registos.quartos?.length ?? 0;
  const f = useMemo(() => calcularFinanceiro(reservas, quartos), [reservas, quartos]);
  const maximo = Math.max(1, ...f.porTipo.map((t) => t.valor));
  return (
    <Pagina>
      <Titulo titulo="Financeiro do hotel" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Estatistica titulo="Receita (14 dias)" valor={dinheiro(f.totais.receita)} dica="O que valem as noites que já foram dormidas, de quem fez check-in ou já saiu." serie={f.receita} />
        <Estatistica titulo="Ocupação média" valor={percentagem(f.totais.ocupacaoMedia / 100, 1)} dica="Os quartos ocupados a dividir pelos quartos que o hotel tem, noite a noite." serie={f.ocupacao} />
        <Estatistica titulo="Diária média" valor={dinheiro(f.totais.diariaMedia)} dica="A receita a dividir pelas noites vendidas (em inglês, ADR)." serie={f.diaria} />
        <Estatistica titulo="Receita por quarto" valor={dinheiro(f.totais.revpar)} dica="A receita a dividir por todos os quartos, ocupados ou não (em inglês, RevPAR)." serie={f.revpar} />
        <Estatistica titulo="Noites vendidas" valor={inteiro(f.totais.noites)} serie={f.ocupados} />
        <Estatistica titulo="Previsão (14 dias)" valor={dinheiro(f.totais.previsao)} dica="O que valem as noites das reservas confirmadas e pendentes nos próximos 14 dias." serie={f.previsao} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Painel titulo="Receita por noite" className="lg:col-span-2">
          <Grafico spec={{ tipo: "linha", pontos: f.dias.map((d, i) => ({ chave: d, rotulo: dataCurta(d), valor: Math.round(f.receita[i]), n: 1 })) }} altura={220} />
        </Painel>
        <Painel titulo="Receita por tipo de quarto">
          <div className="flex flex-col">
            {f.porTipo.map((t) => (
              <LinhaOrdenada key={t.tipo} nome={t.tipo} valor={dinheiro(t.valor)} proporcao={(t.valor / maximo) * 100} />
            ))}
          </div>
        </Painel>
        <Painel titulo="Ocupação por noite" className="lg:col-span-3">
          <Grafico spec={{ tipo: "linha", pontos: f.dias.map((d, i) => ({ chave: d, rotulo: dataCurta(d), valor: Math.round(f.ocupacao[i]), n: 1 })) }} altura={200} />
        </Painel>
      </div>
    </Pagina>
  );
}
