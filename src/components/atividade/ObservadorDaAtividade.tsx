// Quem vê tudo o que se faz no painel para o registo de atividade: abre a sessão (quando, de onde, com que aparelho), regista as páginas por onde se passa, os cliques, as definições ligadas e desligadas (com o antes e o depois), os campos mudados (o que é secreto nunca se guarda), as janelas abertas e a mudança de função. Não desenha nada. As mensagens com a IA, os convites e os tokens registam-se onde acontecem.
"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { SECOES_CONTA } from "@/dados/conta";
import { AREAS } from "@/dados/estrutura";
import { PROJETO } from "@/dados/projeto";
import { useSessao } from "@/lib/auth";
import { iniciarSessao, ligarOsOuvintes, mascarar, registar } from "@/lib/atividade";
import { useApp } from "@/lib/estado";
import { nomeDe } from "@/lib/ia-ecra";

/** O nome de uma página do painel pelo endereço («Firewall», «Segurança»). */
export function rotuloDaPagina(pathname: string): string {
  let partes = pathname.split("/").filter(Boolean);
  if (partes[0] === PROJETO.contaId) partes = partes.slice(1);
  if (partes.length === 0) return "Visão geral";
  if (partes[0] === "conta") return SECOES_CONTA.find((s) => s.id === partes[1])?.rotulo ?? "Definições da conta";
  const m = AREAS.find((a) => a.id === partes[0])?.modulos.find((x) => x.id === partes[1]);
  return m?.rotulo ?? (document.title.replace(/\s*[|·-].*$/, "") || pathname);
}

const ALVO = 'button, a[href], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="button"], summary, input[type="checkbox"], input[type="radio"]';

/** O interruptor ou a caixa: ligado ou desligado; o resto não tem estado. */
function estadoDe(el: Element): "ligado" | "desligado" | undefined {
  const marcado = el.getAttribute("aria-checked") ?? el.getAttribute("aria-pressed");
  if (marcado === "true") return "ligado";
  if (marcado === "false") return "desligado";
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) return el.checked ? "ligado" : "desligado";
  return undefined;
}

/** O nome que a pessoa vê: o do próprio controlo ou, nos interruptores sem texto, o título da linha onde estão. */
function nomeParaRegisto(el: Element): string {
  const n = nomeDe(el);
  if (n) return n;
  let p = el.parentElement;
  for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
    const t = (p as HTMLElement).innerText
      ?.split("\n")
      .map((s) => s.trim())
      .find((s) => s.length >= 2 && s.length <= 80);
    if (t) return t;
  }
  return "";
}

const ehCampo = (el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest(".aia, [data-sem-registo], [role=dialog][aria-label*=esquisa]")) return false;
  if (el instanceof HTMLInputElement) return !["checkbox", "radio", "hidden", "range", "file", "search", "button", "submit"].includes(el.type) && el.getAttribute("role") !== "combobox";
  return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
};

const valorDe = (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => (el instanceof HTMLSelectElement ? (el.selectedOptions[0]?.textContent ?? el.value) : el.value);

export function ObservadorDaAtividade() {
  const { funcao } = useApp();
  const { sessao } = useSessao();
  // a sessão lê-se de novo a cada desenho: só contam o nome e o e-mail
  const entrou = !!sessao;
  const quem = sessao?.nome || sessao?.email || "";
  const pathname = usePathname();
  const funcaoAnterior = useRef<string | null>(null);

  // a sessão abre-se com a entrada e retoma-se quando a página recarrega
  useEffect(() => {
    if (!entrou) return;
    iniciarSessao(quem, funcao.rotulo);
    const desligar = ligarOsOuvintes();
    return desligar;
  }, [entrou, quem, funcao.rotulo]);

  useEffect(() => {
    if (funcaoAnterior.current !== null && funcaoAnterior.current !== funcao.id) registar("funcao", `Mudou para a função «${funcao.rotulo}»`);
    funcaoAnterior.current = funcao.id;
  }, [funcao.id, funcao.rotulo]);

  useEffect(() => {
    if (!entrou) return;
    registar("navegacao", `Abriu «${rotuloDaPagina(pathname)}»`, { caminho: pathname });
  }, [pathname, entrou]);

  useEffect(() => {
    const aClicar = (e: MouseEvent) => {
      const alvo = (e.target as Element | null)?.closest?.(ALVO);
      if (!alvo || alvo.closest(".aia, [data-sem-registo]")) return;
      // a caixa escondida que acompanha cada interruptor também recebe o clique: já se conta no interruptor
      if (alvo instanceof HTMLInputElement && (alvo.getAttribute("aria-hidden") === "true" || alvo.tabIndex === -1)) return;
      const tag = alvo.tagName.toLowerCase();
      const papel = alvo.getAttribute("role");
      if (tag === "a") {
        const href = alvo.getAttribute("href") ?? "";
        // as ligações do painel contam-se ao mudar de página; só interessam as que saem
        if (href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:")) return;
        registar("clique", `Abriu a ligação «${nomeDe(alvo) || href}»`, { depois: href.slice(0, 120) });
        return;
      }
      const antes = estadoDe(alvo);
      const nome = nomeParaRegisto(alvo);
      if (!nome) return;
      window.setTimeout(() => {
        const depois = estadoDe(alvo);
        if (antes !== undefined && depois !== undefined && antes !== depois) registar("definicao", `${depois === "ligado" ? "Ligou" : "Desligou"} «${nome}»`, { antes, depois });
        else if (papel === "tab") registar("clique", `Abriu o separador «${nome}»`);
        else if (papel === "option" || papel === "menuitem" || papel === "menuitemradio" || papel === "radio") registar("clique", `Escolheu «${nome}»`);
        else registar("clique", `Clicou em «${nome}»`);
      }, 90);
    };

    const valores = new WeakMap<Element, string>();
    const aEntrar = (e: FocusEvent) => {
      if (ehCampo(e.target)) valores.set(e.target, valorDe(e.target));
    };
    const aSair = (e: FocusEvent) => {
      const el = e.target;
      if (!ehCampo(el) || !valores.has(el)) return;
      const antes = valores.get(el) ?? "";
      valores.delete(el);
      const depois = valorDe(el);
      if (antes === depois) return;
      const nome = nomeDe(el) || el.getAttribute("name") || "campo";
      const tipo = el instanceof HTMLInputElement ? el.type : "";
      registar("campo", `Mudou «${nome}»`, { antes: mascarar(nome, antes, tipo), depois: mascarar(nome, depois, tipo) });
    };

    const vistas = new WeakSet<Element>();
    const aparecer = (n: Node) => {
      if (!(n instanceof Element)) return;
      const janelas = n.matches('[role="dialog"]') ? [n] : [...n.querySelectorAll('[role="dialog"]')];
      for (const j of janelas) {
        if (vistas.has(j)) continue;
        vistas.add(j);
        // os avisos flutuantes também são «janelas» para o navegador, mas não o são para a pessoa
        if (j.className.toString().includes("--toast")) continue;
        if (j.classList.contains("aia-painel")) {
          registar("ia", "Abriu a conversa com a IA");
          continue;
        }
        const titulo = (j.querySelector("h1, h2, h3, [class*=title]")?.textContent ?? j.getAttribute("aria-label") ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
        if (titulo) registar("janela", `Abriu a janela «${titulo}»`);
      }
    };
    const observador = new MutationObserver((lista) => {
      for (const m of lista) m.addedNodes.forEach(aparecer);
    });
    observador.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("click", aClicar, true);
    document.addEventListener("focusin", aEntrar, true);
    document.addEventListener("focusout", aSair, true);
    return () => {
      document.removeEventListener("click", aClicar, true);
      document.removeEventListener("focusin", aEntrar, true);
      document.removeEventListener("focusout", aSair, true);
      observador.disconnect();
    };
  }, []);

  return null;
}
