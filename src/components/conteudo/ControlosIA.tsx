// Os controlos do assistente de IA, cada um no seu módulo do menu «Assistente de IA»: o comportamento (nome, tom, tamanho das respostas, instruções e limites), a memória (documentos PDF e notas que o assistente usa) e um teste para ver o que ele encontraria e as instruções finais. Tudo fica no navegador; o assistente do painel usa a memória e o nome ao responder.
"use client";

import { Badge, Button, Dialog, Input, InputArea, Meter, Select } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { caracteresAtivos, CONTROLOS_DE_ORIGEM, guardarControlos, instrucoesFinais, LIMITE_DE_MEMORIA, procurar, TAMANHOS, TONS, useControlosIA, type ControlosIA, type DocumentoDeMemoria, type Passagem } from "@/lib/ia-controlos";
import { textoDoPdf } from "@/lib/ia-pdf";
import { useArmazem } from "@/lib/armazem";
import { faqAtivas, faqComoDocumentos, useFaq } from "@/lib/faq";
import { identificador } from "@/lib/conta";
import { Cartao, Confirmar, Interruptor, Linha } from "../conta/Pecas";
import { BotaoCopiar } from "../Copiar";
import { Frase } from "../Frase";
import { ICONES } from "../Icones";
import { Pagina, Titulo } from "../ui";
import { Vazio, ZonaDeUpload } from "./ConteudoPecas";
import { formatarTamanho } from "@/lib/biblioteca";

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });

function Comportamento() {
  const guardado = useControlosIA();
  const [c, setC] = useState<ControlosIA>(guardado);
  const [mexeu, setMexeu] = useState(false);
  const atual = mexeu ? c : guardado;
  const mudar = (p: Partial<ControlosIA>) => (setC({ ...atual, ...p }), setMexeu(true));
  const sujo = mexeu && JSON.stringify(c) !== JSON.stringify(guardado);
  return (
    <div className="flex flex-col gap-4">
      <Cartao titulo="Identidade e tom" dica="Como o assistente se apresenta e como fala.">
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Input label="Nome do assistente" value={atual.nome} onChange={(e) => mudar({ nome: e.target.value })} />
          <Select label="Tom" value={atual.tom} onValueChange={(v) => mudar({ tom: String(v) as ControlosIA["tom"] })} items={TONS} />
          <Select label="Tamanho das respostas" value={atual.tamanho} onValueChange={(v) => mudar({ tamanho: String(v) as ControlosIA["tamanho"] })} items={TAMANHOS} />
          <div className="sm:col-span-2">
            <InputArea label="Primeira mensagem" value={atual.boasVindas} onValueChange={(v) => mudar({ boasVindas: v })} minRows={2} autoResize />
          </div>
        </div>
      </Cartao>
      <Cartao titulo="Instruções e limites" dica="O que o assistente deve fazer sempre e o que nunca deve tratar.">
        <div className="flex flex-col gap-4 p-4">
          <InputArea label="Instruções" description="Escreva como a um colega novo: o que deve fazer, o que deve evitar, como tratar os clientes." value={atual.instrucoes} onValueChange={(v) => mudar({ instrucoes: v })} minRows={5} autoResize placeholder="Por exemplo: confirma sempre o número do pedido antes de explicar um estado." />
          <InputArea label="Temas que não trata" description="Um por linha." value={atual.temasProibidos} onValueChange={(v) => mudar({ temasProibidos: v })} minRows={3} autoResize placeholder={"política\nsalários de outras pessoas"} />
        </div>
        <Linha titulo="Responder só com a memória" dica="Se a resposta não estiver nos documentos, o assistente diz que não sabe em vez de tentar adivinhar.">
          <Interruptor marcado={atual.soMemoria} aoMudar={(v) => mudar({ soMemoria: v })} rotulo="Responder só com a memória" />
        </Linha>
      </Cartao>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-kumo-base px-4 py-3 ring ring-kumo-line">
        <span className="inline-flex shrink-0 items-center gap-2 text-sm text-kumo-subtle">
          <span aria-hidden className={`size-2 rounded-full ${sujo ? "bg-kumo-warning" : "bg-kumo-success"}`} />
          {sujo ? "Alterações por guardar" : "Tudo guardado"}
        </span>
        <div className="sem-barra flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto [&>*]:shrink-0 [&>*:first-child]:ml-auto">
          <Button variant="ghost" disabled={JSON.stringify(atual) === JSON.stringify(CONTROLOS_DE_ORIGEM)} onClick={() => (guardarControlos(CONTROLOS_DE_ORIGEM), setC(CONTROLOS_DE_ORIGEM), setMexeu(false))}>
            Repor o original
          </Button>
          <Button variant="secondary" disabled={!sujo} onClick={() => (setC(guardado), setMexeu(false))}>
            Descartar
          </Button>
          <Button variant="primary" icon={ICONES.guardar} disabled={!sujo} onClick={() => (guardarControlos(c), setMexeu(false))}>
            Guardar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}

function Memoria() {
  const { itens, pronto, guardar, remover } = useArmazem<DocumentoDeMemoria>("memoria");
  const docs = useMemo(() => [...itens].sort((a, b) => b.criado.localeCompare(a.criado)), [itens]);
  const [lendo, setLendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ver, setVer] = useState<DocumentoDeMemoria | null>(null);
  const [apagar, setApagar] = useState<DocumentoDeMemoria | null>(null);
  const [nota, setNota] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const usados = caracteresAtivos(docs);

  const carregar = async (ficheiros: File[]) => {
    setErro(null);
    for (const f of ficheiros) {
      const eTexto = /\.(txt|md)$/i.test(f.name) || f.type.startsWith("text/");
      if (!eTexto && f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) {
        setErro(`«${f.name}» não é um PDF nem um ficheiro de texto.`);
        continue;
      }
      try {
        setLendo(f.name);
        const lido = eTexto ? { texto: await f.text(), paginas: undefined as number | undefined } : await textoDoPdf(new Uint8Array(await f.arrayBuffer()), (m) => setLendo(`${f.name}: ${m}`));
        if (!lido.texto.trim()) {
          setErro(`Não foi possível ler texto em «${f.name}».`);
          continue;
        }
        await guardar({ id: identificador(), nome: f.name, origem: "pdf", tamanho: f.size, paginas: lido.paginas, criado: new Date().toISOString(), ativo: true, texto: lido.texto });
      } catch {
        setErro(`Não foi possível ler «${f.name}». O ficheiro pode estar protegido ou danificado.`);
      }
    }
    setLendo(null);
  };
  const guardarNota = () => guardar({ id: identificador(), nome: titulo.trim(), origem: "nota", tamanho: texto.length, criado: new Date().toISOString(), ativo: true, texto: texto.trim() });

  return (
    <div className="flex flex-col gap-4">
      <Cartao
        titulo="Memória do assistente"
        dica="Os documentos e as notas ativos são o que o assistente sabe além das perguntas prontas. Os PDF são lidos neste navegador (com OCR nas páginas digitalizadas) e nada sai daqui."
        acoes={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={ICONES.mais} onClick={() => (setTitulo(""), setTexto(""), setNota(true))}>
              Adicionar nota
            </Button>
            <ZonaDeUpload aceitar=".pdf,application/pdf,.txt,.md,text/plain,text/markdown" aoEscolher={carregar} className="contents">
              {(abrir) => (
                <Button variant="primary" size="sm" icon={ICONES.enviar} onClick={abrir} disabled={!!lendo}>
                  Carregar PDF
                </Button>
              )}
            </ZonaDeUpload>
          </div>
        }
      >
        <div className="flex flex-col gap-2 border-b border-kumo-hairline px-4 pb-3">
          <Meter label="Memória em uso" value={Math.min(usados, LIMITE_DE_MEMORIA)} max={LIMITE_DE_MEMORIA} />
          <span className={`text-xs ${usados > LIMITE_DE_MEMORIA ? "text-kumo-danger" : "text-kumo-subtle"}`}>
            {usados.toLocaleString("pt-PT")} de {LIMITE_DE_MEMORIA.toLocaleString("pt-PT")} caracteres ativos{usados > LIMITE_DE_MEMORIA ? ": desligue alguns documentos, o assistente não consegue ler tudo." : "."}
          </span>
          {lendo && <span className="text-sm text-kumo-default">A ler {lendo}…</span>}
          {erro && (
            <span className="text-sm text-kumo-danger">
              <Frase>{erro}</Frase>
            </span>
          )}
        </div>
        {!pronto ? (
          <div className="p-6 text-sm text-kumo-subtle">A abrir a memória…</div>
        ) : docs.length === 0 ? (
          <Vazio icone="pdf" titulo="A memória está vazia" texto="Carregue um PDF (um manual, uma política, perguntas frequentes) ou escreva uma nota." />
        ) : (
          docs.map((d) => (
            <Linha
              key={d.id}
              titulo={
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="truncate">{d.nome}</span>
                  <Badge variant="outline">{d.origem === "pdf" ? "Documento" : "Nota"}</Badge>
                </span>
              }
              estado={`${d.paginas ? `${d.paginas} páginas · ` : ""}${d.texto.length.toLocaleString("pt-PT")} caracteres · ${formatarTamanho(d.tamanho)} · ${data(d.criado)}`}
            >
              <div className="flex items-center gap-1">
                <Interruptor marcado={d.ativo} aoMudar={(v) => guardar({ ...d, ativo: v })} rotulo={`Usar «${d.nome}» nas respostas`} />
                <Button variant="ghost" size="sm" onClick={() => setVer(d)}>
                  Ver texto
                </Button>
                <Button variant="ghost" size="sm" shape="square" icon={ICONES.lixo} aria-label={`Remover ${d.nome}`} onClick={() => setApagar(d)} />
              </div>
            </Linha>
          ))
        )}
      </Cartao>

      <Dialog.Root open={!!ver} onOpenChange={(v) => !v && setVer(null)}>
        <Dialog size="lg" className="p-6">
          {ver && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <Dialog.Title className="min-w-0 truncate text-lg font-semibold">{ver.nome}</Dialog.Title>
                <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
              </div>
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg bg-kumo-tint p-3 text-xs">{ver.texto.slice(0, 30000)}{ver.texto.length > 30000 ? "\n\n… (o resto está na memória, só não se mostra aqui)" : ""}</pre>
            </div>
          )}
        </Dialog>
      </Dialog.Root>
      <Confirmar aberto={nota} aoMudar={setNota} titulo="Adicionar nota" texto="Uma nota é um texto curto que o assistente deve saber, por exemplo o horário de atendimento." rotuloAcao="Guardar" aoConfirmar={guardarNota} desativado={!titulo.trim() || !texto.trim()}>
        <div className="flex flex-col gap-3">
          <Input label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus />
          <InputArea label="Texto" value={texto} onValueChange={setTexto} minRows={5} autoResize />
        </div>
      </Confirmar>
      <Confirmar aberto={!!apagar} aoMudar={(v) => !v && setApagar(null)} titulo="Remover da memória" texto={apagar ? `«${apagar.nome}» deixa de existir na memória do assistente. Não se pode desfazer.` : ""} rotuloAcao="Remover" perigo aoConfirmar={() => apagar && remover(apagar.id)} />
    </div>
  );
}

function Testar() {
  const { itens } = useArmazem<DocumentoDeMemoria>("memoria");
  const controlos = useControlosIA();
  const { faq } = useFaq();
  const [pergunta, setPergunta] = useState("");
  const [achados, setAchados] = useState<Passagem[] | null>(null);
  // as perguntas frequentes publicadas são parte do que o assistente sabe
  const conhecido = useMemo(() => [...faqComoDocumentos(faq), ...itens], [faq, itens]);
  const instrucoes = useMemo(() => instrucoesFinais(controlos, itens, faqAtivas(faq).length), [controlos, itens, faq]);
  return (
    <div className="flex flex-col gap-4">
      <Cartao titulo="Testar a memória" dica="Escreva uma pergunta e veja que passagens dos documentos ativos e das perguntas frequentes publicadas o assistente encontraria.">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex items-end gap-2">
            <Input label="Pergunta" value={pergunta} onChange={(e) => setPergunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pergunta.trim() && setAchados(procurar(conhecido, pergunta))} placeholder="Como peço férias?" className="w-full" />
            <Button variant="primary" disabled={!pergunta.trim()} onClick={() => setAchados(procurar(conhecido, pergunta))}>
              Procurar
            </Button>
          </div>
          {achados !== null &&
            (achados.length === 0 ? (
              <span className="text-sm text-kumo-subtle">{controlos.soMemoria ? "Nada na memória responde a isto: o assistente diria que não sabe." : "Nada na memória responde a isto: o assistente usaria só as perguntas prontas."}</span>
            ) : (
              <ul className="flex flex-col gap-3">
                {achados.map((p, i) => (
                  <li key={i} className="rounded-lg p-3 ring ring-kumo-line">
                    <div className="mb-1 text-xs font-medium text-kumo-subtle">{p.documento}</div>
                    <div className="whitespace-pre-wrap text-sm text-kumo-default">{p.texto}</div>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </Cartao>
      <Cartao titulo="Instruções que o modelo recebe" acoes={<BotaoCopiar texto={instrucoes} rotulo="Copiar" dica="Copiar as instruções" tamanho="sm" />}>
        <pre className="m-4 whitespace-pre-wrap rounded-lg bg-kumo-tint p-3 text-xs">{instrucoes}</pre>
      </Cartao>
    </div>
  );
}

const TITULOS = { comportamento: "Comportamento do assistente", memoria: "Memória do assistente", testar: "Testar o assistente" } as const;

/** Uma secção dos controlos da IA; cada uma é um módulo do menu «Assistente de IA». */
export function ControlosDaIA({ aba }: { aba: keyof typeof TITULOS }) {
  return (
    <Pagina>
      <Titulo titulo={TITULOS[aba] ?? TITULOS.comportamento} />
      {aba === "memoria" ? <Memoria /> : aba === "testar" ? <Testar /> : <Comportamento />}
    </Pagina>
  );
}
