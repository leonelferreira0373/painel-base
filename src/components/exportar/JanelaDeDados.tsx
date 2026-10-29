// A janela «Exportar e importar»: abre-se pelo botão do cabeçalho ou pelo «Exportar» de um cartão. Exportar: a pessoa escolhe o que exportar (se o ecrã tem mais de uma coisa) e os formatos que quiser (PDF, CSV, Excel, Word, TXT, JSON, imagens, BIND), só os que estão ligados em Definições da conta > Exportar, e junta-os num ZIP se quiser. Importar: qualquer ficheiro, para qualquer ecrã: as tabelas entram nos registos do ecrã, as zonas BIND nos registos DNS e o resto guarda-se na biblioteca de ficheiros.
"use client";

import { Button, Dialog, Loader, Select } from "@cloudflare/kumo";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { caminhoConta } from "@/dados/conta";
import { registar } from "@/lib/atividade";
import { guardar as guardarNoArmazem, todos as todosDoArmazem } from "@/lib/armazem";
import { TIPO_PASTA, formatarTamanho, nomeUnico, type ItemDaBiblioteca } from "@/lib/biblioteca";
import { useConta, identificador } from "@/lib/conta";
import { alvoRegistado, EVENTO_ABRIR_DADOS, fontesDoEcra, fontesRegistadas, useDadosDaPagina, type AbaDeDados, type AlvoDeImportacao } from "@/lib/dados-da-pagina";
import { deBind, type ZonaLida } from "@/lib/dns-bind";
import { useApp } from "@/lib/estado";
import { exportarFonte, descarregarBlob } from "@/lib/exportar/gerar";
import { FORMATOS, formatosOferecidos, infoDoFormato, type FonteDeExportacao, type FormatoDeExportar } from "@/lib/exportar/formatos";
import { detetarFormato, extrairFicheiro, rotuloDoFormato } from "@/lib/extract";
import { linhasParaImportar, pareceBind } from "@/lib/importar";
import { Vazio, ZonaDeUpload } from "../conteudo/ConteudoPecas";
import { Frase } from "../Frase";
import { Ic, ICONES } from "../Icones";
import { Separadores } from "../ui";

const ULTIMO = "painel.exportar.ultimo";
const lerUltimo = (): FormatoDeExportar[] => {
  try {
    const v = JSON.parse(window.localStorage.getItem(ULTIMO) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as FormatoDeExportar[]) : [];
  } catch {
    return [];
  }
};

export function JanelaDeDados() {
  const [aberta, setAberta] = useState(false);
  const [aba, setAba] = useState<AbaDeDados>("exportar");
  const [fontes, setFontes] = useState<FonteDeExportacao[]>([]);
  useEffect(() => {
    const abrir = (e: Event) => {
      const d = (e as CustomEvent<{ aba: AbaDeDados; fonte?: FonteDeExportacao }>).detail;
      const registadas = fontesRegistadas();
      setFontes(d.fonte ? [d.fonte] : registadas.length ? registadas : fontesDoEcra());
      setAba(d.aba);
      setAberta(true);
    };
    window.addEventListener(EVENTO_ABRIR_DADOS, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_DADOS, abrir);
  }, []);
  return (
    <Dialog.Root open={aberta} onOpenChange={setAberta}>
      <Dialog size="lg" className="max-h-[90dvh] overflow-y-auto p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">Exportar e importar</Dialog.Title>
            <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
          </div>
          <Separadores
            itens={[
              { id: "exportar", rotulo: "Exportar" },
              { id: "importar", rotulo: "Importar" },
            ]}
            valor={aba}
            aoMudar={(v) => setAba(v as AbaDeDados)}
          />
          {aba === "exportar" ? <PainelDeExportar fontes={fontes} aoFechar={() => setAberta(false)} /> : <PainelDeImportar aoFechar={() => setAberta(false)} />}
        </div>
      </Dialog>
    </Dialog.Root>
  );
}

// ---------- exportar ----------

function PainelDeExportar({ fontes, aoFechar }: { fontes: FonteDeExportacao[]; aoFechar: () => void }) {
  const { conta } = useConta();
  const { avisar } = useApp();
  const router = useRouter();
  const [indice, setIndice] = useState(0);
  const fonte = fontes[Math.min(indice, fontes.length - 1)];
  const oferta = useMemo(() => (fonte ? formatosOferecidos(fonte, conta.exportar) : null), [fonte, conta.exportar]);
  const [escolhidos, setEscolhidos] = useState<FormatoDeExportar[]>([]);
  const [juntar, setJuntar] = useState(true);
  const [aGerar, setAGerar] = useState(false);
  const chaveDaOferta = oferta?.formatos.join(",") ?? "";
  useEffect(() => {
    if (!oferta) return;
    const antes = lerUltimo().filter((f) => oferta.formatos.includes(f));
    setEscolhidos(antes.length ? antes : oferta.formatos.slice(0, 1));
  }, [chaveDaOferta, fonte?.nome]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fonte || !oferta) return <Vazio icone="transferir" titulo="Não há nada para exportar aqui" texto="Abra um ecrã com uma lista ou uma tabela, ou o «Exportar» de um cartão." />;

  if (oferta.formatos.length === 0)
    return (
      <div className="flex flex-col gap-4">
        <Vazio icone="transferir" titulo="Nenhum formato de exportação está ligado" texto="Ligue os formatos que quer em Definições da conta > Exportar." />
        <div className="flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              aoFechar();
              router.push(caminhoConta("exportar"));
            }}
          >
            Abrir as definições
          </Button>
        </div>
      </div>
    );

  const alternar = (f: FormatoDeExportar) => setEscolhidos((e) => (e.includes(f) ? e.filter((x) => x !== f) : [...e, f]));
  const linhas = fonte.dados?.linhas.length ?? fonte.bind?.registos.length;
  const exportar = async () => {
    setAGerar(true);
    try {
      const ficheiros = await exportarFonte(fonte, escolhidos, juntar && oferta.zip);
      for (const f of ficheiros) {
        descarregarBlob(f.nome, f.blob);
        await new Promise((r) => window.setTimeout(r, 280));
      }
      try {
        window.localStorage.setItem(ULTIMO, JSON.stringify(escolhidos));
      } catch {
        /* sem armazenamento */
      }
      registar("dados", `Exportou «${fonte.titulo}» como ${escolhidos.map((f) => infoDoFormato(f).rotulo).join(", ")}`);
      avisar(ficheiros.length === 1 ? `Exportado «${ficheiros[0].nome}»` : `Exportados ${ficheiros.length} ficheiros`);
      aoFechar();
    } catch (e) {
      avisar(`Não foi possível exportar: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    } finally {
      setAGerar(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {fontes.length > 1 ? (
        <Select label="O que exportar" value={String(indice)} onValueChange={(v) => setIndice(Number(v))} items={Object.fromEntries(fontes.map((f, i) => [String(i), f.titulo]))} />
      ) : (
        <div className="flex flex-wrap items-center gap-x-2 text-sm">
          <span className="font-medium">
            <Frase>{`«${fonte.titulo}»`}</Frase>
          </span>
          {linhas !== undefined && <span className="text-kumo-subtle">{linhas.toLocaleString("pt-PT")} {linhas === 1 ? "linha" : "linhas"}</span>}
        </div>
      )}
      <div role="group" aria-label="Formatos" className="grid gap-2 sm:grid-cols-2">
        {FORMATOS.filter((f) => oferta.formatos.includes(f.id)).map((f) => {
          const marcado = escolhidos.includes(f.id);
          return (
            <button key={f.id} type="button" role="checkbox" aria-checked={marcado} onClick={() => alternar(f.id)} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition-shadow ${marcado ? "bg-kumo-tint ring-2 ring-kumo-brand" : "ring ring-kumo-line hover:bg-kumo-tint"}`}>
              <Ic nome={f.icone} tamanho={20} className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{f.rotulo}</span>
              <span className={`grid size-5 shrink-0 place-items-center rounded-full transition-colors ${marcado ? "bg-kumo-brand text-white" : "ring ring-kumo-line"}`}>{marcado && <Ic nome="certo" tamanho={12} />}</span>
            </button>
          );
        })}
      </div>
      {oferta.zip && escolhidos.length > 1 && (
        <button type="button" role="checkbox" aria-checked={juntar} onClick={() => setJuntar((j) => !j)} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium ${juntar ? "bg-kumo-tint ring-2 ring-kumo-brand" : "ring ring-kumo-line hover:bg-kumo-tint"}`}>
          <Ic nome="pasta" tamanho={20} className="shrink-0" />
          <span className="min-w-0 flex-1">Juntar tudo num ficheiro ZIP</span>
          <span className={`grid size-5 shrink-0 place-items-center rounded-full ${juntar ? "bg-kumo-brand text-white" : "ring ring-kumo-line"}`}>{juntar && <Ic nome="certo" tamanho={12} />}</span>
        </button>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="text-sm text-kumo-subtle underline-offset-2 hover:text-kumo-default hover:underline"
          onClick={() => {
            aoFechar();
            router.push(caminhoConta("exportar"));
          }}
        >
          {oferta.desligados.length ? `${oferta.desligados.length} ${oferta.desligados.length === 1 ? "formato desligado" : "formatos desligados"} nas definições` : "Escolher os formatos nas definições"}
        </button>
        <div className="flex items-center gap-2">
          {aGerar && <Loader size={16} />}
          <Button variant="secondary" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button variant="primary" icon={ICONES.transferir} disabled={escolhidos.length === 0 || aGerar} onClick={exportar}>
            Exportar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- importar ----------

type Destino = "linhas" | "zona" | "biblioteca";
interface Analise {
  id: string;
  ficheiro: File;
  formato: string;
  destino: Destino;
  nota: string;
  linhas?: Record<string, string>[];
  zona?: ZonaLida;
}

/** O que se lê como tabela: o resto guarda-se na biblioteca. */
const COM_TABELA = new Set(["xlsx", "xls", "ods", "json", "ndjson", "texto", "docx", "odt", "html"]);

async function analisar(ficheiro: File, alvo: AlvoDeImportacao | null): Promise<Analise> {
  const bytes = new Uint8Array(await ficheiro.arrayBuffer());
  const formato = await detetarFormato(ficheiro.name, bytes);
  const base = { id: identificador(), ficheiro, formato: rotuloDoFormato(formato) };
  if (alvo?.aoZona && (formato === "texto" || /\.(zone|bind|db)$/i.test(ficheiro.name))) {
    const t = new TextDecoder().decode(bytes);
    if (pareceBind(t)) {
      const zona = deBind(t);
      return { ...base, destino: "zona", zona, nota: `Zona DNS com ${zona.registos.length} ${zona.registos.length === 1 ? "registo" : "registos"}${zona.erros.length ? ` e ${zona.erros.length} ${zona.erros.length === 1 ? "aviso" : "avisos"}` : ""}` };
    }
  }
  if (alvo?.colunas && alvo.aoLinhas && COM_TABELA.has(formato)) {
    try {
      const extraidos = await extrairFicheiro(ficheiro);
      let melhor: { linhas: Record<string, string>[]; reconhecidas: number } | null = null;
      for (const e of extraidos) for (const t of e.tabelas) {
        const r = linhasParaImportar(t, alvo.colunas);
        if (r.linhas.length && (!melhor || r.reconhecidas > melhor.reconhecidas)) melhor = r;
      }
      if (melhor) return { ...base, destino: "linhas", linhas: melhor.linhas, nota: `${melhor.linhas.length} ${melhor.linhas.length === 1 ? "linha" : "linhas"} para «${alvo.titulo}» (${melhor.reconhecidas} ${melhor.reconhecidas === 1 ? "coluna reconhecida" : "colunas reconhecidas"})` };
    } catch {
      /* não se leu como tabela: guarda-se como ficheiro */
    }
  }
  return { ...base, destino: "biblioteca", nota: alvo?.colunas && COM_TABELA.has(formato) ? "Não tem colunas que casem com este ecrã: fica guardado na biblioteca de ficheiros" : "Fica guardado na biblioteca de ficheiros" };
}

async function guardarNaBiblioteca(ficheiro: File): Promise<void> {
  const itens = await todosDoArmazem<ItemDaBiblioteca>("ficheiros");
  const agora = new Date().toISOString();
  if (!itens.some((i) => i.tipo === TIPO_PASTA && i.nome === "Importados" && i.pasta === "")) await guardarNoArmazem<ItemDaBiblioteca>("ficheiros", { id: identificador(), nome: "Importados", tipo: TIPO_PASTA, tamanho: 0, criado: agora, pasta: "" });
  await guardarNoArmazem<ItemDaBiblioteca>("ficheiros", { id: identificador(), nome: nomeUnico(itens, "Importados", ficheiro.name), tipo: ficheiro.type || "application/octet-stream", tamanho: ficheiro.size, criado: agora, pasta: "Importados", blob: ficheiro });
}

function PainelDeImportar({ aoFechar }: { aoFechar: () => void }) {
  const { avisar } = useApp();
  const pathname = usePathname();
  const { alvo } = useDadosDaPagina();
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [aLer, setALer] = useState(false);
  const [aImportar, setAImportar] = useState(false);
  const [tambemBiblioteca, setTambemBiblioteca] = useState(false);

  const escolher = async (ficheiros: File[]) => {
    setALer(true);
    const novos: Analise[] = [];
    for (const f of ficheiros) novos.push(await analisar(f, alvoRegistado()));
    setAnalises((a) => [...a, ...novos]);
    setALer(false);
  };

  const importar = async () => {
    setAImportar(true);
    let linhas = 0;
    let registos = 0;
    let guardados = 0;
    try {
      for (const a of analises) {
        if (a.destino === "linhas" && a.linhas && alvo?.aoLinhas) {
          await alvo.aoLinhas(a.linhas);
          linhas += a.linhas.length;
        } else if (a.destino === "zona" && a.zona && alvo?.aoZona) {
          await alvo.aoZona(a.zona);
          registos += a.zona.registos.length;
        }
        if (a.destino === "biblioteca" || tambemBiblioteca) {
          await guardarNaBiblioteca(a.ficheiro);
          guardados++;
        }
      }
      const partes = [linhas ? `${linhas} ${linhas === 1 ? "linha importada" : "linhas importadas"}` : "", registos ? `${registos} ${registos === 1 ? "registo DNS importado" : "registos DNS importados"}` : "", guardados ? `${guardados} ${guardados === 1 ? "ficheiro guardado" : "ficheiros guardados"} na biblioteca` : ""].filter(Boolean);
      registar("dados", `Importou ${analises.map((a) => `«${a.ficheiro.name}»`).join(", ")}${partes.length ? `: ${partes.join(", ")}` : ""}`);
      avisar(partes.join(" · ") || "Nada para importar");
      aoFechar();
    } catch (e) {
      avisar(`Não foi possível importar: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    } finally {
      setAImportar(false);
    }
  };

  return (
    <div className="flex flex-col gap-4" key={pathname}>
      {alvo && (
        <div className="text-sm">
          <Frase>{`Importar para «${alvo.titulo}»`}</Frase>
        </div>
      )}
      <ZonaDeUpload multiplo aoEscolher={escolher} className="bg-kumo-tint">
        {(abrir) => (
          <button type="button" onClick={abrir} className="flex w-full cursor-pointer flex-col items-center gap-2 px-4 py-8 text-center text-sm">
            <Ic nome="subida" tamanho={28} />
            <span className="font-medium">Largue aqui os ficheiros, ou escolha-os</span>
            <span className="text-kumo-subtle">Qualquer tipo de ficheiro{alvo?.aoZona ? ", incluindo zonas BIND" : ""}</span>
          </button>
        )}
      </ZonaDeUpload>
      {(aLer || analises.length > 0) && (
        <ul className="flex flex-col divide-y divide-kumo-hairline rounded-xl ring ring-kumo-line">
          {analises.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
              <Ic nome={a.destino === "zona" ? "globo" : a.destino === "linhas" ? "tabela" : "ficheiro"} tamanho={18} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{a.ficheiro.name}</div>
                <div className="text-[13px] text-kumo-subtle">
                  {a.formato} · {formatarTamanho(a.ficheiro.size)} · <Frase>{a.nota}</Frase>
                </div>
              </div>
              <Button variant="ghost" shape="square" size="sm" icon={ICONES.fechar} aria-label={`Tirar ${a.ficheiro.name}`} onClick={() => setAnalises((x) => x.filter((y) => y.id !== a.id))} />
            </li>
          ))}
          {aLer && (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-kumo-subtle">
              <Loader size={16} />A ler os ficheiros…
            </li>
          )}
        </ul>
      )}
      {alvo && analises.some((a) => a.destino !== "biblioteca") && (
        <button type="button" role="checkbox" aria-checked={tambemBiblioteca} onClick={() => setTambemBiblioteca((v) => !v)} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium ${tambemBiblioteca ? "bg-kumo-tint ring-2 ring-kumo-brand" : "ring ring-kumo-line hover:bg-kumo-tint"}`}>
          <Ic nome="pasta" tamanho={20} className="shrink-0" />
          <span className="min-w-0 flex-1">Guardar também uma cópia na biblioteca</span>
          <span className={`grid size-5 shrink-0 place-items-center rounded-full ${tambemBiblioteca ? "bg-kumo-brand text-white" : "ring ring-kumo-line"}`}>{tambemBiblioteca && <Ic nome="certo" tamanho={12} />}</span>
        </button>
      )}
      <div className="flex items-center justify-end gap-2">
        {aImportar && <Loader size={16} />}
        <Button variant="secondary" onClick={aoFechar}>
          Cancelar
        </Button>
        <Button variant="primary" icon={ICONES.subida} disabled={analises.length === 0 || aLer || aImportar} onClick={importar}>
          Importar
        </Button>
      </div>
    </div>
  );
}
