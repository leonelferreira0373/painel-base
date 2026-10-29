// «Convidar para o painel», como o convite da Cloudflare mas com o controlo de acesso à vista: o e-mail (com sugestões), o acesso (uma função pronta ou «Personalizado») e, por baixo, os interruptores de tudo o que a pessoa pode ver e editar, área a área e módulo a módulo; ligar ou desligar um interruptor passa o acesso a «Personalizado». Em baixo, os membros que já têm acesso.
"use client";

import { Button, Dialog, Input, InputArea, Select } from "@cloudflare/kumo";
import { useMemo, useState } from "react";
import { FUNCOES, emailDe, lerFuncoesPersonalizadas } from "@/dados/rbac";
import { erroDoConvite, type Convite } from "@/lib/convites";
import { alternarEditar, alternarModulo, alternarVer, AREAS_COM_ACESSO, matrizDaFuncao, matrizesIguais, resumoDeAcesso, textoDoResumo, todasAsAreas, type MatrizDePermissoes } from "@/lib/permissoes";
import { Avatar } from "../Avatar";
import { Interruptor } from "../conta/Pecas";
import { Ic, ICONES } from "../Icones";

const PERSONALIZADO = "personalizado";

export interface DadosDoConvite {
  email: string;
  /** O identificador do cargo que já existe, ou `null` quando é um cargo novo. */
  funcao: string | null;
  /** O nome do cargo novo (só quando `funcao` é `null`). */
  cargo: string;
  permissoes: MatrizDePermissoes;
  mensagem: string;
}

export function ConvidarPessoa({ aberto, aoMudar, existentes, aoConvidar }: { aberto: boolean; aoMudar: (v: boolean) => void; existentes: Convite[]; aoConvidar: (d: DadosDoConvite) => void }) {
  const [email, setEmail] = useState("");
  const [focado, setFocado] = useState(false);
  const [escolha, setEscolha] = useState<string>(FUNCOES[2]?.id ?? FUNCOES[0].id);
  const [permissoes, setPermissoes] = useState<MatrizDePermissoes>(() => matrizDaFuncao(FUNCOES[2] ?? FUNCOES[0]));
  const [mensagem, setMensagem] = useState("");
  const [nomeDoCargo, setNomeDoCargo] = useState("");
  const [abertas, setAbertas] = useState<Record<string, boolean>>({});

  const sugestoes = useMemo(() => {
    const q = email.trim().toLowerCase();
    const conhecidos = [...FUNCOES.map((f) => ({ email: emailDe(f), nome: f.pessoa })), ...existentes.map((c) => ({ email: c.email, nome: c.email.split("@")[0] }))];
    const vistos = new Set<string>();
    return conhecidos.filter((c) => (!q || c.email.includes(q) || c.nome.toLowerCase().includes(q)) && !vistos.has(c.email) && vistos.add(c.email)).slice(0, 4);
  }, [email, existentes]);

  // os cargos que já existem: os do painel e os que se criaram ao convidar
  const cargos = useMemo(() => [...FUNCOES, ...lerFuncoesPersonalizadas().filter((p) => !FUNCOES.some((f) => f.id === p.id))], [aberto]); // eslint-disable-line react-hooks/exhaustive-deps
  const mudarFuncao = (id: string) => {
    setEscolha(id);
    setNomeDoCargo("");
    const f = cargos.find((x) => x.id === id);
    if (f) setPermissoes(matrizDaFuncao(f));
  };
  /** Mexer num interruptor: se já não é igual a nenhum cargo, passa a ser um cargo novo. */
  const mudar = (m: MatrizDePermissoes) => {
    setPermissoes(m);
    const igual = cargos.find((f) => matrizesIguais(m, matrizDaFuncao(f)));
    setEscolha(igual ? igual.id : PERSONALIZADO);
  };

  const resumo = resumoDeAcesso(permissoes);
  const cargoNovo = escolha === PERSONALIZADO;
  const nome = nomeDoCargo.trim();
  const erroDoCargo = !cargoNovo ? null : !nome ? "Dê um nome ao cargo." : nome.length > 40 ? "O nome tem no máximo 40 letras." : cargos.some((c) => c.rotulo.toLowerCase() === nome.toLowerCase()) ? "Já existe um cargo com este nome." : null;
  const erro = erroDoConvite(email, escolha, existentes) ?? erroDoCargo ?? (resumo.areasVistas === 0 ? "Ligue pelo menos uma área." : null);
  const fechar = () => aoMudar(false);

  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size="lg" className="flex max-h-[calc(100dvh-3rem)] flex-col overflow-hidden p-0">
        <div className="flex shrink-0 items-center justify-between gap-4 px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
          <Dialog.Title className="min-w-0 truncate text-lg font-semibold">Convidar para o painel</Dialog.Title>
          <Dialog.Close render={(p) => <Button {...p} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-5 pb-4 sm:px-6">
          <div className="relative flex flex-col gap-1.5">
            <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setFocado(true)} onBlur={() => window.setTimeout(() => setFocado(false), 120)} placeholder="nome@empresa.pt" autoComplete="off" autoFocus className="w-full" />
            {focado && sugestoes.length > 0 && email.trim() !== sugestoes[0]?.email && (
              <ul role="listbox" aria-label="Sugestões" className="m-0 flex list-none flex-col rounded-xl bg-kumo-base p-1.5 shadow-(--elevacao-popup) ring ring-kumo-line">
                {sugestoes.map((s) => (
                  <li key={s.email}>
                    <button type="button" role="option" aria-selected={false} onMouseDown={(e) => e.preventDefault()} onClick={() => setEmail(s.email)} className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-kumo-tint">
                      <Avatar nome={s.nome} tamanho={26} />
                      <span className="truncate">{s.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {email && erro && <p className="text-sm text-kumo-danger">{erro}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Select label="Cargo" className="w-full min-w-0" value={escolha} onValueChange={(v) => (String(v) === PERSONALIZADO ? setEscolha(PERSONALIZADO) : mudarFuncao(String(v)))} items={{ ...Object.fromEntries(cargos.map((f) => [f.id, f.rotulo])), [PERSONALIZADO]: "Novo cargo…" }} />
            {cargoNovo && <Input label="Nome do cargo" value={nomeDoCargo} onChange={(e) => setNomeDoCargo(e.target.value)} placeholder="Ex.: Gestor de frota" maxLength={40} autoComplete="off" error={nomeDoCargo ? (erroDoCargo ?? undefined) : undefined} className="w-full" />}
            <p className="text-sm text-kumo-subtle">{textoDoResumo(resumo)}</p>
          </div>

          <section aria-label="Permissões" className="flex shrink-0 flex-col overflow-hidden rounded-xl ring ring-kumo-line">
            <div className="flex items-center justify-between gap-3 bg-kumo-recessed/60 px-4 py-2.5">
              <h3 className="text-sm font-medium">O que pode fazer</h3>
              <span className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => mudar(todasAsAreas(true, true))}>
                  Ligar tudo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => mudar(todasAsAreas(false, false))}>
                  Desligar tudo
                </Button>
              </span>
            </div>
            {AREAS_COM_ACESSO.map((a) => {
              const p = permissoes[a.id] ?? { ver: false, editar: false, fechados: [] };
              const expandida = !!abertas[a.id];
              const modulos = a.modulos;
              return (
                <div key={a.id} className="border-t border-kumo-hairline first:border-t-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
                    <button type="button" aria-expanded={expandida} onClick={() => setAbertas((x) => ({ ...x, [a.id]: !x[a.id] }))} disabled={modulos.length <= 1} className="flex min-w-0 flex-1 basis-full cursor-pointer items-center gap-2 text-left text-sm font-medium disabled:cursor-default sm:basis-0">
                      <Ic nome="seta" tamanho={13} className={`shrink-0 text-kumo-subtle transition-transform duration-200 ${modulos.length <= 1 ? "opacity-0" : expandida ? "rotate-90" : ""}`} />
                      <Ic nome={a.icone} tamanho={15} className="shrink-0 text-kumo-subtle" />
                      <span className="min-w-0 break-words">{a.rotulo}</span>
                      {p.ver && p.fechados.length > 0 && <span className="shrink-0 text-xs font-normal text-kumo-subtle">{p.fechados.length} fechado{p.fechados.length === 1 ? "" : "s"}</span>}
                    </button>
                    <label className="inline-flex items-center gap-2 text-sm text-kumo-subtle">
                      Ver
                      <Interruptor marcado={p.ver} aoMudar={(v) => mudar(alternarVer(permissoes, a.id, v))} rotulo={`${a.rotulo}: ver`} />
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-kumo-subtle">
                      Editar
                      <Interruptor marcado={p.editar} aoMudar={(v) => mudar(alternarEditar(permissoes, a.id, v))} rotulo={`${a.rotulo}: editar`} />
                    </label>
                  </div>
                  {expandida && modulos.length > 1 && (
                    <ul className="m-0 flex list-none flex-col gap-0.5 bg-kumo-recessed/40 px-4 py-2 pl-11">
                      {modulos.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-3 py-1 text-sm">
                          <span className="min-w-0 truncate">{m.rotulo}</span>
                          <Interruptor marcado={p.ver && !p.fechados.includes(m.id)} desativado={!p.ver} aoMudar={(v) => mudar(alternarModulo(permissoes, a.id, m.id, v))} rotulo={`${m.rotulo}: aberto`} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>

          <InputArea label="Mensagem (opcional)" value={mensagem} onValueChange={setMensagem} minRows={2} autoResize />

          <section aria-label="Membros com acesso" className="flex shrink-0 flex-col gap-2">
            <h3 className="text-sm font-medium">Membros com acesso</h3>
            <ul className="m-0 flex list-none flex-col p-0">
              {FUNCOES.map((f) => {
                const r = resumoDeAcesso(matrizDaFuncao(f));
                return (
                  <li key={f.id} className="flex items-center gap-3 border-t border-kumo-hairline py-2 first:border-t-0">
                    <Avatar nome={f.pessoa} tamanho={30} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.pessoa}</span>
                      <span className="block truncate text-xs text-kumo-subtle">{emailDe(f)}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-kumo-subtle">
                      <span className="block font-medium text-kumo-default">{f.rotulo}</span>
                      <span className="block">
                        Vê {r.areasVistas} · edita {r.areasEditadas}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-kumo-hairline px-5 py-3 sm:px-6">
          <Button variant="secondary" onClick={fechar}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!!erro}
            onClick={() => {
              aoConvidar({ email, funcao: escolha === PERSONALIZADO ? null : escolha, cargo: nome, permissoes, mensagem });
              setEmail("");
              setNomeDoCargo("");
              setMensagem("");
              fechar();
            }}
          >
            Enviar convite
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
