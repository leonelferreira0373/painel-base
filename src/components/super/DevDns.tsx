// Developer tools > DNS: os registos da zona do site (A, AAAA, CNAME, MX, TXT, NS, SRV, CAA, PTR), criar, mudar e apagar, e importar e exportar a zona em BIND como a Cloudflare. Em modo simulado vivem no navegador; em modo ligado vêm do servidor (/v1/dev/dns/registos).
"use client";

import { Button, Input, Select } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { PROJETO } from "@/dados/projeto";
import { useColecao } from "@/lib/api/colecao";
import { abrirDados, useAlvoDeImportacao, useFonteDeExportacao } from "@/lib/dados-da-pagina";
import { erroDoRegistoDns, textoDoTtl, TIPOS_DNS, type RegistoDns, type TipoDns, type ZonaLida } from "@/lib/dns-bind";
import { registar } from "@/lib/atividade";
import { useApp } from "@/lib/estado";
import { useEditar } from "@/lib/permissao";
import { Cartao, Confirmar } from "../conta/Pecas";
import { Vazio } from "../conteudo/ConteudoPecas";
import { Estado } from "../Estado";
import { ICONES } from "../Icones";
import { Pagina, Titulo } from "../ui";
import { Estatistica, inteiro, TabelaSimples, useGuardado, type ColunaSimples } from "./SuperPecas";

/** A zona do site: o endereço sem o «painel.» ou o «www.» da frente. */
const zonaDe = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^(www|painel)\./, "");
  } catch {
    return "exemplo.com";
  }
};

const SEMENTE = (zona: string): RegistoDns[] => [
  { id: "dns-1", tipo: "A", nome: "@", valor: "203.0.113.10", ttl: 1 },
  { id: "dns-2", tipo: "CNAME", nome: "www", valor: zona, ttl: 1 },
  { id: "dns-3", tipo: "CNAME", nome: "painel", valor: zona, ttl: 1 },
  { id: "dns-4", tipo: "MX", nome: "@", valor: `mail.${zona}`, ttl: 3600, prioridade: 10 },
  { id: "dns-5", tipo: "A", nome: "mail", valor: "203.0.113.20", ttl: 3600 },
  { id: "dns-6", tipo: "TXT", nome: "@", valor: "v=spf1 mx -all", ttl: 3600, comentario: "SPF" },
  { id: "dns-7", tipo: "TXT", nome: "_dmarc", valor: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${zona}`, ttl: 3600, comentario: "DMARC" },
  { id: "dns-8", tipo: "CAA", nome: "@", valor: '0 issue "letsencrypt.org"', ttl: 3600 },
];

const TTLS: Record<string, string> = { "1": "Auto", "60": "1 min", "120": "2 min", "300": "5 min", "600": "10 min", "900": "15 min", "1800": "30 min", "3600": "1 hora", "7200": "2 horas", "18000": "5 horas", "43200": "12 horas", "86400": "1 dia" };
const novoRegisto = (): RegistoDns => ({ id: `dns-${Date.now().toString(36)}`, tipo: "A", nome: "@", valor: "", ttl: 1 });
const igual = (a: RegistoDns, b: RegistoDns) => a.tipo === b.tipo && a.nome === b.nome && a.valor === b.valor;

export function RegistosDns() {
  const editar = useEditar();
  const { avisar } = useApp();
  const [zona, setZona] = useGuardado<string>("dns-zona", zonaDe(PROJETO.urlSite));
  const inicial = useMemo(() => SEMENTE(zonaDe(PROJETO.urlSite)), []);
  const lista = useColecao<RegistoDns>("/v1/dev/dns/registos", "dns-registos", inicial);
  const [rascunho, setRascunho] = useState<RegistoDns | null>(null);
  const [novo, setNovo] = useState(false);
  const [apagar, setApagar] = useState<RegistoDns | null>(null);
  const [filtro, setFiltro] = useState("todos");

  const ordenados = useMemo(() => [...lista.itens].sort((a, b) => TIPOS_DNS.indexOf(a.tipo) - TIPOS_DNS.indexOf(b.tipo) || a.nome.localeCompare(b.nome)), [lista.itens]);
  const visiveis = filtro === "todos" ? ordenados : ordenados.filter((r) => r.tipo === filtro);
  const fonte = useMemo(
    () => ({
      nome: zona,
      titulo: `Zona DNS de ${zona}`,
      dados: { nome: zona, titulo: `Zona DNS de ${zona}`, colunas: ["Tipo", "Nome", "Conteúdo", "Prioridade", "TTL", "Comentário"], linhas: ordenados.map((r) => [r.tipo, r.nome, r.valor, r.prioridade ?? "", textoDoTtl(r.ttl), r.comentario ?? ""] as (string | number)[]) },
      bind: { zona, registos: ordenados },
    }),
    [zona, ordenados],
  );
  useFonteDeExportacao(fonte);

  const aoZona = async (z: ZonaLida) => {
    if (z.zona && !zona) setZona(z.zona);
    let acrescentados = 0;
    for (const r of z.registos) {
      if (lista.itens.some((x) => igual(x, r))) continue;
      await lista.guardar({ ...r, id: `${r.id}-${acrescentados}` });
      acrescentados++;
    }
    registar("dados", `Importou ${acrescentados} ${acrescentados === 1 ? "registo DNS" : "registos DNS"} de uma zona BIND`);
    if (z.erros.length) avisar(`${z.erros.length} ${z.erros.length === 1 ? "linha ficou" : "linhas ficaram"} de fora: ${z.erros[0]}`);
  };
  useAlvoDeImportacao(editar ? { titulo: `Registos DNS de ${zona}`, aoZona } : null);

  const erro = rascunho ? erroDoRegistoDns(rascunho) : null;
  const guardar = () => {
    if (!rascunho || erro) return;
    const r = { ...rascunho, nome: rascunho.nome.trim() || "@", valor: rascunho.valor.trim(), comentario: rascunho.comentario?.trim() || undefined, prioridade: rascunho.tipo === "MX" || rascunho.tipo === "SRV" ? rascunho.prioridade : undefined };
    void lista.guardar(r);
    registar("dados", `${novo ? "Criou" : "Mudou"} o registo DNS «${r.tipo} ${r.nome}»`);
    setRascunho(null);
  };

  const colunas: ColunaSimples<RegistoDns>[] = [
    { rotulo: "Tipo", filtro: (r) => String(r.tipo), render: (r) => <Estado valor={r.tipo} variante="neutral" /> },
    { rotulo: "Nome", render: (r) => <code className="text-xs">{r.nome}</code> },
    { rotulo: "Conteúdo", render: (r) => <span className="block max-w-96 truncate" title={r.valor}>{r.valor}</span> },
    { rotulo: "Prioridade", direita: true, render: (r) => r.prioridade ?? "—" },
    { rotulo: "TTL", direita: true, render: (r) => textoDoTtl(r.ttl) },
    { rotulo: "Comentário", render: (r) => r.comentario ?? "—" },
  ];
  const contagem = (t: TipoDns) => lista.itens.filter((r) => r.tipo === t).length;

  return (
    <Pagina>
      <Titulo titulo="Registos DNS">
        <Button variant="secondary" icon={ICONES.transferir} onClick={() => abrirDados("exportar")} disabled={lista.itens.length === 0}>
          Exportar
        </Button>
        {editar && (
          <Button variant="secondary" icon={ICONES.subida} onClick={() => abrirDados("importar")}>
            Importar
          </Button>
        )}
        {editar && (
          <Button
            variant="primary"
            icon={ICONES.mais}
            onClick={() => {
              setNovo(true);
              setRascunho(novoRegisto());
            }}
          >
            Adicionar registo
          </Button>
        )}
      </Titulo>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Estatistica titulo="Registos" valor={inteiro(lista.itens.length)} numero={lista.itens.length} />
        <Estatistica titulo="Endereços (A e AAAA)" valor={inteiro(contagem("A") + contagem("AAAA"))} numero={contagem("A") + contagem("AAAA")} />
        <Estatistica titulo="Correio (MX e TXT)" valor={inteiro(contagem("MX") + contagem("TXT"))} numero={contagem("MX") + contagem("TXT")} />
        <Estatistica titulo="Nomes (CNAME)" valor={inteiro(contagem("CNAME"))} numero={contagem("CNAME")} />
      </div>
      <Cartao
        titulo={`Zona ${zona}`}
        acoes={
          <div className="w-36">
            <Select aria-label="Filtrar por tipo" value={filtro} onValueChange={(v) => setFiltro(String(v))} items={{ todos: "Todos os tipos", ...Object.fromEntries(TIPOS_DNS.map((t) => [t, t])) }} />
          </div>
        }
      >
        {lista.erro ? <Vazio icone="aviso" titulo="Não foi possível ler o servidor" texto={lista.erro} /> : lista.itens.length === 0 ? <Vazio icone="globo" titulo="A zona não tem registos" texto="Adicione um registo ou importe um ficheiro BIND." /> : <TabelaSimples colunas={colunas} linhas={visiveis} chave={(r) => r.id} vazio="Nenhum registo deste tipo." aoClicar={editar ? (r) => (setNovo(false), setRascunho({ ...r })) : undefined} />}
      </Cartao>

      <Confirmar
        aberto={!!rascunho}
        aoMudar={(v) => !v && setRascunho(null)}
        titulo={novo ? "Adicionar registo DNS" : "Mudar o registo DNS"}
        texto={null}
        rotuloAcao={novo ? "Adicionar" : "Guardar"}
        desativado={!!erro}
        aoConfirmar={guardar}
      >
        {rascunho && (
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <Select label="Tipo" value={rascunho.tipo} onValueChange={(v) => setRascunho({ ...rascunho, tipo: String(v) as TipoDns })} items={Object.fromEntries(TIPOS_DNS.map((t) => [t, t]))} />
              <Input label="Nome" value={rascunho.nome} onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value })} placeholder="@ para a própria zona" autoComplete="off" />
            </div>
            <Input label="Conteúdo" value={rascunho.valor} onChange={(e) => setRascunho({ ...rascunho, valor: e.target.value })} autoComplete="off" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="TTL" value={String(TTLS[String(rascunho.ttl)] ? rascunho.ttl : 1)} onValueChange={(v) => setRascunho({ ...rascunho, ttl: Number(v) })} items={TTLS} />
              {(rascunho.tipo === "MX" || rascunho.tipo === "SRV") && <Input label="Prioridade" inputMode="numeric" autoComplete="off" value={String(rascunho.prioridade ?? "")} onChange={(e) => setRascunho({ ...rascunho, prioridade: e.target.value === "" ? undefined : Number(e.target.value) })} />}
            </div>
            <Input label="Comentário" value={rascunho.comentario ?? ""} onChange={(e) => setRascunho({ ...rascunho, comentario: e.target.value })} autoComplete="off" />
            {erro && rascunho.valor.trim() && <p className="text-sm text-kumo-danger">{erro}</p>}
            {!novo && (
              <div>
                <Button
                  variant="secondary"
                  icon={ICONES.lixo}
                  onClick={() => {
                    setApagar(rascunho);
                    setRascunho(null);
                  }}
                >
                  Apagar o registo
                </Button>
              </div>
            )}
          </div>
        )}
      </Confirmar>
      <Confirmar
        aberto={!!apagar}
        aoMudar={(v) => !v && setApagar(null)}
        titulo="Apagar o registo DNS"
        perigo
        texto={apagar ? `O registo «${apagar.tipo} ${apagar.nome}» deixa de existir na zona. Fica na reciclagem durante o prazo definido pelo Master Admin e pode ser restaurado.` : ""}
        rotuloAcao="Apagar"
        aoConfirmar={() => {
          if (!apagar) return;
          void lista.remover(apagar.id);
          registar("dados", `Apagou o registo DNS «${apagar.tipo} ${apagar.nome}»`);
        }}
      />
    </Pagina>
  );
}
