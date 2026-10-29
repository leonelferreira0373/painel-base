// As páginas de entrada do painel, copiadas da Cloudflare: iniciar sessão, registar, recuperar palavra-passe, recuperar e-mail, repor palavra-passe e verificação em dois passos.
"use client";

import { Banner, Button, Checkbox, Input } from "@cloudflare/kumo";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { auth, CHAVE_DO_LIMITE_MFA, emailValido, regrasSenha, senhaValida, useSessao } from "@/lib/auth";
import { chaveSeguraDisponivel, idsDasChavesNesteNavegador } from "@/lib/chave-do-navegador";
import { formatarEspera, useLimiteDeTentativas } from "@/lib/limite-tentativas";
import { toasts } from "@/lib/toasts";
import { CampoOtp } from "../CampoOtp";
import { Ic } from "../Icones";
import { CampoSenha } from "./CampoSenha";
import { TelaEntrada, TelaPainel, TelaRegisto } from "./Moldura";

/** Para onde voltar depois de entrar: o caminho que a pessoa queria, se for interno. */
function useSeguinte(): string {
  const [seguinte, setSeguinte] = useState("/");
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("seguinte") ?? "/";
    setSeguinte(s.startsWith("/") && !s.startsWith("//") ? s : "/");
  }, []);
  return seguinte;
}

function useJaEntrou(destino: string) {
  const router = useRouter();
  const { sessao } = useSessao();
  useEffect(() => {
    if (sessao) router.replace(destino);
  }, [sessao, destino, router]);
}

const Google = () => (
  <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
const Apple = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
  </svg>
);
const GitHub = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const indisponivel = (quem: string) => toasts.add({ title: `${quem} indisponível na simulação`, description: "Entre com um e-mail e uma palavra-passe.", timeout: 5000 });

/** Rótulo, ligação azul e restante texto das ligações pequenas por baixo do botão. */
const ligacaoAzul = "text-base font-medium !text-kumo-link !no-underline hover:underline";
const ligacaoSublinhada = "font-medium text-kumo-link underline underline-offset-2 hover:text-kumo-default";

export function PaginaEntrar() {
  const router = useRouter();
  const seguinte = useSeguinte();
  useJaEntrou(seguinte);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aEntrar, setAEntrar] = useState(false);
  const [temChave, setTemChave] = useState(false);
  useEffect(() => {
    if (chaveSeguraDisponivel()) void idsDasChavesNesteNavegador().then((ids) => setTemChave(ids.length > 0));
  }, []);
  const entrarComCodigo = () => {
    setErro(null);
    const r = auth.pedirCodigoDeEntrada(email);
    if (!r.ok) return setErro(r.erro ?? "Não foi possível pedir o código.");
    router.push(`/verificar/?seguinte=${encodeURIComponent(seguinte)}`);
  };
  const entrarComChave = async () => {
    setErro(null);
    setAEntrar(true);
    const r = await auth.entrarComChaveDoNavegador(email, lembrar);
    setAEntrar(false);
    if (!r.ok) return setErro(r.erro ?? "Não foi possível entrar com a chave.");
    router.replace(seguinte);
  };

  const submeter = (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setAEntrar(true);
    // A espera imita o pedido ao servidor.
    window.setTimeout(() => {
      const r = auth.entrar({ email, senha, lembrar });
      setAEntrar(false);
      if (!r.ok) setErro(r.erro ?? "Não foi possível entrar.");
      else if (r.codigo) router.push(`/verificar/?seguinte=${encodeURIComponent(seguinte)}`);
      else router.replace(seguinte);
    }, 450);
  };

  return (
    <TelaEntrada atalho={{ rotulo: "Registar-se", href: "/registar/" }}>
      <div className="mb-6 text-left">
        <h1 className="text-balance text-2xl font-semibold text-kumo-default">
          <div className="text-center">Iniciar sessão</div>
        </h1>
      </div>
      <div className="flex w-full flex-col">
        <div className="order-first grid">
          <div className="col-start-1 row-start-1">
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full flex-row gap-2">
                {[
                  { n: "Google", i: <Google /> },
                  { n: "Apple", i: <Apple /> },
                  { n: "GitHub", i: <GitHub /> },
                ].map((p) => (
                  <div key={p.n} className="flex-1">
                    <Button size="lg" variant="secondary" className="w-full" aria-label={`Continuar com ${p.n}`} onClick={() => indisponivel(`Entrada com ${p.n}`)}>
                      <span className="inline-flex items-center gap-2">
                        {p.i}
                        {p.n}
                      </span>
                    </Button>
                  </div>
                ))}
              </div>
              <Button size="lg" variant="secondary" className="w-full" onClick={() => indisponivel("Início de sessão único (SSO)")}>
                <span className="inline-flex items-center gap-2">
                  <Ic nome="cadeado" tamanho={18} />
                  Continuar com SSO
                </span>
              </Button>
            </div>
            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-kumo-hairline" />
              <span className="text-xs font-medium uppercase tracking-wider text-kumo-subtle">ou</span>
              <div className="h-px flex-1 bg-kumo-hairline" />
            </div>
          </div>
        </div>
        <form onSubmit={submeter} className="order-last">
          {erro && <Banner className="mb-4" variant="error" title={erro} />}
          <div className="flex flex-col gap-4">
            <Input label="E-mail" type="email" size="lg" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <CampoSenha label="Palavra-passe" tamanho="lg" autoComplete="current-password" value={senha} onValueChange={setSenha} />
          </div>
          <div className="mt-4">
            <Checkbox label="Guardar o e-mail e o método neste dispositivo" checked={lembrar} onCheckedChange={(v) => setLembrar(!!v)} />
          </div>
          <div className="mt-4 min-w-0 [contain:inline-size]">
            <Button type="submit" size="lg" variant="primary" className="w-full" loading={aEntrar} disabled={!email || !senha}>
              Iniciar sessão
            </Button>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Button type="button" size="lg" variant="secondary" className="w-full" disabled={!emailValido(email)} onClick={entrarComCodigo}>
              <span className="inline-flex items-center gap-2">
                <Ic nome="correio" tamanho={18} />
                Entrar com um código
              </span>
            </Button>
            {temChave && (
              <Button type="button" size="lg" variant="secondary" className="w-full" loading={aEntrar} disabled={!emailValido(email)} onClick={() => void entrarComChave()}>
                <span className="inline-flex items-center gap-2">
                  <Ic nome="chave" tamanho={18} />
                  Entrar com a chave deste navegador
                </span>
              </Button>
            )}
          </div>
          <div className="mt-4 flex flex-col items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-base">
              <span className="text-kumo-subtle">Ainda não tem conta?</span>
              <NextLink href="/registar/" className={ligacaoAzul}>
                Registar-se
              </NextLink>
            </span>
            <span className="inline-flex items-center gap-1 text-base text-kumo-subtle">
              Esqueceu-se do{" "}
              <NextLink href="/recuperar-email/" className={ligacaoSublinhada}>
                e-mail
              </NextLink>{" "}
              ou da{" "}
              <NextLink href="/recuperar-palavra-passe/" className={ligacaoSublinhada}>
                palavra-passe
              </NextLink>
              ?
            </span>
          </div>
        </form>
      </div>
      <p className="mt-6 text-center text-xs text-kumo-inactive">Ambiente de simulação: qualquer e-mail e palavra-passe entram.</p>
    </TelaEntrada>
  );
}

/** Lista de requisitos que se acende à medida que a palavra-passe os cumpre. */
export function RequisitosSenha({ senha }: { senha: string }) {
  const r = regrasSenha(senha);
  const itens: [boolean, ReactNode][] = [
    [r.oito, <><strong>8 caracteres</strong></>],
    [r.numero, <><strong>1 número</strong></>],
    [r.simbolo, <><strong>1 símbolo</strong>, por exemplo $, !, @, %, &amp;</>],
    [r.espacos, <><strong>Sem espaços</strong> no início ou no fim</>],
  ];
  return (
    <div className="mt-2" role="status" aria-live="polite">
      <p className="mb-2 text-sm text-kumo-subtle">Crie uma palavra-passe com, pelo menos:</p>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {itens.map(([ok, texto], i) => (
          <li key={i} className={`flex items-center gap-2 rounded-sm px-1 text-sm leading-7 transition-colors ${ok ? "bg-kumo-success/10 text-kumo-success" : "text-kumo-subtle"}`}>
            <Ic nome={ok ? "certo" : "seletor"} tamanho={16} className={ok ? "" : "opacity-0"} />
            <span>{texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PaginaRegistar() {
  const router = useRouter();
  useJaEntrou("/");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aCriar, setACriar] = useState(false);

  const submeter = (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setACriar(true);
    window.setTimeout(() => {
      const r = auth.registar({ nome: "", email, senha });
      setACriar(false);
      if (!r.ok) setErro(r.erro ?? "Não foi possível criar a conta.");
      else {
        toasts.add({ title: "Conta criada", description: "Enviámos um e-mail de verificação (simulação).", timeout: 6000 });
        router.replace("/");
      }
    }, 600);
  };

  return (
    <TelaRegisto>
      <div className="mb-4 w-full">
        <h1 className="text-2xl font-semibold text-kumo-default md:text-3xl">Crie a sua conta</h1>
      </div>
      <div className="w-full">
        <div className="mb-4 flex flex-col gap-4">
          {[
            { n: "Google", i: <Google /> },
            { n: "Apple", i: <Apple /> },
            { n: "GitHub", i: <GitHub /> },
          ].map((p) => (
            <Button key={p.n} size="lg" variant="secondary" className="w-full" onClick={() => indisponivel(`Registo com ${p.n}`)}>
              <span className="inline-flex items-center gap-2">
                {p.i}
                Continuar com {p.n}
              </span>
            </Button>
          ))}
        </div>
        <div className="my-4 flex items-center pt-1">
          <div className="flex-1 border-t border-kumo-hairline" />
        </div>
        <form onSubmit={submeter}>
          {erro && <Banner className="mb-4" variant="error" title={erro} />}
          <div className="flex flex-col gap-4">
            <Input label="E-mail" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <CampoSenha label="Palavra-passe" tamanho="base" autoComplete="new-password" value={senha} onValueChange={setSenha} />
          </div>
          {senha.length > 0 && <RequisitosSenha senha={senha} />}
          <div className="mt-6">
            <Checkbox label="Guardar o e-mail e o método neste dispositivo" checked={lembrar} onCheckedChange={(v) => setLembrar(!!v)} />
          </div>
          <div className="mt-4 text-left text-[0.8rem] leading-[1.5] text-kumo-subtle [&_a]:text-kumo-subtle [&_a]:underline [&_a]:decoration-kumo-inactive [&_a]:underline-offset-4 [&_a:hover]:text-kumo-default">
            <p className="mb-4">
              Ao continuar, aceito os <NextLink href="/termos/">termos</NextLink>, a <NextLink href="/privacidade/">política de privacidade</NextLink> e a <NextLink href="/cookies/">política de cookies</NextLink>.
            </p>
          </div>
          <div className="mt-2">
            <Button type="submit" variant="primary" className="w-full" loading={aCriar} disabled={!email || !senhaValida(senha)}>
              Registar-se
            </Button>
          </div>
          <div className="mt-6 flex flex-col items-center">
            <span className="inline-flex items-center gap-1 text-base">
              <span className="text-kumo-subtle">Já tem conta?</span>
              <NextLink href="/entrar/" className="font-medium text-kumo-default no-underline hover:underline">
                Iniciar sessão
              </NextLink>
            </span>
          </div>
        </form>
      </div>
    </TelaRegisto>
  );
}

function CabecalhoPagina({ titulo, grande = false }: { titulo: string; grande?: boolean }) {
  return grande ? (
    <div className="mx-auto w-full max-w-[29rem] pt-12 text-center">
      <h1 className="text-3xl font-semibold text-kumo-default">{titulo}</h1>
    </div>
  ) : (
    <div className="flex grow flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid min-w-0 gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-[20px] font-semibold text-kumo-default">{titulo}</h1>
        </div>
      </div>
    </div>
  );
}

function Pe({ pergunta, ligacao, href }: { pergunta: string; ligacao: string; href: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-base">
      <span className="text-kumo-subtle">{pergunta}</span>
      <NextLink href={href} className="font-medium text-current no-underline hover:underline">
        {ligacao}
      </NextLink>
    </span>
  );
}

export function PaginaRecuperarSenha() {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [aEnviar, setAEnviar] = useState(false);
  const submeter = (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setAEnviar(true);
    window.setTimeout(() => {
      const r = auth.recuperar(email);
      setAEnviar(false);
      if (r.ok) setEnviado(true);
      else setErro(r.erro ?? "Não foi possível enviar.");
    }, 500);
  };
  return (
    <TelaPainel>
      <CabecalhoPagina titulo="Esqueceu-se da palavra-passe?" />
      <div className="mx-auto flex w-full max-w-[28rem] flex-col items-center pt-12">
        {enviado ? (
          <div className="flex w-full flex-col gap-4">
            <Banner variant="default" title="Verifique o seu e-mail" description="Se existir uma conta com esse endereço, enviámos-lhe uma ligação para repor a palavra-passe." />
            <NextLink href="/repor-palavra-passe/" className="text-sm font-medium text-kumo-link hover:underline">
              Abrir a ligação de simulação
            </NextLink>
          </div>
        ) : (
          <form onSubmit={submeter} className="flex w-full flex-col">
            {erro && <Banner className="mb-4" variant="error" title={erro} />}
            <div className="flex flex-col gap-1">
              <label htmlFor="recuperar-email" className="mb-1 text-sm font-medium">
                Introduza o seu e-mail
              </label>
              <Input id="recuperar-email" type="email" aria-label="E-mail" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="mt-6">
              <Button type="submit" size="lg" variant="primary" className="w-full" loading={aEnviar} disabled={!email}>
                Enviar
              </Button>
            </div>
          </form>
        )}
        <div className="mt-6 flex flex-col items-center gap-2">
          <Pe pergunta="Já tem conta?" ligacao="Iniciar sessão" href="/entrar/" />
          <Pe pergunta="Esqueceu-se do e-mail?" ligacao="Recuperar e-mail" href="/recuperar-email/" />
        </div>
      </div>
    </TelaPainel>
  );
}

export function PaginaRecuperarEmail() {
  const [nome, setNome] = useState("");
  const [resultado, setResultado] = useState<{ pista: string | null } | null>(null);
  const submeter = (e: FormEvent) => {
    e.preventDefault();
    setResultado({ pista: auth.pistaDeEmail(nome) });
  };
  return (
    <TelaPainel>
      <CabecalhoPagina titulo="Esqueceu-se do e-mail?" grande />
      <div className="mx-auto flex w-full max-w-[28rem] flex-col items-center">
        <p className="mb-8 w-full text-center text-sm text-kumo-subtle">Esta ferramenta ajuda a descobrir o endereço de e-mail associado à sua conta.</p>
        <form onSubmit={submeter} className="flex w-full flex-col">
          <Input label="Introduza o seu nome completo" labelTooltip="O nome com que a conta foi criada, por exemplo «Ana Costa»." placeholder="Nome e apelido" value={nome} onChange={(e) => setNome(e.target.value)} />
          {resultado && (
            <div className="mt-4">
              {resultado.pista ? <Banner variant="default" title={`O e-mail da conta começa e acaba assim: ${resultado.pista}`} /> : <Banner variant="alert" title="Não encontrámos nenhuma conta com esse nome." />}
            </div>
          )}
          <div className="mt-8">
            <Button type="submit" size="lg" variant="primary" className="w-full" disabled={!nome.trim()}>
              Enviar
            </Button>
          </div>
        </form>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Pe pergunta="Já tem conta?" ligacao="Iniciar sessão" href="/entrar/" />
        </div>
      </div>
    </TelaPainel>
  );
}

export function PaginaReporSenha() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [outra, setOutra] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const submeter = (e: FormEvent) => {
    e.preventDefault();
    if (senha !== outra) return setErro("As palavras-passe não coincidem.");
    const r = auth.repor(senha);
    if (!r.ok) return setErro(r.erro ?? "Não foi possível repor.");
    toasts.add({ title: "Palavra-passe reposta", description: "Já pode iniciar sessão.", timeout: 5000 });
    router.replace("/entrar/");
  };
  return (
    <TelaEntrada atalho={{ rotulo: "Iniciar sessão", href: "/entrar/" }}>
      <div className="mb-6 text-left">
        <h1 className="text-balance text-2xl font-semibold text-kumo-default">
          <div className="text-center">Repor a palavra-passe</div>
        </h1>
      </div>
      <form onSubmit={submeter}>
        {erro && <Banner className="mb-4" variant="error" title={erro} />}
        <div className="flex flex-col gap-4">
          <CampoSenha label="Nova palavra-passe" tamanho="lg" autoComplete="new-password" value={senha} onValueChange={setSenha} />
          <CampoSenha label="Repita a palavra-passe" tamanho="lg" autoComplete="new-password" value={outra} onValueChange={setOutra} />
        </div>
        {senha.length > 0 && <RequisitosSenha senha={senha} />}
        <div className="mt-6">
          <Button type="submit" size="lg" variant="primary" className="w-full" disabled={!senhaValida(senha) || !outra}>
            Repor palavra-passe
          </Button>
        </div>
      </form>
    </TelaEntrada>
  );
}

export function PaginaVerificar() {
  const router = useRouter();
  const seguinte = useSeguinte();
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [erroVisual, setErroVisual] = useState(false);
  const [, tique] = useState(0);
  const [temEntrada, setTemEntrada] = useState(true);
  const limite = useLimiteDeTentativas(CHAVE_DO_LIMITE_MFA);
  const apagar = useRef<number>(undefined);
  useJaEntrou(seguinte);
  useEffect(() => {
    setTemEntrada(auth.temEntradaPendente());
    const id = window.setInterval(() => tique((n) => n + 1), 1000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(apagar.current);
    };
  }, []);
  useEffect(() => {
    if (!limite.bloqueado) setErro((m) => (m?.startsWith("Demasiadas") ? null : m));
  }, [limite.bloqueado]);
  const certo = typeof window !== "undefined" ? auth.codigoPendente() : null;
  const tipo = typeof window !== "undefined" ? auth.tipoDaEntradaPendente() : null;
  const destinos = typeof window !== "undefined" && tipo === "otp" ? auth.destinosDaEntradaPendente() : [];
  const verificar = (escrito: string) => {
    if (limite.bloqueado || erroVisual) return;
    const r = auth.confirmarCodigo(escrito);
    limite.reler();
    if (r.ok) return router.replace(seguinte);
    setErro(r.erro ?? "Esse código não está certo.");
    setErroVisual(true);
    window.clearTimeout(apagar.current);
    apagar.current = window.setTimeout(() => (setCodigo(""), setErroVisual(false)), 700);
  };
  const submeter = (e: FormEvent) => {
    e.preventDefault();
    if (codigo.length === 6) verificar(codigo);
  };
  const frase = limite.bloqueado ? `Demasiadas tentativas. Tente de novo dentro de ${formatarEspera(limite.espera)}.` : erro;
  return (
    <TelaEntrada atalho={{ rotulo: "Voltar", href: "/entrar/" }}>
      <div className="mb-6 text-left">
        <h1 className="text-balance text-2xl font-semibold text-kumo-default">
          <div className="text-center">{tipo === "otp" ? "Código de uso único" : "Verificação em dois passos"}</div>
        </h1>
      </div>
      {!temEntrada ? (
        <Banner variant="alert" title="A entrada expirou" description="Volte ao início e introduza o e-mail e a palavra-passe outra vez." />
      ) : (
        <form onSubmit={submeter}>
          {frase && <Banner className="mb-4" variant="error" title={frase} />}
          <p className="mb-4 text-sm text-kumo-subtle">
            {tipo === "otp" ? (
              <>
                Enviámos um código de 6 dígitos para {destinos.map((d, i) => <span key={d.valor}>{i > 0 ? ", " : ""}<b>{d.mascara}</b></span>)}.
              </>
            ) : (
              "Introduza o código de 6 dígitos da sua aplicação autenticadora."
            )}
          </p>
          {certo && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg bg-kumo-tint px-3 py-2 text-sm text-kumo-default">
              <span className="min-w-0">
                Simulação: o código {tipo === "otp" ? "é" : "agora é"} <b className="whitespace-nowrap tabular-nums">{`${certo.slice(0, 3)} ${certo.slice(3)}`}</b>
              </span>
              <Button type="button" size="sm" variant="secondary" className="ml-auto" disabled={limite.bloqueado} onClick={() => (setErroVisual(false), setCodigo(certo))}>
                Preencher
              </Button>
            </div>
          )}
          <CampoOtp valor={codigo} aoMudar={(v) => (setCodigo(v), setErroVisual(false), setErro(null))} aoCompletar={verificar} erro={erroVisual} desativado={limite.bloqueado} autoFocus tamanho="lg" />
          <div className="mt-6">
            <Button type="submit" size="lg" variant="primary" className="w-full" disabled={codigo.length !== 6 || limite.bloqueado || erroVisual}>
              Verificar
            </Button>
          </div>
        </form>
      )}
    </TelaEntrada>
  );
}
