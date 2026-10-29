// Os controlos do assistente de IA, cada um no seu módulo do menu «Assistente de IA»: o comportamento (nome, tom, tamanho das respostas, instruções e limites), a memória (documentos PDF e notas que o assistente usa) e um teste para ver o que ele encontraria e as instruções finais. Tudo fica no navegador; o assistente do painel usa a memória e o nome ao responder.
"use client";

import { Badge, Button, Dialog, Input, InputArea, Meter, Select } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { caracteresAtivos, CONTROLOS_DE_ORIGEM, guardarControlos, instrucoesFinais, LIMITE_DE_MEMORIA, procurar, TAMANHOS, TONS, useControlosIA, type ControlosIA, type DocumentoDeMemoria, type Passagem } from "@/lib/ia-controlos";
import { extrairFicheiro } from "@/lib/extract";
import { textoDosExtraidos } from "@/lib/ia-ficheiros";
import { textoDoPdf } from "@/lib/ia-pdf";
import { useArmazem } from "@/lib/armazem";
import { faqAtivas, faqComoDocumentos, useFaq } from "@/lib/faq";
import { identificador } from "@/lib/conta";
import { Cartao, Confirmar, Interruptor, Linha } from "../conta/Pecas";
import { BotaoCopiar } from "../Copiar";
import { Frase } from "../Frase";
import { BarraDeGuardar } from "../BarraDeGuardar";
import { Ic, ICONES } from "../Icones";
import { responderNoTeste } from "@/lib/ia-teste";
import { BotaoIcone, Pagina, Titulo } from "../ui";
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
          <InputArea label="Instruções" description="Orientações do assistente: tarefas, limites e tom de tratamento." value={atual.instrucoes} onValueChange={(v) => mudar({ instrucoes: v })} minRows={5} autoResize placeholder="Por exemplo: confirma sempre o número do pedido antes de explicar um estado." />
          <InputArea label="Temas que não trata" description="Um por linha." value={atual.temasProibidos} onValueChange={(v) => mudar({ temasProibidos: v })} minRows={3} autoResize placeholder={"política\nsalários de outras pessoas"} />
        </div>
        <Linha titulo="Responder só com a memória" dica="Se a resposta não estiver nos documentos, o assistente diz que não sabe em vez de tentar adivinhar.">
          <Interruptor marcado={atual.soMemoria} aoMudar={(v) => mudar({ soMemoria: v })} rotulo="Responder só com a memória" />
        </Linha>
      </Cartao>
      <BarraDeGuardar
        sujo={sujo}
        rotuloDesfazer="Descartar"
        rotuloGuardar="Guardar alterações"
        aoDesfazer={() => (setC(guardado), setMexeu(false))}
        aoGuardar={() => (guardarControlos(c), setMexeu(false))}
        extra={
          <Button variant="ghost" disabled={JSON.stringify(atual) === JSON.stringify(CONTROLOS_DE_ORIGEM)} onClick={() => (guardarControlos(CONTROLOS_DE_ORIGEM), setC(CONTROLOS_DE_ORIGEM), setMexeu(false))}>
            Repor o original
          </Button>
        }
      />
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

  /** Qualquer ficheiro entra: o PDF lê-se à parte (com as páginas e o OCR das digitalizadas) e o resto (Excel, Word, CSV, texto, JSON, XML, BIND, imagens, ZIP…) com o motor da análise de dados. */
  const carregar = async (ficheiros: File[]) => {
    setErro(null);
    for (const f of ficheiros) {
      try {
        setLendo(f.name);
        const ePdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
        const lido = ePdf ? await textoDoPdf(new Uint8Array(await f.arrayBuffer()), (m) => setLendo(`${f.name}: ${m}`)) : { texto: textoDosExtraidos(await extrairFicheiro(f, { progresso: (m) => setLendo(`${f.name}: ${m}`) })), paginas: undefined as number | undefined };
        // sem texto legível o ficheiro entra à mesma, desligado, para se ver que lá está
        await guardar({ id: identificador(), nome: f.name, origem: "pdf", tamanho: f.size, paginas: lido.paginas, criado: new Date().toISOString(), ativo: !!lido.texto.trim(), texto: lido.texto.trim() || "Este ficheiro não tem texto legível." });
      } catch {
        setErro(`Não foi possível ler «${f.name}».`);
      }
    }
    setLendo(null);
  };
  const guardarNota = () => guardar({ id: identificador(), nome: titulo.trim(), origem: "nota", tamanho: texto.length, criado: new Date().toISOString(), ativo: true, texto: texto.trim() });

  return (
    <div className="flex flex-col gap-4">
      <Cartao
        titulo="Memória do assistente"
        dica="Os documentos e as notas ativos são o que o assistente sabe além das perguntas prontas. Aceita qualquer ficheiro (PDF, Excel, Word, CSV, texto, JSON, BIND…): lê-se neste navegador, com OCR nas páginas e imagens digitalizadas, e nada sai daqui."
        acoes={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={ICONES.mais} onClick={() => (setTitulo(""), setTexto(""), setNota(true))}>
              Adicionar nota
            </Button>
            <ZonaDeUpload aceitar="" multiplo aoEscolher={carregar} className="contents">
              {(abrir) => (
                <Button variant="primary" size="sm" icon={ICONES.enviar} onClick={abrir} disabled={!!lendo}>
                  Carregar ficheiros
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
          <Vazio icone="pdf" titulo="A memória está vazia" texto="Carregue ficheiros (um manual, uma tabela de preços, perguntas frequentes) ou escreva uma nota." />
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

/** O teste do assistente: uma conversa a sério, como a de um cliente. Escreve-se uma pergunta (ou carrega-se numa das prontas) e vê-se a resposta, com a fonte por baixo. */
function Testar() {
  const { itens } = useArmazem<DocumentoDeMemoria>("memoria");
  const controlos = useControlosIA();
  const { faq } = useFaq();
  const conhecido = useMemo(() => [...faqComoDocumentos(faq), ...itens], [faq, itens]);
  const prontas = useMemo(() => faqAtivas(faq).filter((f) => f.sugerida).slice(0, 4), [faq]);
  const [conversa, setConversa] = useState<{ de: "eu" | "assistente"; texto: string; fonte?: string }[]>([]);
  const [pergunta, setPergunta] = useState("");
  const perguntar = (texto: string) => {
    const t = texto.trim();
    if (!t) return;
    const r = responderNoTeste(controlos, conhecido, t);
    setConversa((c) => [...c, { de: "eu", texto: t }, { de: "assistente", texto: r.texto, fonte: r.fonte }]);
    setPergunta("");
  };
  return (
    <Cartao titulo="Experimentar o assistente" acoes={conversa.length > 0 ? <BotaoIcone dica="Recomeçar a conversa" icone="atualizar" aoClicar={() => setConversa([])} /> : undefined}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex min-h-56 flex-col gap-2">
          <p className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-kumo-tint px-3 py-2 text-sm text-kumo-default">{controlos.boasVindas}</p>
          {conversa.length === 0 && prontas.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prontas.map((f) => (
                <Button key={f.id} variant="secondary" size="sm" onClick={() => perguntar(f.pergunta)}>
                  {f.pergunta}
                </Button>
              ))}
            </div>
          )}
          {conversa.map((m, i) =>
            m.de === "eu" ? (
              <p key={i} className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-br-md bg-kumo-brand px-3 py-2 text-sm text-white">
                {m.texto}
              </p>
            ) : (
              <div key={i} className="flex max-w-[85%] flex-col gap-1 self-start">
                <p className="whitespace-pre-wrap rounded-2xl rounded-bl-md bg-kumo-tint px-3 py-2 text-sm text-kumo-default">{m.texto}</p>
                {m.fonte && <span className="px-1 text-xs text-kumo-subtle">{m.fonte}</span>}
              </div>
            ),
          )}
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            perguntar(pergunta);
          }}
        >
          <div className="min-w-0 flex-1">
            <Input aria-label="Pergunta" value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Escreva como se fosse um cliente" autoComplete="off" className="w-full" />
          </div>
          <Button type="submit" variant="primary" shape="square" icon={<Ic nome="enviar" />} aria-label="Enviar a pergunta" disabled={!pergunta.trim()} />
        </form>
      </div>
    </Cartao>
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
