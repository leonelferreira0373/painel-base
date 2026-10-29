// As peças da partilha de ficheiros por WebRTC: o código e o QR, o leitor de QR, a lista de aparelhos, os recentes, a zona para largar ficheiros e a lista de transferências com o progresso, a velocidade e o que falta. Servem a página do painel e a página pública de receber.
"use client";

import { Button, Dialog, Input } from "@cloudflare/kumo";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { extrairLigacao, formatarCodigo, formatarDuracaoMs, formatarTamanho, formatarVelocidade, idDeTexto, nomeDoAparelho, normalizarCodigo, percentagem, tempoQueFalta, velocidade, codigoDoId, type ParLembrado } from "@/lib/partilha";
import type { AparelhoLigado, Transferencia } from "@/lib/usar-par";
import { BotaoCopiar, copiar } from "../Copiar";
import { Dica } from "../Dica";
import { ICONES, Ic, type Icone } from "../Icones";

/** Os ícones dos botões só de ícone levam sempre uma dica. */
function BotaoDeIcone({ dica, icone, aoClicar, desativado, variante = "ghost", tamanho = "sm" }: { dica: string; icone: Icone; aoClicar: () => void; desativado?: boolean; variante?: "ghost" | "secondary" | "primary"; tamanho?: "xs" | "sm" | "base" }) {
  return (
    <Dica conteudo={dica}>
      <Button variant={variante} size={tamanho} shape="square" icon={<Ic nome={icone} tamanho={tamanho === "xs" ? 14 : 16} />} aria-label={dica} disabled={desativado} onClick={aoClicar} />
    </Dica>
  );
}

// ---------- o código e o QR ----------

export function CodigoEQr({ meuId, ligacao, aoLer, aLer }: { meuId: string | null; ligacao: string; aoLer: () => void; aLer?: boolean }) {
  const [qr, setQr] = useState(false);
  const codigo = meuId ? formatarCodigo(codigoDoId(meuId)) : "";
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-kumo-subtle">O seu código</div>
          <div className="font-mono text-3xl font-bold tracking-[0.2em] text-kumo-default tabular-nums">{codigo || "···-···"}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <BotaoCopiar texto={codigo} dica="Copiar o código" tamanho="sm" quadrado variante="ghost" />
          <BotaoDeIcone dica="Escanear o QR de outro aparelho" icone="escanear" aoClicar={aoLer} desativado={aLer} />
          <BotaoDeIcone dica={qr ? "Esconder o QR" : "Mostrar o QR"} icone="qr" aoClicar={() => setQr((v) => !v)} />
        </div>
      </div>
      {qr && meuId && (
        <div className="flex flex-col items-center gap-3 border-t border-kumo-hairline pt-4">
          <div className="rounded-xl bg-white p-3 ring ring-kumo-line">
            <QRCodeSVG value={ligacao} size={200} level="M" marginSize={0} />
          </div>
          <BotaoCopiar texto={ligacao} rotulo="Copiar a ligação" tamanho="sm" dica="Copiar a ligação para receber" />
        </div>
      )}
    </div>
  );
}

/** Escreve-se o código, ou cola-se uma ligação inteira: serve de qualquer maneira. */
export function CampoDoCodigo({ aoLigar, rotulo, desativado }: { aoLigar: (id: string) => void; rotulo: string; desativado?: boolean }) {
  const [texto, setTexto] = useState("");
  const id = idDeTexto(texto);
  const mudar = (v: string) => {
    // uma ligação inteira não se corta; o código escreve-se com hífen no meio
    if (/^https?:/i.test(v.trim())) return setTexto(v);
    const c = normalizarCodigo(v).slice(0, 6);
    setTexto(c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c);
  };
  const ligar = () => {
    if (!id) return;
    aoLigar(id);
    setTexto("");
  };
  return (
    <form
      className="flex flex-col gap-2 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        ligar();
      }}
    >
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input label={rotulo} value={texto} onChange={(e) => mudar(e.target.value)} placeholder="ABC-XYZ" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} className="font-mono uppercase tracking-[0.15em]" />
        </div>
        <Button type="submit" variant="primary" icon={<Ic nome="ligacao" tamanho={16} />} disabled={!id || desativado}>
          Ligar
        </Button>
      </div>
    </form>
  );
}

// ---------- o leitor de QR ----------

export function LeitorDeQr({ aberto, aoFechar, aoLer }: { aberto: boolean; aoFechar: () => void; aoLer: (texto: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [fonte, setFonte] = useState<"camara" | "ecra">("camara");
  const [erro, setErro] = useState<string | null>(null);
  const [a, setA] = useState(false);
  useEffect(() => {
    if (aberto) setFonte(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? "camara" : "ecra");
  }, [aberto]);
  useEffect(() => {
    if (!aberto) return;
    let parar = () => undefined as void;
    let cancelado = false;
    setErro(null);
    setA(true);
    (async () => {
      const el = video.current;
      if (!el) return;
      try {
        const { default: QrScanner } = await import("qr-scanner");
        if (cancelado) return;
        if (fonte === "camara") {
          const leitor = new QrScanner(el, (r) => (aoLer(r.data), aoFechar()), { preferredCamera: "environment", highlightScanRegion: true, returnDetailedScanResult: true });
          parar = () => (leitor.stop(), leitor.destroy());
          await leitor.start();
        } else {
          const fluxo = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 10 }, audio: false });
          if (cancelado) return fluxo.getTracks().forEach((t) => t.stop());
          el.srcObject = fluxo;
          await el.play();
          const tela = document.createElement("canvas");
          const ctx = tela.getContext("2d", { willReadFrequently: true })!;
          let acabou = false;
          const passo = async () => {
            if (acabou) return;
            if (el.videoWidth) {
              tela.width = el.videoWidth;
              tela.height = el.videoHeight;
              ctx.drawImage(el, 0, 0);
              try {
                const r = await QrScanner.scanImage(tela, { returnDetailedScanResult: true });
                if (r?.data) {
                  acabou = true;
                  aoLer(r.data);
                  aoFechar();
                  return;
                }
              } catch {
                /* nada neste fotograma */
              }
            }
            requestAnimationFrame(passo);
          };
          requestAnimationFrame(passo);
          parar = () => {
            acabou = true;
            fluxo.getTracks().forEach((t) => t.stop());
            el.srcObject = null;
          };
        }
      } catch (e) {
        setErro(/Permission|NotAllowed/i.test(String(e)) ? "O navegador não deixou usar a câmara ou o ecrã. Dê a permissão e tente de novo." : ((e as Error)?.message ?? "Não foi possível abrir o leitor."));
      } finally {
        setA(false);
      }
    })();
    return () => {
      cancelado = true;
      parar();
    };
    // o leitor recomeça só quando se abre ou se muda a fonte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, fonte]);
  return (
    <Dialog.Root open={aberto} onOpenChange={(v) => !v && aoFechar()}>
      <Dialog size="base" className="p-6" data-sem-nota="">
        <div className="mb-3 flex items-center justify-between gap-4">
          <Dialog.Title className="text-lg font-semibold">Ler o QR de outro aparelho</Dialog.Title>
          <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
        </div>
        <div className="mb-3 flex gap-2">
          <Button variant={fonte === "camara" ? "primary" : "secondary"} size="sm" icon={<Ic nome="camara" tamanho={14} />} onClick={() => setFonte("camara")}>
            Câmara
          </Button>
          <Button variant={fonte === "ecra" ? "primary" : "secondary"} size="sm" icon={<Ic nome="monitor" tamanho={14} />} onClick={() => setFonte("ecra")}>
            Ecrã
          </Button>
        </div>
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-kumo-recessed">
          <video ref={video} playsInline muted className="size-full object-contain" />
          {a && <span className="absolute text-sm text-kumo-subtle">A abrir {fonte === "camara" ? "a câmara" : "o ecrã"}…</span>}
        </div>
        {erro && <p className="mt-3 text-sm text-kumo-danger">{erro}</p>}
      </Dialog>
    </Dialog.Root>
  );
}

// ---------- os aparelhos ----------

const PONTO: Record<AparelhoLigado["estado"], string> = { aberto: "bg-kumo-success", "a-religar": "bg-kumo-warning animate-pulse", "a-ligar": "bg-kumo-inactive animate-pulse" };
const ESTADO_DO_APARELHO: Record<AparelhoLigado["estado"], string> = { aberto: "Ligado", "a-religar": "A voltar a ligar", "a-ligar": "A ligar" };

export function ListaDeAparelhos({ aparelhos, aoReligar, aoDesligar, aoDesligarTodos }: { aparelhos: AparelhoLigado[]; aoReligar: (id: string) => void; aoDesligar: (id: string) => void; aoDesligarTodos: () => void }) {
  return (
    <div className="flex flex-col">
      {aparelhos.map((a) => (
        <div key={a.peerId} className="flex items-center gap-2 border-t border-kumo-hairline px-4 py-2.5 first:border-t-0">
          <span className={`size-2 shrink-0 rounded-full ${PONTO[a.estado]}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-kumo-default">{nomeDoAparelho(a.peerId, a.plataforma)}</div>
            <div className="text-xs text-kumo-subtle">{ESTADO_DO_APARELHO[a.estado]}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <BotaoDeIcone dica="Voltar a ligar" icone="atualizar" aoClicar={() => aoReligar(a.peerId)} />
            <BotaoDeIcone dica="Desligar este aparelho" icone="sair" aoClicar={() => aoDesligar(a.peerId)} />
          </div>
        </div>
      ))}
      {aparelhos.length > 1 && (
        <div className="flex justify-end border-t border-kumo-hairline px-4 py-2">
          <Button variant="ghost" size="sm" onClick={aoDesligarTodos}>
            Desligar todos
          </Button>
        </div>
      )}
    </div>
  );
}

export function ParesRecentes({ pares, aoLigar, aoEsquecer }: { pares: ParLembrado[]; aoLigar: (id: string) => void; aoEsquecer: (id: string) => void }) {
  return (
    <div className="flex flex-col">
      {pares.map((p) => (
        <div key={p.peerId} className="flex items-center gap-2 border-t border-kumo-hairline px-4 py-2.5 first:border-t-0">
          <Ic nome="recentes" tamanho={16} className="shrink-0 text-kumo-subtle" />
          <div className="min-w-0 flex-1 truncate text-sm font-medium text-kumo-default">{nomeDoAparelho(p.peerId, p.platform)}</div>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="secondary" size="sm" onClick={() => aoLigar(p.peerId)}>
              Ligar
            </Button>
            <BotaoDeIcone dica="Esquecer este aparelho" icone="fechar" aoClicar={() => aoEsquecer(p.peerId)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- largar ficheiros ----------

export function ZonaDeEnvio({ aparelhosAbertos, aoEscolher, desativada, pendentes }: { aparelhosAbertos: number; aoEscolher: (f: File[]) => void; desativada?: boolean; pendentes: number }) {
  const entrada = useRef<HTMLInputElement>(null);
  const pode = aparelhosAbertos > 0 && !desativada;
  return (
    <div className="flex flex-col gap-3 p-4">
      <button
        type="button"
        disabled={desativada}
        onClick={() => entrada.current?.click()}
        className={`flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${pode ? "border-kumo-line bg-kumo-base hover:border-kumo-fill hover:bg-kumo-tint" : "border-kumo-hairline bg-kumo-recessed"} ${desativada ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-kumo-tint text-kumo-subtle">
          <Ic nome="paraCima" tamanho={20} />
        </span>
        <span className="text-sm font-medium text-kumo-default">{aparelhosAbertos === 0 ? "Ligue um aparelho para enviar" : aparelhosAbertos === 1 ? "Toque aqui ou largue os ficheiros" : `Enviar para ${aparelhosAbertos} aparelhos`}</span>
        <span className="text-xs text-kumo-subtle">{aparelhosAbertos === 0 ? "Os ficheiros que escolher agora esperam pela ligação." : "Qualquer ficheiro, sem perder qualidade: vão direitos para o outro aparelho."}</span>
      </button>
      <input ref={entrada} type="file" multiple className="hidden" onChange={(e) => (e.target.files && e.target.files.length > 0 && aoEscolher(Array.from(e.target.files)), (e.target.value = ""))} />
      {pendentes > 0 && <p className="rounded-lg bg-kumo-tint px-3 py-2 text-sm text-kumo-default">{pendentes === 1 ? "1 ficheiro à espera da ligação." : `${pendentes} ficheiros à espera da ligação.`}</p>}
    </div>
  );
}

export function AvisoDeLargar({ visivel }: { visivel: boolean }) {
  if (!visivel) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-kumo-base/80 p-6 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-kumo-fill bg-kumo-base px-10 py-8 text-center shadow-lg">
        <Ic nome="paraCima" tamanho={28} />
        <div className="text-base font-semibold text-kumo-default">Largue os ficheiros para os enviar</div>
      </div>
    </div>
  );
}

// ---------- as transferências ----------

function iconeDoFicheiro(nome: string, mime: string): Icone {
  const n = nome.toLowerCase();
  if (mime.startsWith("image/")) return "imagem";
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (/\.(xlsx?|csv|ods)$/.test(n)) return "tabela";
  if (/\.(json)$/.test(n)) return "json";
  if (/\.(js|ts|tsx|jsx|py|html|css|sh|sql)$/.test(n)) return "codigo";
  return "ficheiro";
}

const hora = (ms: number) => new Date(ms).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

export function LinhaDeTransferencia({ t, plataforma, agora, podeReenviar, aoReenviar, aoCancelar }: { t: Transferencia; plataforma?: string; agora: number; podeReenviar: boolean; aoReenviar: (t: Transferencia) => void; aoCancelar: (t: Transferencia) => void }) {
  const [copiado, setCopiado] = useState<"ocioso" | "ok" | "erro">("ocioso");
  const [aReenviar, setAReenviar] = useState(false);
  const pct = percentagem(t.bytes, t.tamanho);
  const ligacao = t.texto ? extrairLigacao(t.texto) : null;
  const falta = tempoQueFalta(t.tamanho, t.bytes, t.inicio, agora);
  const v = velocidade(t.bytes, t.inicio, agora);
  const copiarTexto = async () => {
    if (!t.texto) return;
    setCopiado((await copiar(t.texto)) ? "ok" : "erro");
    window.setTimeout(() => setCopiado("ocioso"), 1600);
  };
  return (
    <div className="flex flex-col gap-2 border-t border-kumo-hairline px-4 py-3 first:border-t-0">
      <div className="flex items-center gap-3">
        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg bg-kumo-tint text-kumo-default">
          <Ic nome={iconeDoFicheiro(t.nome, t.mime)} tamanho={18} />
          <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-kumo-default text-kumo-base ring-2 ring-kumo-base">
            <Ic nome={t.sentido === "recebido" ? "paraBaixo" : "paraCima"} tamanho={9} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-kumo-default" title={t.nome}>
            {t.nome}
          </div>
          <div className="truncate text-xs text-kumo-subtle">
            {formatarTamanho(t.tamanho)} · {nomeDoAparelho(t.peerId, plataforma)}
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          {t.estado === "concluido" && <Ic nome="certo" tamanho={18} className="text-kumo-success" />}
          {t.estado === "falhou" && <Ic nome="fechar" tamanho={18} className="text-kumo-danger" />}
          {t.estado === "a-decorrer" && <BotaoDeIcone dica="Cancelar" icone="fechar" aoClicar={() => aoCancelar(t)} tamanho="xs" />}
        </div>
      </div>

      {t.texto && (
        <button type="button" onClick={copiarTexto} className="rounded-lg bg-kumo-tint px-3 py-2 text-left text-xs leading-snug text-kumo-default transition-colors hover:bg-kumo-fill/20" title="Tocar para copiar">
          <span className="line-clamp-2 break-words">{t.texto}</span>
        </button>
      )}

      {t.estado === "a-decorrer" && (
        <div className="flex flex-col gap-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-kumo-tint" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${t.nome}: ${pct} %`}>
            <div className="h-full rounded-full bg-kumo-brand transition-[width] duration-150" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs tabular-nums text-kumo-subtle">
            <span>{pct} %</span>
            <span className="truncate">{v > 0 ? `${formatarVelocidade(v)}${falta !== null ? ` · faltam ${formatarDuracaoMs(falta)}` : ""}` : "A começar…"}</span>
          </div>
        </div>
      )}

      {t.estado !== "a-decorrer" && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-kumo-subtle">
          <span className="min-w-0">
            {t.estado === "falhou" ? (t.erro === "cancelada" ? "Cancelada" : "Falhou") : `${t.sentido === "recebido" ? "Recebido" : "Enviado"} às ${hora(t.fim ?? t.inicio)}${t.fim && t.fim > t.inicio ? ` · demorou ${formatarDuracaoMs(t.fim - t.inicio)}` : ""}`}
          </span>
          <span className="flex flex-wrap items-center gap-1">
            {t.texto && (
              <Button variant="ghost" size="xs" icon={<Ic nome={copiado === "ok" ? "certo" : copiado === "erro" ? "aviso" : "copiar"} tamanho={13} />} onClick={copiarTexto}>
                {copiado === "ok" ? "Copiado" : copiado === "erro" ? "Não copiou" : "Copiar"}
              </Button>
            )}
            {ligacao && (
              <a href={ligacao} target="_blank" rel="noopener noreferrer" className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium text-kumo-default hover:bg-kumo-tint">
                <Ic nome="subida" tamanho={13} /> Abrir a ligação
              </a>
            )}
            {t.sentido === "recebido" && t.estado === "concluido" && t.ligacao && (
              <a href={t.ligacao} download={t.nome} className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium text-kumo-default hover:bg-kumo-tint">
                <Ic nome="transferir" tamanho={13} /> Guardar de novo
              </a>
            )}
            {t.sentido === "enviado" && t.estado === "concluido" && podeReenviar && (
              <Button
                variant="ghost"
                size="xs"
                icon={<Ic nome="papel" tamanho={13} />}
                disabled={aReenviar}
                onClick={async () => {
                  setAReenviar(true);
                  try {
                    await aoReenviar(t);
                  } finally {
                    setAReenviar(false);
                  }
                }}
              >
                Enviar outra vez
              </Button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

const LIMITE_VISIVEL = 6;

export function ListaDeTransferencias({ transferencias, aparelhos, pares, podeReenviar, aoReenviar, aoCancelar, vazio }: { transferencias: Transferencia[]; aparelhos: AparelhoLigado[]; pares: ParLembrado[]; podeReenviar: boolean; aoReenviar: (t: Transferencia) => void; aoCancelar: (t: Transferencia) => void; vazio: ReactNode }) {
  const [todas, setTodas] = useState(false);
  const [agora, setAgora] = useState(() => Date.now());
  const aCorrer = transferencias.some((t) => t.estado === "a-decorrer");
  useEffect(() => {
    if (!aCorrer) return;
    const id = window.setInterval(() => setAgora(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [aCorrer]);
  if (transferencias.length === 0) return <>{vazio}</>;
  const ordenadas = [...transferencias].reverse();
  const visiveis = todas ? ordenadas : ordenadas.slice(0, LIMITE_VISIVEL);
  return (
    <div className="flex flex-col">
      {visiveis.map((t) => (
        <LinhaDeTransferencia key={t.id} t={t} agora={agora} plataforma={aparelhos.find((a) => a.peerId === t.peerId)?.plataforma ?? pares.find((p) => p.peerId === t.peerId)?.platform} podeReenviar={podeReenviar} aoReenviar={aoReenviar} aoCancelar={aoCancelar} />
      ))}
      {ordenadas.length > LIMITE_VISIVEL && (
        <div className="flex justify-center border-t border-kumo-hairline px-4 py-2">
          <Button variant="ghost" size="sm" icon={<Ic nome={todas ? "cima" : "baixo"} tamanho={14} />} onClick={() => setTodas((v) => !v)}>
            {todas ? "Ver menos" : `Ver todas (${ordenadas.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}
