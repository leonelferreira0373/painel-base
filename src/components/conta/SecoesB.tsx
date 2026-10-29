// Definições da conta, parte 2: segurança (palavra-passe, dois passos, chaves de acesso, sessões), chaves pessoais de acesso e dados e privacidade.
"use client";

import { Badge, Banner, Button, Checkbox, Dialog, Empty, Input, Meter, Select } from "@cloudflare/kumo";
import { useState } from "react";
import { AMBITOS } from "@/dados/conta";
import { codigoTemporal, regrasSenha, segredoDe, senhaValida } from "@/lib/auth";
import { identificador, useConta } from "@/lib/conta";
import { useApp } from "@/lib/estado";
import { CampoSenha } from "../auth/CampoSenha";
import { RequisitosSenha } from "../auth/Paginas";
import { Dica } from "../Dica";
import { Esbatido } from "../Estados";
import { ICONES, Ic } from "../Icones";
import { CodigoDialog } from "./CodigoDialog";
import { BotaoCopiar, Cartao, Confirmar, dataHora, descarregar, haTempo, Interruptor, Linha, LinhaCampo, mascarar, soData } from "./Pecas";
import { SeletorPersonalizavel } from "../SeletorPersonalizavel";
import { TEMPO_LIMITE, VALIDADE } from "@/dados/personalizados";

function Janela({ aberto, aoMudar, titulo, children, largo = false }: { aberto: boolean; aoMudar: (v: boolean) => void; titulo: string; children: React.ReactNode; largo?: boolean }) {
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudar}>
      <Dialog size={largo ? "lg" : "base"} className="p-6">
        <div className="mb-3 flex items-start justify-between gap-4">
          <Dialog.Title className="text-lg font-semibold">{titulo}</Dialog.Title>
          <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
        </div>
        {children}
      </Dialog>
    </Dialog.Root>
  );
}

const aleatorio = (n: number) => {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => (x % 36).toString(36)).join("");
};

function AlterarSenha({ aberto, aoMudar }: { aberto: boolean; aoMudar: (v: boolean) => void }) {
  const { mudar } = useConta();
  const { avisar } = useApp();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [outra, setOutra] = useState("");
  const [terminar, setTerminar] = useState(true);
  const r = regrasSenha(nova);
  const pontos = Object.values(r).filter(Boolean).length + (nova.length >= 12 ? 1 : 0);
  const forca = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte", "Muito forte"][pontos];
  const igual = nova !== "" && nova === atual;
  const valida = !!atual && senhaValida(nova) && nova === outra && !igual;
  const fechar = (v: boolean) => {
    if (!v) (setAtual(""), setNova(""), setOutra(""));
    aoMudar(v);
  };
  return (
    <Janela aberto={aberto} aoMudar={fechar} titulo="Alterar a palavra-passe">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valida) return;
          mudar((c) => ({ senhaAlteradaEm: new Date().toISOString(), sessoes: terminar ? c.sessoes.filter((s) => s.atual) : c.sessoes }), terminar ? "Palavra-passe alterada; as outras sessões foram terminadas" : "Palavra-passe alterada");
          avisar("Palavra-passe alterada");
          fechar(false);
        }}
      >
        <div className="flex flex-col gap-4">
          <CampoSenha tamanho="base" label="Palavra-passe atual" autoComplete="current-password" value={atual} onValueChange={setAtual} />
          <CampoSenha tamanho="base" label="Nova palavra-passe" autoComplete="new-password" value={nova} onValueChange={setNova} error={igual ? "Tem de ser diferente da atual." : undefined} />
          {nova.length > 0 && (
            <div className="flex flex-col gap-2">
              <Meter label={`Força: ${forca}`} value={Math.min(100, (pontos / 5) * 100)} max={100} showValue={false} trackClassName="h-2.5" />
              <RequisitosSenha senha={nova} />
            </div>
          )}
          <CampoSenha tamanho="base" label="Repita a nova palavra-passe" autoComplete="new-password" value={outra} onValueChange={setOutra} error={outra && outra !== nova ? "As palavras-passe não coincidem." : undefined} />
          <Checkbox label="Terminar a sessão em todos os outros dispositivos" checked={terminar} onCheckedChange={(v) => setTerminar(!!v)} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
          <Button type="submit" variant="primary" disabled={!valida}>
            Alterar palavra-passe
          </Button>
        </div>
      </form>
    </Janela>
  );
}

const gerarCodigos = () => Array.from({ length: 8 }, () => `${aleatorio(4)}-${aleatorio(4)}`);

function CodigosRecuperacao({ codigos, aoFechar }: { codigos: string[] | null; aoFechar: () => void }) {
  const { avisar } = useApp();
  const texto = (codigos ?? []).join("\n");
  return (
    <Janela aberto={!!codigos} aoMudar={(v) => !v && aoFechar()} titulo="Códigos de recuperação">
      <p className="text-sm text-kumo-default">Guarde estes códigos num sítio seguro. Cada um serve uma só vez, se perder o acesso à aplicação autenticadora. Não voltam a aparecer.</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-kumo-tint p-3 font-mono text-sm">
        {(codigos ?? []).map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <BotaoCopiar texto={texto} rotulo="Copiar" dica="Copiar os códigos" />
        <Button variant="secondary" icon={ICONES.transferir} onClick={() => descarregar("codigos-de-recuperacao.txt", `${texto}\n`)}>
          Descarregar
        </Button>
        <Button variant="primary" onClick={aoFechar}>
          Guardei os códigos
        </Button>
      </div>
    </Janela>
  );
}

function ChaveDeAcesso({ aberto, aoMudar }: { aberto: boolean; aoMudar: (v: boolean) => void }) {
  const { mudar } = useConta();
  const [nome, setNome] = useState("Este dispositivo");
  return (
    <Janela aberto={aberto} aoMudar={aoMudar} titulo="Adicionar chave de acesso">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mudar((c) => ({ chavesAcesso: [...c.chavesAcesso, { id: identificador(), nome: nome.trim() || "Chave de acesso", criada: new Date().toISOString() }] }), `Chave de acesso «${nome.trim()}» adicionada`);
          aoMudar(false);
        }}
      >
        <p className="mb-4 text-sm text-kumo-default">Entra com a impressão digital, o rosto ou o bloqueio do aparelho, sem escrever a palavra-passe. Dê-lhe um nome para a reconhecer depois.</p>
        <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <div className="mt-6 flex justify-end gap-2">
          <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
          <Button type="submit" variant="primary" disabled={!nome.trim()}>
            Criar chave
          </Button>
        </div>
      </form>
    </Janela>
  );
}

export function SecaoSeguranca() {
  const { conta, mudar } = useConta();
  const { funcao, avisar } = useApp();
  const [senha, setSenha] = useState(false);
  const [reporSenha, setReporSenha] = useState(false);
  const [ativar, setAtivar] = useState(false);
  const [desligar, setDesligar] = useState(false);
  const [codigos, setCodigos] = useState<string[] | null>(null);
  const [novosCodigos, setNovosCodigos] = useState(false);
  const [chave, setChave] = useState(false);
  const [tirarChave, setTirarChave] = useState<string | null>(null);
  const segredo = segredoDe(funcao.id)
    .replace(/[^a-z0-9]/g, "")
    .toUpperCase()
    .padEnd(16, "X")
    .slice(0, 16)
    .match(/.{4}/g)!
    .join(" ");
  const outras = conta.sessoes.filter((s) => !s.atual);

  return (
    <>
      <Cartao titulo="Palavra-passe" dica="Use uma palavra-passe só para esta conta. Se a alterar, pode terminar as outras sessões de uma vez.">
        <Linha titulo="Palavra-passe" estado={`Alterada ${haTempo(conta.senhaAlteradaEm)}`}>
          <Button variant="secondary" icon={ICONES.senha} onClick={() => setSenha(true)}>
            Alterar palavra-passe
          </Button>
          <Button variant="ghost" onClick={() => setReporSenha(true)}>
            Repor por e-mail
          </Button>
        </Linha>
      </Cartao>

      <Cartao titulo="Verificação em dois passos" dica="Além da palavra-passe, pede um código de seis dígitos que muda a cada 30 segundos.">
        <Linha titulo="Aplicação autenticadora" estado={conta.doisFatores ? "Ativa: pede um código sempre que inicia sessão." : "Desligada: só pede a palavra-passe."}>
          <Interruptor marcado={conta.doisFatores} aoMudar={(v) => (v ? setAtivar(true) : setDesligar(true))} rotulo="Verificação em dois passos" />
        </Linha>
        <Linha titulo="Códigos de recuperação" dica="Servem para entrar se perder a aplicação autenticadora. Cada um só funciona uma vez." estado={conta.doisFatores ? `${conta.codigosRecuperacao} por usar` : "Disponíveis depois de ativar os dois passos."}>
          <Button variant="secondary" disabled={!conta.doisFatores} onClick={() => setNovosCodigos(true)}>
            Gerar novos códigos
          </Button>
        </Linha>
      </Cartao>

      <Cartao titulo="Chaves de acesso" dica="Entram com a impressão digital, o rosto ou o bloqueio do aparelho, e não podem ser roubadas por um site falso." acoes={<Button size="sm" variant="secondary" icon={ICONES.mais} onClick={() => setChave(true)}>Adicionar</Button>}>
        {conta.chavesAcesso.length === 0 && <Linha titulo="Ainda não tem chaves de acesso" />}
        {conta.chavesAcesso.map((c) => (
          <Linha key={c.id} titulo={c.nome} estado={`Criada em ${soData(c.criada)}`}>
            <Button variant="ghost" icon={ICONES.lixo} onClick={() => setTirarChave(c.id)}>
              Remover
            </Button>
          </Linha>
        ))}
      </Cartao>

      <Cartao titulo="Sessões abertas" dica="Os aparelhos onde a conta está aberta agora. Termine os que não reconhece." acoes={outras.length > 0 ? <Button size="sm" variant="secondary" onClick={() => mudar((c) => ({ sessoes: c.sessoes.filter((s) => s.atual) }), "Todas as outras sessões terminadas")}>Terminar todas as outras</Button> : undefined}>
        {conta.sessoes.map((s) => (
          <Linha
            key={s.id}
            titulo={
              <span className="inline-flex items-center gap-2">
                <Ic nome="dispositivos" tamanho={16} className="text-kumo-subtle" />
                {s.dispositivo}
                {s.atual && <Badge variant="success">Esta sessão</Badge>}
              </span>
            }
            estado={`${s.local} · ${s.atual ? "agora" : haTempo(s.ultimoAcesso)}`}
          >
            {!s.atual && (
              <Button variant="ghost" onClick={() => mudar((c) => ({ sessoes: c.sessoes.filter((x) => x.id !== s.id) }), `Sessão terminada: ${s.dispositivo}`)}>
                Terminar
              </Button>
            )}
          </Linha>
        ))}
      </Cartao>

      <Cartao titulo="Proteção da conta">
        <Linha titulo="Avisar-me de inícios de sessão novos" dica="Enviamos um aviso quando a conta é aberta num aparelho ou num sítio que nunca usou.">
          <Interruptor marcado={conta.alertaInicio} aoMudar={(v) => mudar({ alertaInicio: v }, v ? "Avisos de início de sessão ligados" : "Avisos de início de sessão desligados")} rotulo="Avisar-me de inícios de sessão novos" />
        </Linha>
        <Linha titulo="Terminar a sessão por inatividade" dica="Depois deste tempo sem fazer nada, o painel pede a palavra-passe outra vez.">
          <SeletorPersonalizavel valor={conta.tempoLimite} opcoes={TEMPO_LIMITE.opcoes} personalizado={TEMPO_LIMITE.personalizado} aoMudar={(v) => mudar({ tempoLimite: v }, "Tempo limite da sessão alterado")} rotulo="Tempo limite" className="w-44" />
        </Linha>
        <Linha titulo="Pedir a palavra-passe em ações sensíveis" dica="Mudar o e-mail, apagar dados ou criar chaves de acesso pede a palavra-passe outra vez.">
          <Interruptor marcado={conta.senhaParaSensiveis} aoMudar={(v) => mudar({ senhaParaSensiveis: v })} rotulo="Pedir a palavra-passe em ações sensíveis" />
        </Linha>
      </Cartao>

      <AlterarSenha aberto={senha} aoMudar={setSenha} />
      <Confirmar aberto={reporSenha} aoMudar={setReporSenha} titulo="Repor a palavra-passe por e-mail" texto={<>Vamos enviar uma ligação de reposição para <b>{mascarar(conta.email)}</b>. A palavra-passe atual continua a funcionar até a usar.</>} rotuloAcao="Enviar ligação" aoConfirmar={() => (mudar({}, "Ligação de reposição da palavra-passe enviada"), avisar("Ligação enviada (simulação)"))} />
      <CodigoDialog
        aberto={ativar}
        aoMudar={setAtivar}
        titulo="Ative a verificação em dois passos"
        texto="Abra a aplicação autenticadora, adicione uma conta com esta chave e escreva o código que ela mostra."
        extra={
          <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-kumo-tint px-3 py-2">
            <code className="text-sm font-medium tracking-wider">{segredo}</code>
            <BotaoCopiar texto={segredo.replace(/\s/g, "")} dica="Copiar a chave" variante="ghost" tamanho="sm" quadrado />
          </div>
        }
        codigo={() => codigoTemporal(segredoDe(funcao.id))}
        rotuloAcao="Ativar"
        aoConfirmar={() => {
          mudar({ doisFatores: true, codigosRecuperacao: 8 }, "Verificação em dois passos ativada");
          setCodigos(gerarCodigos());
        }}
      />
      <Confirmar aberto={desligar} aoMudar={setDesligar} titulo="Desligar a verificação em dois passos" perigo texto="A conta passa a pedir só a palavra-passe e os códigos de recuperação deixam de valer." rotuloAcao="Desligar" aoConfirmar={() => mudar({ doisFatores: false, codigosRecuperacao: 0 }, "Verificação em dois passos desligada")} />
      <Confirmar aberto={novosCodigos} aoMudar={setNovosCodigos} titulo="Gerar novos códigos" texto="Os códigos que tem agora deixam de funcionar." rotuloAcao="Gerar" aoConfirmar={() => (mudar({ codigosRecuperacao: 8 }, "Códigos de recuperação gerados de novo"), setCodigos(gerarCodigos()))} />
      <CodigosRecuperacao codigos={codigos} aoFechar={() => setCodigos(null)} />
      <ChaveDeAcesso aberto={chave} aoMudar={setChave} />
      <Confirmar aberto={!!tirarChave} aoMudar={(v) => !v && setTirarChave(null)} titulo="Remover a chave de acesso" perigo texto="Deixa de poder entrar com ela." rotuloAcao="Remover" aoConfirmar={() => mudar((c) => ({ chavesAcesso: c.chavesAcesso.filter((x) => x.id !== tirarChave) }), "Chave de acesso removida")} />
    </>
  );
}

export function SecaoTokens() {
  const { conta, mudar } = useConta();
  const { avisar } = useApp();
  const [criar, setCriar] = useState(false);
  const [nome, setNome] = useState("");
  const [validade, setValidade] = useState("90");
  const [ambitos, setAmbitos] = useState<string[]>(["ler"]);
  const [novo, setNovo] = useState<string | null>(null);
  const [revogar, setRevogar] = useState<string | null>(null);
  const alternar = (id: string, v: boolean) => setAmbitos((a) => (v ? [...a, id] : a.filter((x) => x !== id)));

  return (
    <>
      <Cartao titulo="Chaves de acesso pessoais" dica="Servem para ligar outras aplicações à sua conta, com as permissões e a validade que escolher. A chave completa só aparece uma vez." acoes={<Button size="sm" variant="primary" icon={ICONES.mais} onClick={() => (setNome(""), setAmbitos(["ler"]), setValidade("90"), setCriar(true))}>Criar chave</Button>}>
        {conta.tokens.length === 0 ? (
          <Empty size="sm" icon={<Ic nome="chave" tamanho={32} />} title="Ainda não criou nenhuma chave" />
        ) : (
          conta.tokens.map((t) => (
            <Linha
              key={t.id}
              titulo={
                <span className="inline-flex flex-wrap items-center gap-2">
                  {t.nome}
                  {t.ambitos.map((a) => (
                    <Badge key={a} variant="outline">
                      {AMBITOS.find((x) => x.id === a)?.rotulo ?? a}
                    </Badge>
                  ))}
                </span>
              }
              estado={`${t.prefixo}…${t.fim} · criada ${haTempo(t.criada)} · ${t.expira ? `expira em ${soData(t.expira)}` : "sem validade"} · ${t.ultimoUso ? `usada ${haTempo(t.ultimoUso)}` : "nunca usada"}`}
            >
              <Button variant="ghost" icon={ICONES.lixo} onClick={() => setRevogar(t.id)}>
                Revogar
              </Button>
            </Linha>
          ))
        )}
      </Cartao>

      <Janela aberto={criar} aoMudar={setCriar} titulo="Criar chave de acesso">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const segredo = `pk_${aleatorio(40)}`;
            const expira = validade === "nunca" ? null : new Date(Date.now() + Number(validade) * 86_400_000).toISOString();
            mudar((c) => ({ tokens: [...c.tokens, { id: identificador(), nome: nome.trim(), prefixo: segredo.slice(0, 8), fim: segredo.slice(-4), criada: new Date().toISOString(), expira, ambitos, ultimoUso: null }] }), `Chave de acesso «${nome.trim()}» criada`);
            setCriar(false);
            setNovo(segredo);
          }}
        >
          <div className="flex flex-col gap-4">
            <Input label="Nome" placeholder="Por exemplo, folha de cálculo do mês" value={nome} onChange={(e) => setNome(e.target.value)} />
            <SeletorPersonalizavel label="Validade" valor={validade} opcoes={VALIDADE.opcoes} personalizado={VALIDADE.personalizado} aoMudar={setValidade} />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">O que pode fazer</span>
              {AMBITOS.map((a) => (
                <Checkbox key={a.id} label={a.rotulo} labelTooltip={a.dica} checked={ambitos.includes(a.id)} onCheckedChange={(v) => alternar(a.id, !!v)} />
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
            <Button type="submit" variant="primary" disabled={!nome.trim() || ambitos.length === 0}>
              Criar chave
            </Button>
          </div>
        </form>
      </Janela>
      <Janela aberto={!!novo} aoMudar={(v) => !v && setNovo(null)} titulo="A sua nova chave">
        <Banner variant="alert" title="Copie-a agora" description="Não volta a ser mostrada. Se a perder, revogue-a e crie outra." />
        <div className="mt-4 break-all rounded-lg bg-kumo-tint px-3 py-2 font-mono text-sm">{novo}</div>
        <div className="mt-6 flex justify-end gap-2">
          <BotaoCopiar texto={novo ?? ""} rotulo="Copiar" dica="Copiar a chave" />
          <Button variant="primary" onClick={() => setNovo(null)}>
            Já a guardei
          </Button>
        </div>
      </Janela>
      <Confirmar aberto={!!revogar} aoMudar={(v) => !v && setRevogar(null)} titulo="Revogar a chave" perigo texto="As aplicações que a usam deixam de conseguir entrar na sua conta." rotuloAcao="Revogar" aoConfirmar={() => mudar((c) => ({ tokens: c.tokens.filter((t) => t.id !== revogar) }), "Chave de acesso revogada")} />
    </>
  );
}

export function SecaoDados() {
  const { conta, mudar, repor } = useConta();
  const { avisar } = useApp();
  const [limpar, setLimpar] = useState(false);
  const [reposicao, setReposicao] = useState(false);
  const [eliminar, setEliminar] = useState(false);
  const [cancelar, setCancelar] = useState(false);

  const limparLocais = () => {
    try {
      Object.keys(window.localStorage)
        .filter((k) => /^painel\.(recentes|fixados|inicio|menu)/.test(k))
        .forEach((k) => window.localStorage.removeItem(k));
    } catch {
      /* sem armazenamento */
    }
    window.dispatchEvent(new Event("painel:menu"));
    mudar({}, "Dados locais do menu apagados");
    avisar("Recentes, fixados e cartões ocultos apagados");
  };

  return (
    <>
      <Cartao titulo="Os meus dados" dica="Tudo o que o painel guarda sobre esta conta fica neste navegador. Pode levá-lo consigo em qualquer altura.">
        <Linha titulo="Descarregar os meus dados" estado="Um ficheiro JSON com o perfil, as definições, os lembretes e a atividade.">
          <Button variant="secondary" icon={ICONES.transferir} onClick={() => (descarregar("os-meus-dados.json", JSON.stringify({ ...conta, exportadoEm: new Date().toISOString() }, null, 2), "application/json"), mudar({}, "Dados da conta descarregados"))}>
            Descarregar
          </Button>
        </Linha>
        <Linha titulo="Apagar recentes, fixados e cartões ocultos" estado="Limpa a memória do menu e da página inicial neste navegador.">
          <Button variant="secondary" icon={ICONES.lixo} onClick={() => setLimpar(true)}>
            Apagar
          </Button>
        </Linha>
        <Linha titulo="Repor as definições desta conta" estado="Volta ao que a conta tinha no início. Não apaga ficheiros analisados.">
          <Button variant="secondary" icon={ICONES.repor} onClick={() => setReposicao(true)}>
            Repor
          </Button>
        </Linha>
      </Cartao>

      <Cartao titulo="Atividade da conta" dica="O que mudou na sua conta e quando.">
        <Esbatido className="sem-barra max-h-[360px] overflow-y-auto">
          {conta.atividade.map((a) => (
            <Linha key={a.id} titulo={a.texto} estado={`${dataHora(a.quando)} · ${haTempo(a.quando)}`} />
          ))}
        </Esbatido>
      </Cartao>

      <Cartao titulo="Eliminar a conta" perigo>
        {conta.eliminacao ? (
          <LinhaCampo>
            <Banner variant="alert" title={`Eliminação agendada para ${soData(conta.eliminacao)}`} description="Até lá a conta continua ativa e pode cancelar o pedido." action={<Button size="sm" onClick={() => setCancelar(true)}>Cancelar eliminação</Button>} />
          </LinhaCampo>
        ) : (
          <Linha titulo="Pedir a eliminação da conta" estado="Fica 14 dias em espera antes de ser apagada, e pode desistir nesse tempo.">
            <Button variant="destructive" icon={ICONES.lixo} onClick={() => setEliminar(true)}>
              Eliminar conta
            </Button>
          </Linha>
        )}
      </Cartao>

      <Confirmar aberto={limpar} aoMudar={setLimpar} titulo="Apagar a memória do menu" texto="As páginas recentes, as fixadas e os cartões que ocultou na página inicial voltam ao início." rotuloAcao="Apagar" aoConfirmar={limparLocais} />
      <Confirmar aberto={reposicao} aoMudar={setReposicao} titulo="Repor as definições" texto="As notificações, os lembretes, a fotografia e as preferências desta conta voltam ao início." rotuloAcao="Repor" perigo aoConfirmar={() => (repor(), avisar("Definições repostas"))} />
      <Confirmar aberto={eliminar} aoMudar={setEliminar} titulo="Eliminar a conta" perigo escrever="ELIMINAR" texto="A conta fica em espera durante 14 dias e depois é apagada, com os lembretes, as chaves e a atividade. Pode cancelar neste período." rotuloAcao="Pedir eliminação" aoConfirmar={() => mudar({ eliminacao: new Date(Date.now() + 14 * 86_400_000).toISOString() }, "Eliminação da conta pedida")} />
      <Confirmar aberto={cancelar} aoMudar={setCancelar} titulo="Cancelar a eliminação" texto="A conta continua como está." rotuloAcao="Cancelar eliminação" aoConfirmar={() => mudar({ eliminacao: undefined }, "Eliminação da conta cancelada")} />
    </>
  );
}
