// Termos, privacidade e cookies: documentos escritos para este ambiente de simulação, com a mesma moldura das páginas de entrada.
"use client";

import { Banner } from "@cloudflare/kumo";
import type { ReactNode } from "react";
import { TelaPainel } from "./Moldura";

interface Secao {
  titulo: string;
  texto: ReactNode[];
}

function Documento({ titulo, atualizado, secoes }: { titulo: string; atualizado: string; secoes: Secao[] }) {
  return (
    <TelaPainel>
      <article className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-semibold text-kumo-default">{titulo}</h1>
        <p className="mt-2 text-sm text-kumo-subtle">Última atualização: {atualizado}</p>
        <Banner className="mt-6" variant="default" title="Documento de demonstração" description="Foi escrito para este ambiente de simulação. Antes de um uso real tem de ser revisto por quem responde juridicamente pelo serviço." />
        <nav aria-label="Índice" className="mt-8 rounded-lg bg-kumo-base p-4 ring ring-kumo-line">
          <ol className="m-0 flex list-decimal flex-col gap-1 pl-5 text-sm">
            {secoes.map((s, i) => (
              <li key={s.titulo}>
                <a href={`#s${i + 1}`} className="text-kumo-link hover:underline">
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {secoes.map((s, i) => (
          <section key={s.titulo} id={`s${i + 1}`} className="mt-10 scroll-mt-20">
            <h2 className="text-xl font-semibold text-kumo-default">
              {i + 1}. {s.titulo}
            </h2>
            <div className="mt-3 flex flex-col gap-3 text-sm leading-6 text-kumo-default">{s.texto.map((t, j) => (typeof t === "string" ? <p key={j}>{t}</p> : <div key={j}>{t}</div>))}</div>
          </section>
        ))}
      </article>
    </TelaPainel>
  );
}

const Lista = ({ itens }: { itens: string[] }) => (
  <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5">
    {itens.map((i) => (
      <li key={i}>{i}</li>
    ))}
  </ul>
);

export function PaginaPrivacidade() {
  return (
    <Documento
      titulo="Política de privacidade"
      atualizado="28 de outubro de 2026"
      secoes={[
        { titulo: "O que é este ambiente", texto: ["Este painel é um ambiente de simulação: as encomendas, os clientes, os utilizadores e os valores que vê são fictícios. Serve para mostrar como o sistema funciona, sem tocar em dados reais da empresa."] },
        {
          titulo: "Que dados tratamos",
          texto: [
            "Só tratamos o que a própria pessoa introduz ou escolhe:",
            <Lista key="a" itens={["o e-mail e a palavra-passe usados para entrar (na simulação não são verificados nem enviados);", "as definições da conta, os lembretes e as preferências de aparência;", "os ficheiros que escolher analisar, que são lidos no seu navegador e não saem dele."]} />,
          ],
        },
        { titulo: "Onde ficam guardados", texto: ["Tudo o que se guarda fica no armazenamento do seu navegador (armazenamento local e base de dados do navegador). Nada disto é copiado para um servidor. O servidor que entrega as páginas regista apenas dados técnicos de acesso, como a data, a página pedida e o endereço de rede, para manter o serviço seguro."] },
        { titulo: "Para que usamos", texto: ["Para mostrar o painel, manter a sessão aberta quando pede para guardar o método de entrada e lembrar as suas preferências. Não usamos os dados para publicidade nem para criar perfis."] },
        { titulo: "Partilha com terceiros", texto: ["Não vendemos nem partilhamos dados. O tráfego passa pela rede de um fornecedor de entrega de conteúdo, que o transporta mas não tem acesso ao que está guardado no seu navegador."] },
        { titulo: "Quanto tempo ficam", texto: ["Até os apagar. Pode fazê-lo a qualquer momento em «Preferências de cookies», ou em «Definições da conta», na secção «Dados e privacidade»."] },
        { titulo: "Os seus direitos", texto: ["Pode aceder aos seus dados, corrigi-los, descarregá-los, apagá-los e opor-se ao seu tratamento. Como tudo fica no seu navegador, as secções «Perfil» e «Dados e privacidade» das definições da conta já lhe dão estes controlos."] },
        { titulo: "Segurança", texto: ["As ligações são cifradas, as palavras-passe nunca são guardadas em texto simples e a sessão pode ter verificação em dois passos. Nenhum sistema é totalmente invulnerável: se notar algo estranho, termine a sessão e avise quem lhe deu acesso."] },
        { titulo: "Alterações a este documento", texto: ["Quando mudarmos esta política, a data de atualização acima muda também."] },
      ]}
    />
  );
}

export function PaginaTermos() {
  return (
    <Documento
      titulo="Termos de utilização"
      atualizado="28 de outubro de 2026"
      secoes={[
        { titulo: "Aceitação", texto: ["Ao entrar neste ambiente aceita estes termos. Se não concordar, não o utilize."] },
        { titulo: "O que este ambiente é", texto: ["Um espaço de demonstração, com dados fictícios e funções simuladas, como a entrada na conta e o envio de e-mails. Nada do que faz aqui altera sistemas ou pessoas reais."] },
        {
          titulo: "Como pode usá-lo",
          texto: [
            "Pode explorar o painel, carregar ficheiros para os analisar e experimentar as funções de cada perfil. Não pode:",
            <Lista key="a" itens={["carregar dados pessoais de terceiros sem autorização;", "tentar aceder a áreas que não são suas ou perturbar o serviço;", "copiar o painel para o apresentar como seu."]} />,
          ],
        },
        { titulo: "Contas e acesso", texto: ["As contas são de demonstração. Cada perfil mostra o que uma função real poderia ver e fazer. Quem tem a sessão aberta num dispositivo é responsável por a terminar quando o partilha com outras pessoas."] },
        { titulo: "O que lhe pertence", texto: ["Os ficheiros que carrega continuam a ser seus e ficam no seu navegador. O painel, a sua aparência e o seu código pertencem a quem o desenvolveu."] },
        { titulo: "Sem garantias", texto: ["O ambiente é fornecido tal como está, sem garantia de disponibilidade ou de exatidão dos números mostrados, que são fictícios."] },
        { titulo: "Limite de responsabilidade", texto: ["Na medida permitida pela lei, não respondemos por perdas ligadas ao uso deste ambiente de demonstração."] },
        { titulo: "Alterações", texto: ["Podemos mudar ou retirar o ambiente e estes termos. A data de atualização indica a versão em vigor."] },
      ]}
    />
  );
}

const CHAVES = [
  { chave: "painel.sessao", para: "Sessão aberta neste navegador, se escolheu guardar o método de entrada.", dura: "Até terminar a sessão" },
  { chave: "painel.tema", para: "Tema claro, escuro ou igual ao sistema.", dura: "Até o apagar" },
  { chave: "painel.conta.*", para: "Definições, lembretes e atividade de cada conta.", dura: "Até o apagar" },
  { chave: "painel.funcao", para: "Conta de demonstração escolhida.", dura: "Até o apagar" },
  { chave: "painel.recentes / fixados", para: "Páginas recentes e fixadas no menu.", dura: "Até o apagar" },
];

export function PaginaCookies() {
  return (
    <Documento
      titulo="Política de cookies"
      atualizado="28 de outubro de 2026"
      secoes={[
        { titulo: "O que usamos", texto: ["Este ambiente não usa cookies de publicidade, de seguimento nem de terceiros. Guarda alguns dados no armazenamento do seu navegador, que cumprem a mesma função e são tratados aqui como cookies."] },
        {
          titulo: "O que fica guardado",
          texto: [
            <div key="t" className="overflow-hidden rounded-lg ring ring-kumo-line">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-kumo-tint text-xs text-kumo-subtle">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Para quê</th>
                    <th className="px-3 py-2 font-medium">Dura</th>
                  </tr>
                </thead>
                <tbody>
                  {CHAVES.map((c) => (
                    <tr key={c.chave} className="border-t border-kumo-hairline align-top">
                      <td className="px-3 py-2 font-mono text-xs">{c.chave}</td>
                      <td className="px-3 py-2">{c.para}</td>
                      <td className="px-3 py-2 text-kumo-subtle">{c.dura}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>,
          ],
        },
        { titulo: "Como os controlar", texto: ["Em «Preferências de cookies», no fundo de cada página, vê o que está guardado e pode apagar tudo de uma vez. Também pode limpar os dados do site nas definições do seu navegador."] },
        { titulo: "Alterações", texto: ["Se passarmos a usar outros dados, esta página e a data de atualização mudam antes de isso acontecer."] },
      ]}
    />
  );
}
