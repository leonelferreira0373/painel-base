// O editor de uma nota adesiva: texto rico (negrito, itálico, sublinhado, títulos, listas, citações, código, ligações) e ficheiros de qualquer formato (imagens, áudio, vídeo, documentos; também se gravam áudios ali mesmo, e se colam ou largam), a cor do papel, para quem é, quando expira, palavra-passe (o conteúdo e os ficheiros ficam cifrados) e os lembretes por e-mail.
"use client";

import { Button, Input, Select } from "@cloudflare/kumo";
import { useEffect, useMemo, useRef, useState } from "react";
import { registar } from "@/lib/atividade";
import { localParaIso, isoParaLocal, amanhaAsNove } from "@/lib/email";
import { guardarAnexo, lerAnexo, mudarProtecao, removerAnexo, tamanhoEmPalavras } from "@/lib/notas-anexos";
import {
  anexosUsados,
  cifrarConteudo,
  CORES_DE_NOTA,
  DURACOES,
  erroDaNota,
  emailDoLembrete,
  guardarNota,
  idDoEmailDoLembrete,
  MEMBROS,
  novoIdDeNota,
  sanitizarHtml,
  textoDeHtml,
  type AlvoDeNota,
  type AnexoDaNota,
  type CorDeNota,
  type LembreteDaNota,
  type Nota,
  type Quem,
} from "@/lib/notas";
import { Interruptor } from "../conta/Pecas";
import { Ic, ICONES, type Icone } from "../Icones";
import { SeletorDeDataHora } from "../SeletoresDeTempo";
import { useEmails } from "../super/EmailPecas";

/** Põe a `src` (ou o `href` de um ficheiro) dos elementos do texto que apontam para ficheiros guardados. Devolve os endereços para os libertar. */
export async function resolverAnexos(raiz: HTMLElement, chave?: CryptoKey): Promise<string[]> {
  const urls: string[] = [];
  for (const el of raiz.querySelectorAll<HTMLElement>("[data-anexo]")) {
    const id = el.getAttribute("data-anexo");
    if (!id || (el.getAttribute("src") || el.getAttribute("href"))) continue;
    const blob = await lerAnexo(id, chave);
    if (!blob) {
      el.setAttribute("title", "Ficheiro indisponível");
      continue;
    }
    const url = URL.createObjectURL(blob);
    urls.push(url);
    if (el.tagName === "A") {
      el.setAttribute("href", url);
      el.setAttribute("download", el.getAttribute("data-nome") ?? "ficheiro");
      el.removeAttribute("target");
    } else el.setAttribute("src", url);
  }
  return urls;
}

const FERRAMENTAS: { id: string; icone: Icone; rotulo: string; comando: string; valor?: string }[] = [
  { id: "negrito", icone: "negrito", rotulo: "Negrito", comando: "bold" },
  { id: "italico", icone: "italico", rotulo: "Itálico", comando: "italic" },
  { id: "titulo", icone: "titulo", rotulo: "Título", comando: "formatBlock", valor: "h2" },
  { id: "lista", icone: "lista", rotulo: "Lista", comando: "insertUnorderedList" },
  { id: "numerada", icone: "ordenar", rotulo: "Lista numerada", comando: "insertOrderedList" },
  { id: "citacao", icone: "citacao", rotulo: "Citação", comando: "formatBlock", valor: "blockquote" },
  { id: "codigo", icone: "codigo", rotulo: "Código", comando: "formatBlock", valor: "pre" },
];

export interface PropsDoEditor {
  alvo: AlvoDeNota;
  quem: Quem;
  /** A nota que se muda (já aberta, com o conteúdo à vista) ou nada, numa nota nova. */
  inicial?: { nota: Nota; corpo: string; anexos: AnexoDaNota[]; chave?: CryptoKey; senha?: string };
  aoGuardar: () => void;
  aoCancelar: () => void;
}

const cinco = (n: number) => String(n).padStart(2, "0");
const horaAgora = () => {
  const d = new Date();
  return `${cinco(d.getHours())}.${cinco(d.getMinutes())}`;
};

export function EditorDeNota({ alvo, quem, inicial, aoGuardar, aoCancelar }: PropsDoEditor) {
  const editor = useRef<HTMLDivElement>(null);
  const ficheiros = useRef<HTMLInputElement>(null);
  const selecao = useRef<Range | null>(null);
  const urls = useRef<string[]>([]);
  const gravador = useRef<MediaRecorder | null>(null);
  const emails = useEmails();
  const original = inicial?.nota;
  const [cor, setCor] = useState<CorDeNota>(original?.cor ?? "amarelo");
  const [para, setPara] = useState<string[]>(original?.para ?? []);
  const [outroEmail, setOutroEmail] = useState("");
  const [duracao, setDuracao] = useState(original?.expira ? "data" : "nunca");
  const [expira, setExpira] = useState(original?.expira ? isoParaLocal(original.expira) : amanhaAsNove(new Date()));
  const [protegida, setProtegida] = useState(!!original?.cifra);
  const [senha, setSenha] = useState(inicial?.senha ?? "");
  const [lembretes, setLembretes] = useState<(LembreteDaNota & { local: string })[]>((original?.lembretes ?? []).map((l) => ({ ...l, local: isoParaLocal(l.quando) })));
  const [meta, setMeta] = useState<Record<string, AnexoDaNota>>(() => Object.fromEntries((inicial?.anexos ?? []).map((a) => [a.id, a])));
  const novos = useRef(new Set<string>());
  const [erro, setErro] = useState<string | null>(null);
  const [aGuardar, setAGuardar] = useState(false);
  const [aGravar, setAGravar] = useState<number | null>(null);
  const [ligacao, setLigacao] = useState<string | null>(null);

  // o texto da nota entra no editor uma vez, com os ficheiros já à vista
  useEffect(() => {
    const el = editor.current;
    if (!el) return;
    el.innerHTML = sanitizarHtml(inicial?.corpo ?? "");
    void resolverAnexos(el, inicial?.chave).then((u) => (urls.current = [...urls.current, ...u]));
    return () => {
      urls.current.forEach((u) => URL.revokeObjectURL(u));
      gravador.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // o cronómetro da gravação
  useEffect(() => {
    if (aGravar === null) return;
    const t = window.setInterval(() => setAGravar((s) => (s === null ? null : s + 1)), 1000);
    return () => window.clearInterval(t);
  }, [aGravar === null]);

  const guardarSelecao = () => {
    const s = window.getSelection();
    if (s && s.rangeCount && editor.current?.contains(s.anchorNode)) selecao.current = s.getRangeAt(0).cloneRange();
  };
  const restaurarSelecao = () => {
    editor.current?.focus();
    const s = window.getSelection();
    if (s && selecao.current) {
      s.removeAllRanges();
      s.addRange(selecao.current);
    }
  };
  const comando = (c: string, v?: string) => {
    restaurarSelecao();
    document.execCommand(c, false, v);
    guardarSelecao();
  };
  const inserir = async (html: string) => {
    restaurarSelecao();
    document.execCommand("insertHTML", false, html);
    guardarSelecao();
    if (editor.current) urls.current = [...urls.current, ...(await resolverAnexos(editor.current, inicial?.chave))];
  };
  const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /** Junta ficheiros ao texto: as imagens, o áudio e o vídeo ficam à vista; o resto como etiqueta que se abre. */
  const juntar = async (lista: File[] | Blob[], nomes?: string[]) => {
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i] as File;
      const nome = nomes?.[i] ?? f.name ?? `ficheiro-${i + 1}`;
      const a = await guardarAnexo(f, nome);
      novos.current.add(a.id);
      setMeta((m) => ({ ...m, [a.id]: a }));
      if (a.tipo.startsWith("image/")) await inserir(`<img data-anexo="${a.id}" alt="${escapar(nome)}"><br>`);
      else if (a.tipo.startsWith("audio/")) await inserir(`<audio data-anexo="${a.id}" controls></audio><br>`);
      else if (a.tipo.startsWith("video/")) await inserir(`<video data-anexo="${a.id}" controls></video><br>`);
      else await inserir(`<a data-anexo="${a.id}" data-nome="${escapar(nome)}" class="nota-anexo">${escapar(nome)} (${tamanhoEmPalavras(a.tamanho)})</a>&nbsp;`);
    }
  };

  const gravar = async () => {
    if (aGravar !== null) {
      gravador.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return setErro("Este navegador não grava áudio.");
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const g = new MediaRecorder(fluxo);
      const pedacos: Blob[] = [];
      g.ondataavailable = (e) => e.data.size && pedacos.push(e.data);
      g.onstop = () => {
        fluxo.getTracks().forEach((t) => t.stop());
        setAGravar(null);
        const blob = new Blob(pedacos, { type: g.mimeType || "audio/webm" });
        if (blob.size > 0) void juntar([blob], [`Gravação ${horaAgora()}.${(g.mimeType || "audio/webm").includes("ogg") ? "ogg" : (g.mimeType || "").includes("mp4") ? "m4a" : "webm"}`]);
      };
      g.start();
      gravador.current = g;
      setAGravar(0);
      setErro(null);
    } catch {
      setErro("Não foi possível usar o microfone: dê a licença ao navegador.");
    }
  };

  const colar = (e: React.ClipboardEvent) => {
    const fs = [...e.clipboardData.files];
    e.preventDefault();
    if (fs.length) return void juntar(fs);
    const html = e.clipboardData.getData("text/html");
    const simples = e.clipboardData.getData("text/plain");
    restaurarSelecao();
    if (html) document.execCommand("insertHTML", false, sanitizarHtml(html));
    else document.execCommand("insertText", false, simples);
    guardarSelecao();
  };
  const largar = (e: React.DragEvent) => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    void juntar([...e.dataTransfer.files]);
  };

  const membrosPorAdicionar = useMemo(() => Object.fromEntries(MEMBROS.filter((m) => !para.includes(m.nome)).map((m) => [m.nome, `${m.nome} · ${m.funcao}`])), [para]);
  const adicionarPara = (v: string) => v && !para.some((p) => p.toLowerCase() === v.toLowerCase()) && setPara([...para, v]);
  const emailValido = (t: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.trim());

  const guardar = async () => {
    const el = editor.current;
    if (!el) return;
    setErro(null);
    const corpo = sanitizarHtml(el.innerHTML);
    const usados = anexosUsados(corpo);
    const expiraIso = duracao === "nunca" ? undefined : duracao === "data" ? localParaIso(expira) : new Date(Date.now() + (DURACOES[duracao].ms ?? 0)).toISOString();
    const lembretesIso: LembreteDaNota[] = lembretes.map((l) => ({ id: l.id, para: l.para, quando: localParaIso(l.local) }));
    const problema = erroDaNota({ corpo, para, expira: expiraIso, lembretes: lembretesIso }, usados.length > 0) ?? (protegida && senha.length < 6 ? "A palavra-passe tem pelo menos 6 caracteres." : null);
    if (problema) return setErro(problema);
    setAGuardar(true);
    try {
      const agora = new Date().toISOString();
      const anexos = usados.map((id) => meta[id]).filter(Boolean);
      // o que se juntou e depois se tirou do texto não fica guardado
      for (const id of Object.keys(meta)) if (!usados.includes(id) && novos.current.has(id)) await removerAnexo(id);
      let nota: Nota = {
        id: original?.id ?? novoIdDeNota(),
        alvo: original?.alvo ?? alvo,
        autor: original?.autor ?? quem.nome,
        autorEmail: original?.autorEmail ?? quem.email,
        para,
        cor,
        criada: original?.criada ?? agora,
        atualizada: agora,
        ...(expiraIso ? { expira: expiraIso } : {}),
        lembretes: lembretesIso,
        corpo,
        texto: textoDeHtml(corpo),
        anexos,
      };
      if (protegida) {
        const mesmaSenha = !!original?.cifra && senha === inicial?.senha;
        const { cifra, chave } = await cifrarConteudo({ corpo: nota.corpo, texto: nota.texto, anexos }, senha, mesmaSenha && original?.cifra ? Uint8Array.from(atob(original.cifra.sal), (c) => c.charCodeAt(0)) : undefined);
        for (const a of anexos) {
          const jaCifrado = !!original?.cifra && !novos.current.has(a.id);
          if (!jaCifrado || !mesmaSenha) await mudarProtecao(a.id, jaCifrado ? inicial?.chave : undefined, chave);
        }
        nota = { ...nota, corpo: "", texto: "", anexos: [], cifra };
      } else if (original?.cifra && inicial?.chave) {
        for (const a of anexos) if (!novos.current.has(a.id)) await mudarProtecao(a.id, inicial.chave, undefined);
      }
      await guardarNota(nota);

      // os lembretes entram na fila dos e-mails agendados (e os que se tiraram saem)
      const painel = window.location.origin;
      const remetente = "Painel <nao-responder@painel.exemplo.com>";
      const queroIds = new Set(nota.lembretes.map((l) => idDoEmailDoLembrete(nota, l)));
      for (const e of emails.itens) if (e.id.startsWith(`em-nota-${nota.id}-`) && !queroIds.has(e.id) && e.pasta === "agendados") await emails.remover(e.id, { semReciclagem: true });
      for (const l of nota.lembretes) await emails.guardar(emailDoLembrete(nota, l, painel, remetente, protegida ? null : nota.texto));

      registar("nota", `${original ? "Mudou" : "Deixou"} uma nota em «${alvo.rotulo}»${protegida ? " (com palavra-passe)" : ""}${para.length ? `, para ${para.join(", ")}` : ""}${expiraIso ? ", que expira" : ""}${nota.lembretes.length ? `, com ${nota.lembretes.length} ${nota.lembretes.length === 1 ? "lembrete" : "lembretes"}` : ""}`);
      aoGuardar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível guardar a nota.");
    } finally {
      setAGuardar(false);
    }
  };

  const cronometro = aGravar === null ? "" : `${Math.floor(aGravar / 60)}:${cinco(aGravar % 60)}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="nota-papel flex flex-col gap-2 rounded-xl p-3 ring ring-kumo-line" data-cor={cor}>
        <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label="Formatação">
          {FERRAMENTAS.map((f) => (
            <button key={f.id} type="button" title={f.rotulo} aria-label={f.rotulo} onMouseDown={(e) => e.preventDefault()} onClick={() => comando(f.comando, f.valor)} className="grid size-8 cursor-pointer place-items-center rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/15">
              <Ic nome={f.icone} tamanho={16} />
            </button>
          ))}
          <button type="button" title="Sublinhado" aria-label="Sublinhado" onMouseDown={(e) => e.preventDefault()} onClick={() => comando("underline")} className="grid size-8 cursor-pointer place-items-center rounded-md text-sm font-semibold underline transition-colors hover:bg-black/10 dark:hover:bg-white/15">
            S
          </button>
          <button
            type="button"
            title="Ligação"
            aria-label="Ligação"
            onMouseDown={(e) => (guardarSelecao(), e.preventDefault())}
            onClick={() => setLigacao(ligacao === null ? "https://" : null)}
            className="grid size-8 cursor-pointer place-items-center rounded-md transition-colors hover:bg-black/10 dark:hover:bg-white/15"
          >
            <Ic nome="link" tamanho={16} />
          </button>
          <span className="mx-1 h-5 w-px bg-black/15 dark:bg-white/20" aria-hidden />
          <button type="button" title="Juntar ficheiros" aria-label="Juntar ficheiros" onMouseDown={(e) => (guardarSelecao(), e.preventDefault())} onClick={() => ficheiros.current?.click()} className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors hover:bg-black/10 dark:hover:bg-white/15">
            <Ic nome="pasta" tamanho={16} />
            Ficheiro
          </button>
          <button type="button" title={aGravar === null ? "Gravar áudio" : "Parar a gravação"} aria-label={aGravar === null ? "Gravar áudio" : "Parar a gravação"} onMouseDown={(e) => (guardarSelecao(), e.preventDefault())} onClick={gravar} className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors hover:bg-black/10 dark:hover:bg-white/15 ${aGravar !== null ? "bg-black/10 dark:bg-white/15" : ""}`}>
            <span aria-hidden className={`size-2.5 rounded-full ${aGravar !== null ? "animate-pulse bg-red-600" : "bg-current"}`} />
            {aGravar === null ? "Áudio" : `A gravar ${cronometro}`}
          </button>
          <input ref={ficheiros} type="file" multiple className="hidden" onChange={(e) => (e.target.files && void juntar([...e.target.files]), (e.target.value = ""))} />
        </div>
        {ligacao !== null && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (/^(https?:\/\/|mailto:)/i.test(ligacao)) comando("createLink", ligacao);
              setLigacao(null);
            }}
          >
            <div className="min-w-0 flex-1">
              <Input aria-label="Endereço da ligação" value={ligacao} onChange={(e) => setLigacao(e.target.value)} autoComplete="off" className="w-full" />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Aplicar
            </Button>
          </form>
        )}
        <div ref={editor} className="nota-corpo nota-editor rounded-lg bg-white/40 p-3 dark:bg-black/20" contentEditable suppressContentEditableWarning role="textbox" aria-multiline aria-label="Texto da nota" data-vazio="Escreva a nota. Pode juntar imagens, áudio, vídeo e qualquer ficheiro." onInput={guardarSelecao} onKeyUp={guardarSelecao} onMouseUp={guardarSelecao} onBlur={guardarSelecao} onPaste={colar} onDrop={largar} onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()} />
        <div className="flex items-center gap-2" role="radiogroup" aria-label="Cor do papel">
          {CORES_DE_NOTA.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={cor === c} aria-label={`Papel ${c}`} onClick={() => setCor(c)} className={`nota-papel size-6 cursor-pointer rounded-md ring-1 ring-black/20 transition-transform hover:scale-110 ${cor === c ? "ring-2 ring-black dark:ring-white" : ""}`} data-cor={c} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Para quem</span>
          <div className="flex flex-wrap gap-1.5">
            {para.length === 0 && <span className="text-sm text-kumo-subtle">Toda a gente que vê isto</span>}
            {para.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 rounded-md bg-kumo-tint px-2 py-0.5 text-xs font-medium ring ring-kumo-line">
                {p}
                <button type="button" aria-label={`Tirar ${p}`} className="cursor-pointer" onClick={() => setPara(para.filter((x) => x !== p))}>
                  <Ic nome="fechar" tamanho={11} />
                </button>
              </span>
            ))}
          </div>
          <Select aria-label="Escolher um membro" value="__escolher__" onValueChange={(v) => String(v) !== "__escolher__" && adicionarPara(String(v))} items={{ __escolher__: "Escolher um membro…", ...membrosPorAdicionar }} />
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (emailValido(outroEmail)) (adicionarPara(outroEmail.trim()), setOutroEmail(""));
            }}
          >
            <div className="min-w-0 flex-1">
              <Input aria-label="Ou um e-mail" placeholder="Ou um e-mail" value={outroEmail} onChange={(e) => setOutroEmail(e.target.value)} autoComplete="off" className="w-full" />
            </div>
            <Button type="submit" size="sm" variant="secondary" disabled={!emailValido(outroEmail)}>
              Juntar
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Expira</span>
          <Select aria-label="Quando expira" value={duracao} onValueChange={(v) => setDuracao(String(v))} items={{ ...Object.fromEntries(Object.entries(DURACOES).map(([k, d]) => [k, d.rotulo])), data: "Numa data e hora" }} />
          {duracao === "data" && <SeletorDeDataHora label="Expira em" valor={expira} aoMudar={setExpira} minimo={new Date()} />}
          <div className="mt-1 flex items-center justify-between gap-3 rounded-lg px-3 py-2 ring ring-kumo-line">
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Ic nome="cadeado" tamanho={14} />
              Palavra-passe
            </span>
            <Interruptor marcado={protegida} aoMudar={setProtegida} rotulo="Proteger com palavra-passe" />
          </div>
          {protegida && <Input aria-label="Palavra-passe da nota" type="password" placeholder="Pelo menos 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" className="w-full" />}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Lembretes por e-mail</span>
          <Button size="sm" variant="secondary" icon={ICONES.mais} onClick={() => setLembretes([...lembretes, { id: novoIdDeNota(), para: "dono", quando: "", local: amanhaAsNove(new Date()) }])}>
            Lembrete
          </Button>
        </div>
        {lembretes.length === 0 && <span className="text-sm text-kumo-subtle">Sem lembretes</span>}
        {lembretes.map((l) => (
          <div key={l.id} className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <SeletorDeDataHora label="Quando" valor={l.local} aoMudar={(v) => setLembretes(lembretes.map((x) => (x.id === l.id ? { ...x, local: v } : x)))} minimo={new Date()} />
            <div className="flex flex-col gap-1.5">
              <Select
                label="Para"
                value={l.para === "dono" ? "dono" : "outro"}
                onValueChange={(v) => setLembretes(lembretes.map((x) => (x.id === l.id ? { ...x, para: String(v) === "dono" ? "dono" : "" } : x)))}
                items={{ dono: `Eu (${quem.email || "e-mail da conta"})`, outro: "Outro e-mail" }}
              />
              {l.para !== "dono" && <Input aria-label="E-mail do lembrete" placeholder="nome@empresa.pt" value={l.para} onChange={(e) => setLembretes(lembretes.map((x) => (x.id === l.id ? { ...x, para: e.target.value } : x)))} autoComplete="off" className="w-full" />}
            </div>
            <Button variant="ghost" shape="square" icon={ICONES.lixo} aria-label="Tirar o lembrete" onClick={() => setLembretes(lembretes.filter((x) => x.id !== l.id))} />
          </div>
        ))}
      </div>

      {erro && (
        <p className="text-sm text-kumo-danger" role="alert">
          {erro}
        </p>
      )}
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={aoCancelar} disabled={aGuardar}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={guardar} disabled={aGuardar}>
          {original ? "Guardar a nota" : "Deixar a nota"}
        </Button>
      </div>
    </div>
  );
}
