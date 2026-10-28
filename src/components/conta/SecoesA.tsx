// Definições da conta, parte 1: perfil (nome, fotografia, assinatura, formatos), aparência (tema, movimento, dicas, barra) e e-mail e telefone.
"use client";

import { Badge, Banner, Button, Dialog, Input, InputArea, Select } from "@cloudflare/kumo";
import { useEffect, useRef, useState } from "react";
import { AREAS } from "@/dados/estrutura";
import { ATALHOS, FORMATOS_DATA, FUSOS } from "@/dados/conta";
import { podeVer } from "@/dados/rbac";
import { useConta } from "@/lib/conta";
import { useApp } from "@/lib/estado";
import { useTema, type Tema } from "@/lib/tema";
import { Avatar } from "../Avatar";
import { ICONES, Ic } from "../Icones";
import { CodigoDialog } from "./CodigoDialog";
import { Cartao, codigoSimulado, emailValido, Interruptor, Linha, LinhaCampo, mascarar } from "./Pecas";

const itens = (lista: { id: string; rotulo: string }[]) => Object.fromEntries(lista.map((o) => [o.id, o.rotulo]));

export function SecaoPerfil() {
  const { conta, mudar } = useConta();
  const { funcao, avisar } = useApp();
  const [nome, setNome] = useState(conta.nome);
  const [assinatura, setAssinatura] = useState(conta.assinatura);
  const [fuso, setFuso] = useState(conta.fuso);
  const [formato, setFormato] = useState(conta.formatoData);
  const [semana, setSemana] = useState<string>(conta.semana);
  useEffect(() => {
    setNome(conta.nome);
    setAssinatura(conta.assinatura);
    setFuso(conta.fuso);
    setFormato(conta.formatoData);
    setSemana(conta.semana);
  }, [conta.nome, conta.assinatura, conta.fuso, conta.formatoData, conta.semana]);
  const alterado = nome !== conta.nome || assinatura !== conta.assinatura || fuso !== conta.fuso || formato !== conta.formatoData || semana !== conta.semana;
  const ficheiro = useRef<HTMLInputElement>(null);

  const carregarFoto = (f: File) => {
    if (!f.type.startsWith("image/")) return avisar("Escolha um ficheiro de imagem.");
    if (f.size > 8 * 1024 * 1024) return avisar("A imagem tem mais de 8 MB.");
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const lado = 256;
      const tela = document.createElement("canvas");
      tela.width = lado;
      tela.height = lado;
      const m = Math.min(img.width, img.height);
      tela.getContext("2d")!.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, lado, lado);
      mudar({ foto: tela.toDataURL("image/jpeg", 0.88) }, "Fotografia de perfil atualizada");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => avisar("Não consegui ler essa imagem.");
    img.src = url;
  };

  const areas = AREAS.filter((a) => podeVer(funcao, a.id));
  return (
    <>
      <Cartao titulo="Fotografia" dica="Aparece no menu, nas notas e nos pedidos que trata. Sem fotografia, aparecem as suas iniciais.">
        <Linha titulo={<Avatar foto={conta.foto} nome={conta.nome} tamanho={56} />} estado={conta.foto ? "A sua fotografia" : "Sem fotografia: mostramos as suas iniciais."}>
          <input ref={ficheiro} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && carregarFoto(e.target.files[0])} />
          <Button variant="secondary" icon={ICONES.enviar} onClick={() => ficheiro.current?.click()}>
            Carregar fotografia
          </Button>
          <Button variant="ghost" icon={ICONES.lixo} disabled={!conta.foto} onClick={() => mudar({ foto: undefined }, "Fotografia de perfil removida")}>
            Remover
          </Button>
        </Linha>
      </Cartao>

      <Cartao titulo="Dados pessoais" dica="Só afetam a sua conta.">
        <LinhaCampo>
          <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          <InputArea label="Assinatura dos e-mails" labelTooltip="Entra no fim dos e-mails que o painel envia em seu nome." value={assinatura} onValueChange={setAssinatura} minRows={2} autoResize />
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Fuso horário" value={fuso} onValueChange={(v) => setFuso(String(v))} items={itens(FUSOS)} />
            <Select label="Formato da data" value={formato} onValueChange={(v) => setFormato(String(v))} items={itens(FORMATOS_DATA)} />
            <Select label="A semana começa à" value={semana} onValueChange={(v) => setSemana(String(v))} items={{ segunda: "Segunda-feira", domingo: "Domingo" }} />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={!alterado}
              onClick={() => {
                setNome(conta.nome);
                setAssinatura(conta.assinatura);
                setFuso(conta.fuso);
                setFormato(conta.formatoData);
                setSemana(conta.semana);
              }}
            >
              Descartar
            </Button>
            <Button variant="primary" icon={ICONES.guardar} disabled={!alterado || !nome.trim()} onClick={() => (mudar({ nome: nome.trim(), assinatura, fuso, formatoData: formato, semana: semana as "segunda" | "domingo" }, "Dados pessoais atualizados"), avisar("Alterações guardadas"))}>
              Guardar alterações
            </Button>
          </div>
        </LinhaCampo>
      </Cartao>

      <Cartao titulo="Função e acessos" dica="A função decide o que vê e o que pode alterar. Só uma pessoa administradora a muda.">
        <Linha titulo="Função no painel">
          <Badge variant="secondary">{funcao.rotulo}</Badge>
        </Linha>
        <Linha titulo="Áreas a que tem acesso">
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            {areas.map((a) => (
              <Badge key={a.id} variant="outline">
                {a.rotulo}
              </Badge>
            ))}
          </div>
        </Linha>
      </Cartao>
    </>
  );
}

const PREVIA: Record<Tema, string> = { claro: "bg-white", escuro: "bg-neutral-900", sistema: "bg-gradient-to-r from-white from-50% to-neutral-900 to-50%" };

export function SecaoAparencia() {
  const { conta, mudar } = useConta();
  const { tema, definir } = useTema();
  return (
    <>
      <Cartao titulo="Tema" dica="Muda as cores do painel inteiro. «Igual ao sistema» segue o modo claro ou escuro do seu aparelho.">
        <LinhaCampo>
          <div className="grid grid-cols-3 gap-3">
            {(["claro", "escuro", "sistema"] as Tema[]).map((t) => (
              <button key={t} type="button" aria-pressed={tema === t} onClick={() => (definir(t), mudar({}, `Tema alterado para «${t}»`))} className={`flex flex-col gap-2 rounded-lg p-2 text-left ring transition-shadow ${tema === t ? "ring-2 ring-kumo-brand" : "ring-kumo-line hover:ring-kumo-interact"}`}>
                <span className={`flex h-14 w-full flex-col gap-1.5 rounded-md border border-kumo-line p-2 ${PREVIA[t]}`}>
                  <span className="h-1.5 w-1/2 rounded-full bg-neutral-400/70" />
                  <span className="h-1.5 w-3/4 rounded-full bg-neutral-400/50" />
                  <span className="mt-auto h-2 w-6 rounded-sm bg-[var(--color-kumo-brand)]" />
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <Ic nome={t === "claro" ? "sol" : t === "escuro" ? "lua" : "monitor"} tamanho={14} />
                  {t === "claro" ? "Claro" : t === "escuro" ? "Escuro" : "Igual ao sistema"}
                </span>
              </button>
            ))}
          </div>
        </LinhaCampo>
      </Cartao>

      <Cartao titulo="Comportamento">
        <Linha titulo="Dicas ao passar o rato" dica="Os balões que explicam os estados, os botões e os números.">
          <Interruptor marcado={conta.dicas} aoMudar={(v) => mudar({ dicas: v }, v ? "Dicas ligadas" : "Dicas desligadas")} rotulo="Dicas ao passar o rato" />
        </Linha>
        <Linha titulo="Reduzir o movimento" dica="Tira animações, transições e o brilho dos esqueletos de carregamento.">
          <Interruptor marcado={conta.movimentoReduzido} aoMudar={(v) => mudar({ movimentoReduzido: v }, v ? "Movimento reduzido ligado" : "Movimento reduzido desligado")} rotulo="Reduzir o movimento" />
        </Linha>
        <Linha titulo="Barra lateral aberta ao entrar" dica="Quando está desligada, a barra fica recolhida e abre ao passar o rato pelos ícones.">
          <Interruptor marcado={conta.barraAberta} aoMudar={(v) => mudar({ barraAberta: v })} rotulo="Barra lateral aberta ao entrar" />
        </Linha>
      </Cartao>

      <Cartao titulo="Atalhos de teclado">
        {ATALHOS.map((a) => (
          <Linha key={a.teclas} titulo={a.acao}>
            <kbd className="rounded bg-kumo-tint px-2 py-1 text-xs font-medium text-kumo-default">{a.teclas}</kbd>
          </Linha>
        ))}
      </Cartao>
    </>
  );
}

function AlterarEmail({ aberto, aoMudar }: { aberto: boolean; aoMudar: (v: boolean) => void }) {
  const { conta, mudar } = useConta();
  const { avisar } = useApp();
  const [novo, setNovo] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [passo, setPasso] = useState<"dados" | "codigo">("dados");
  useEffect(() => {
    if (aberto) {
      setNovo("");
      setSenha("");
      setPasso(conta.emailPendente ? "codigo" : "dados");
      setCodigo(codigoSimulado());
    }
  }, [aberto, conta.emailPendente]);
  const email = novo.trim().toLowerCase();
  const erro = novo && !emailValido(novo) ? "Esse e-mail não parece certo." : email === conta.email ? "Já é o e-mail da conta." : undefined;
  const destino = conta.emailPendente ?? email;
  return (
    <>
      <Dialog.Root open={aberto && passo === "dados"} onOpenChange={aoMudar}>
        <Dialog size="base" className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mudar({ emailPendente: email }, `Pedido para mudar o e-mail para ${email}`);
              setPasso("codigo");
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <Dialog.Title className="text-lg font-semibold">Alterar o e-mail da conta</Dialog.Title>
              <Dialog.Close render={(props) => <Button {...props} variant="ghost" shape="square" icon={ICONES.fechar} aria-label="Fechar" />} />
            </div>
            <p className="text-sm text-kumo-default">Continua a ser a mesma conta: o histórico, as permissões, os lembretes e as definições mantêm-se. Só muda o endereço com que entra e para onde enviamos os e-mails.</p>
            <div className="mt-4 flex flex-col gap-4">
              <Input label="Novo e-mail" type="email" autoComplete="off" value={novo} onChange={(e) => setNovo(e.target.value)} error={erro} />
              <Input label="Palavra-passe atual" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Dialog.Close render={(props) => <Button {...props} variant="secondary">Cancelar</Button>} />
              <Button type="submit" variant="primary" disabled={!emailValido(novo) || !!erro || !senha}>
                Enviar código
              </Button>
            </div>
          </form>
        </Dialog>
      </Dialog.Root>
      <CodigoDialog
        aberto={aberto && passo === "codigo"}
        aoMudar={aoMudar}
        titulo="Confirme o novo e-mail"
        texto={<>Enviámos um código para <b>{mascarar(destino)}</b>. O e-mail só muda depois de o confirmar.</>}
        codigo={codigo}
        aoReenviar={() => (setCodigo(codigoSimulado()), avisar("Novo código enviado"))}
        rotuloAcao="Confirmar e-mail"
        aoConfirmar={() => {
          const antigo = conta.email;
          mudar({ email: destino, emailPendente: undefined, emailVerificado: true }, `E-mail alterado de ${antigo} para ${destino}`);
          avisar("E-mail alterado. Avisámos também o endereço anterior.");
        }}
      />
    </>
  );
}

export function SecaoContactos() {
  const { conta, mudar } = useConta();
  const { avisar } = useApp();
  const [aberto, setAberto] = useState(false);
  const [recuperacao, setRecuperacao] = useState(conta.emailRecuperacao);
  const [telefone, setTelefone] = useState(conta.telefone);
  const [verTel, setVerTel] = useState(false);
  const [codigoTel, setCodigoTel] = useState(codigoSimulado());
  useEffect(() => {
    setRecuperacao(conta.emailRecuperacao);
    setTelefone(conta.telefone);
  }, [conta.emailRecuperacao, conta.telefone]);
  const erroRec = recuperacao && !emailValido(recuperacao) ? "Esse e-mail não parece certo." : recuperacao.trim().toLowerCase() === conta.email ? "Tem de ser diferente do e-mail da conta." : undefined;
  const tel = telefone.replace(/[\s()-]/g, "");
  const erroTel = telefone && !/^\+?\d{9,15}$/.test(tel) ? "Escreva o número com o indicativo, por exemplo +244 923 000 000." : undefined;

  return (
    <>
      <Cartao titulo="E-mail da conta" dica="É com ele que entra e é para ele que vão os e-mails do painel. Mudá-lo não cria uma conta nova.">
        <Linha
          titulo={conta.email}
          estado={
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge variant={conta.emailVerificado ? "success" : "warning"}>{conta.emailVerificado ? "Verificado" : "Por verificar"}</Badge>
            </span>
          }
        >
          <Button variant="secondary" icon={ICONES.correio} onClick={() => setAberto(true)}>
            Alterar e-mail
          </Button>
        </Linha>
        {conta.emailPendente && (
          <div className="px-4 pb-3">
            <Banner
              variant="alert"
              title={`À espera de confirmação: ${conta.emailPendente}`}
              description="Enquanto não confirmar, continua a entrar com o e-mail atual."
              action={
                <span className="flex gap-2">
                  <Button size="sm" onClick={() => setAberto(true)}>
                    Introduzir código
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => mudar({ emailPendente: undefined }, "Mudança de e-mail cancelada")}>
                    Cancelar
                  </Button>
                </span>
              }
            />
          </div>
        )}
      </Cartao>

      <Cartao titulo="E-mail de recuperação" dica="Serve para recuperar a conta se perder o acesso ao e-mail principal.">
        <LinhaCampo>
          <Input label="E-mail alternativo" type="email" placeholder="outro@exemplo.com" value={recuperacao} onChange={(e) => setRecuperacao(e.target.value)} error={erroRec} />
          <div className="flex justify-end gap-2">
            {conta.emailRecuperacao && (
              <Button variant="ghost" onClick={() => mudar({ emailRecuperacao: "" }, "E-mail de recuperação removido")}>
                Remover
              </Button>
            )}
            <Button variant="primary" disabled={!recuperacao || !!erroRec || recuperacao === conta.emailRecuperacao} onClick={() => (mudar({ emailRecuperacao: recuperacao.trim() }, "E-mail de recuperação guardado"), avisar("E-mail de recuperação guardado"))}>
              Guardar
            </Button>
          </div>
        </LinhaCampo>
      </Cartao>

      <Cartao titulo="Telefone" dica="Recebe aqui os avisos por SMS que ativar em «Notificações» e pode usá-lo para recuperar a conta.">
        <LinhaCampo>
          <Input label="Número" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} error={erroTel} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={conta.telefoneVerificado ? "success" : "warning"}>{conta.telefoneVerificado ? "Verificado" : "Por verificar"}</Badge>
            <div className="flex gap-2">
              {!conta.telefoneVerificado && (
                <Button variant="secondary" onClick={() => (setCodigoTel(codigoSimulado()), setVerTel(true))}>
                  Verificar número
                </Button>
              )}
              <Button variant="primary" disabled={!telefone || !!erroTel || telefone === conta.telefone} onClick={() => (mudar({ telefone: telefone.trim(), telefoneVerificado: false }, "Número de telefone alterado"), avisar("Número guardado. Falta verificá-lo."))}>
                Guardar
              </Button>
            </div>
          </div>
        </LinhaCampo>
      </Cartao>

      <AlterarEmail aberto={aberto} aoMudar={setAberto} />
      <CodigoDialog aberto={verTel} aoMudar={setVerTel} titulo="Verifique o número" texto={<>Enviámos um SMS para <b>{conta.telefone}</b>.</>} codigo={codigoTel} aoReenviar={() => (setCodigoTel(codigoSimulado()), avisar("Novo código enviado"))} aoConfirmar={() => mudar({ telefoneVerificado: true }, "Número de telefone verificado")} rotuloAcao="Verificar" />
    </>
  );
}
