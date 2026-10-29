// Os olhos e as mãos da IA no painel: ver o que está no ecrã (uma lista de controlos numerados) e agir nele como uma pessoa (clicar, escrever, escolher numa lista, premir uma tecla). Funciona em qualquer página e em qualquer modo, porque faz o mesmo que um dedo faria: por isso a IA consegue mexer em tudo o que uma pessoa mexe, sem uma ferramenta por funcionalidade. O chat da própria IA nunca aparece nem se toca.

export interface ElementoVisto {
  ref: number;
  tipo: string;
  nome: string;
  estado: string;
  valor?: string;
}

/** Os controlos da última leitura do ecrã, por número. */
const elementos = new Map<number, Element>();

const CONTROLOS = 'button, a[href], input:not([type="hidden"]), textarea, select, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="switch"], [role="checkbox"], [role="radio"], [role="combobox"], [contenteditable="true"], summary';

const compactar = (t: string, n = 70) => t.replace(/\s+/g, " ").trim().slice(0, n);

/** O que é o controlo, em palavras da pessoa. */
export function tipoDe(el: Element): string {
  const papel = el.getAttribute("role");
  const tag = el.tagName.toLowerCase();
  if (papel === "switch") return "interruptor";
  if (papel === "checkbox" || (tag === "input" && (el as HTMLInputElement).type === "checkbox")) return "caixa de seleção";
  if (papel === "radio" || (tag === "input" && (el as HTMLInputElement).type === "radio")) return "opção";
  if (papel === "tab") return "separador";
  if (papel === "menuitem" || papel === "menuitemcheckbox" || papel === "menuitemradio") return "item de menu";
  if (papel === "option") return "opção da lista";
  if (papel === "combobox" || tag === "select") return "lista";
  if (tag === "textarea" || tag === "input" || el.getAttribute("contenteditable") === "true") return "campo";
  if (tag === "a") return "ligação";
  return "botão";
}

/** O nome que uma pessoa lhe daria: a etiqueta, o título, o texto ou o texto de ajuda do campo. */
export function nomeDe(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return compactar(aria);
  const porId = el.getAttribute("aria-labelledby");
  if (porId) {
    const t = porId.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
    if (t.trim()) return compactar(t);
  }
  if ("labels" in el && (el as HTMLInputElement).labels?.length) return compactar([...(el as HTMLInputElement).labels!].map((l) => l.textContent ?? "").join(" "));
  const texto = compactar((el as HTMLElement).innerText ?? el.textContent ?? "");
  if (texto) return texto;
  return compactar(el.getAttribute("title") ?? el.getAttribute("placeholder") ?? el.getAttribute("name") ?? "");
}

function estadoDe(el: Element): string {
  const e: string[] = [];
  const marcado = el.getAttribute("aria-checked") ?? el.getAttribute("aria-pressed") ?? el.getAttribute("aria-selected");
  if (marcado === "true") e.push("ligado");
  else if (marcado === "false") e.push("desligado");
  else if ("checked" in el && (el as HTMLInputElement).type && ["checkbox", "radio"].includes((el as HTMLInputElement).type)) e.push((el as HTMLInputElement).checked ? "ligado" : "desligado");
  if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") e.push("desativado");
  if (el.getAttribute("aria-expanded") === "true") e.push("aberto");
  return e.join(", ");
}

const visivel = (el: Element) => {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== "hidden" && cs.display !== "none" && cs.opacity !== "0";
};

/** O que fica de fora da leitura: o próprio chat da IA, o que está escondido ou inerte. */
const deFora = (el: Element) => !!el.closest('.aia, [inert], [aria-hidden="true"], [data-ia-ignorar]');

/** A janela (diálogo) aberta que não é o chat: quando há uma, só se lê o que está nela. */
export function janelaAberta(): Element | null {
  const janelas = [...document.querySelectorAll('[role="dialog"]')].filter((d) => !d.classList.contains("aia-painel") && !d.closest(".aia") && !d.className.toString().includes("--toast") && visivel(d));
  return janelas.length ? janelas[janelas.length - 1] : null;
}

/** O texto de uma zona como a pessoa o lê: os números em roda valem pelo valor (aria-label) e o que está escondido não conta. */
export function textoVisivel(raiz: Element | null): string {
  if (!raiz) return "";
  const copia = raiz.cloneNode(true) as Element;
  for (const n of copia.querySelectorAll('[role="text"][aria-label]')) n.textContent = n.getAttribute("aria-label") ?? "";
  for (const n of copia.querySelectorAll('[aria-hidden="true"], script, style')) n.remove();
  return copia.textContent ?? "";
}

/** Lê o ecrã: a página, a janela aberta, os títulos e os controlos numerados. */
export function lerEcra(maximo = 70): { texto: string; elementos: ElementoVisto[] } {
  elementos.clear();
  const janela = janelaAberta();
  // uma lista aberta (as opções de um menu) está fora da janela mas é o que a pessoa vê por cima
  const listas = [...document.querySelectorAll('[role="listbox"], [role="menu"]')].filter((l) => !l.closest(".aia") && visivel(l));
  const raizes: Element[] = janela ? [janela, ...listas] : [...listas, document.querySelector("main") ?? document.body, ...(document.querySelector("header") ? [document.querySelector("header")!] : [])];
  const vistos: ElementoVisto[] = [];
  const unicos = new Set<Element>();
  for (const raiz of raizes) {
    for (const el of raiz.querySelectorAll(CONTROLOS)) {
      if (unicos.has(el) || deFora(el) || !visivel(el)) continue;
      unicos.add(el);
      if (vistos.length >= maximo) break;
      const ref = vistos.length + 1;
      elementos.set(ref, el);
      const campo = el as HTMLInputElement;
      const valor = tipoDe(el) === "campo" || tipoDe(el) === "lista" ? compactar(campo.value ?? el.textContent ?? "", 60) : undefined;
      vistos.push({ ref, tipo: tipoDe(el), nome: nomeDe(el), estado: estadoDe(el), ...(valor ? { valor } : {}) });
    }
  }
  const titulos = [...document.querySelectorAll("main h1, main h2, [role=dialog]:not(.aia-painel) h2")].filter((h) => !h.closest(".aia") && visivel(h)).map((h) => compactar(h.textContent ?? "", 60)).filter(Boolean).slice(0, 8);
  const linhas = [
    `Página: ${document.title.replace(/\s*[|·-].*$/, "") || "painel"} (${location.pathname})`,
    ...(janela ? [`Janela aberta: ${compactar(janela.querySelector("h1,h2,[class*=title]")?.textContent ?? "", 60) || "sem título"} (só se vê o que lá está)`] : []),
    ...(titulos.length ? [`Títulos: ${titulos.join(" | ")}`] : []),
    "Controlos:",
    ...vistos.map((v) => `[${v.ref}] ${v.tipo} «${v.nome}»${v.valor !== undefined ? ` = «${v.valor}»` : ""}${v.estado ? ` (${v.estado})` : ""}`),
  ];
  const texto = compactar(textoVisivel(janela ?? document.querySelector("main")), 500);
  if (texto) linhas.push(`Texto do ecrã: ${texto}`);
  return { texto: linhas.join("\n").slice(0, 4500), elementos: vistos };
}

export const descreverRef = (ref: number): string => {
  const el = elementos.get(ref);
  return el ? `${tipoDe(el)} «${nomeDe(el)}»` : `o controlo ${ref}`;
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Um toque como o de uma pessoa: pressiona, solta e clica (os menus e as listas do painel precisam dos três). */
export function simularToque(el: Element): void {
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const rato = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, view: window } as const;
  el.dispatchEvent(new PointerEvent("pointerdown", { ...rato, isPrimary: true, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mousedown", rato));
  (el as HTMLElement).focus?.();
  el.dispatchEvent(new PointerEvent("pointerup", { ...rato, isPrimary: true, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mouseup", rato));
  el.dispatchEvent(new MouseEvent("click", rato));
}

function doRef(ref: number): Element | string {
  const el = elementos.get(ref);
  if (!el) return `Não há o controlo ${ref}: veja o ecrã outra vez.`;
  if (!el.isConnected) return `O controlo ${ref} já não está no ecrã: veja o ecrã outra vez.`;
  return el;
}

export async function clicar(ref: number): Promise<string> {
  const el = doRef(ref);
  if (typeof el === "string") return el;
  if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return `${descreverRef(ref)} está desativado.`;
  el.scrollIntoView({ block: "center" });
  simularToque(el);
  await esperar(450);
  return "Feito. Veja o ecrã para confirmar o que mudou.";
}

export async function escrever(ref: number, texto: string): Promise<string> {
  const el = doRef(ref);
  if (typeof el === "string") return el;
  const campo = el as HTMLInputElement | HTMLTextAreaElement;
  if (el.getAttribute("contenteditable") === "true") {
    (el as HTMLElement).focus();
    el.textContent = texto;
    el.dispatchEvent(new InputEvent("input", { bubbles: true, data: texto, inputType: "insertText" }));
  } else if ("value" in campo) {
    el.scrollIntoView({ block: "center" });
    campo.focus();
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(campo, texto);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.dispatchEvent(new Event("change", { bubbles: true }));
  } else return `${descreverRef(ref)} não é um campo de escrita.`;
  await esperar(250);
  return `Escrito em ${descreverRef(ref)}.`;
}

/** Abre uma lista (ou um menu) e escolhe a opção cujo texto é o pedido. */
export async function escolher(ref: number, opcao: string): Promise<string> {
  const el = doRef(ref);
  if (typeof el === "string") return el;
  const alvo = opcao.trim().toLowerCase();
  const procurar = () => [...document.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]')].filter((o) => !o.closest(".aia") && visivel(o));
  if (el.tagName === "SELECT") {
    const s = el as HTMLSelectElement;
    const o = [...s.options].find((x) => x.text.trim().toLowerCase() === alvo) ?? [...s.options].find((x) => x.text.toLowerCase().includes(alvo));
    if (!o) return `Opções: ${[...s.options].map((x) => `«${x.text}»`).join(", ")}.`;
    s.value = o.value;
    s.dispatchEvent(new Event("change", { bubbles: true }));
    return `Escolhido «${o.text}».`;
  }
  if (procurar().length === 0) {
    el.scrollIntoView({ block: "center" });
    simularToque(el);
    await esperar(450);
  }
  const opcoes = procurar();
  const o = opcoes.find((x) => compactar(x.textContent ?? "", 120).toLowerCase() === alvo) ?? opcoes.find((x) => (x.textContent ?? "").toLowerCase().includes(alvo));
  if (!o) return opcoes.length ? `Não encontrei «${opcao}». Opções: ${opcoes.map((x) => `«${compactar(x.textContent ?? "", 50)}»`).slice(0, 25).join(", ")}.` : "A lista não abriu: veja o ecrã.";
  const nome = compactar(o.textContent ?? "", 60);
  simularToque(o);
  await esperar(450);
  return `Escolhido «${nome}».`;
}

const TECLAS: Record<string, { key: string; code: string }> = {
  enter: { key: "Enter", code: "Enter" },
  escape: { key: "Escape", code: "Escape" },
  esc: { key: "Escape", code: "Escape" },
  tab: { key: "Tab", code: "Tab" },
  baixo: { key: "ArrowDown", code: "ArrowDown" },
  cima: { key: "ArrowUp", code: "ArrowUp" },
  esquerda: { key: "ArrowLeft", code: "ArrowLeft" },
  direita: { key: "ArrowRight", code: "ArrowRight" },
  espaco: { key: " ", code: "Space" },
};

export async function premirTecla(tecla: string): Promise<string> {
  const t = TECLAS[tecla.trim().toLowerCase()];
  if (!t) return `Teclas possíveis: ${Object.keys(TECLAS).join(", ")}.`;
  const alvo = (document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body) as HTMLElement;
  for (const tipo of ["keydown", "keyup"]) alvo.dispatchEvent(new KeyboardEvent(tipo, { key: t.key, code: t.code, bubbles: true, cancelable: true }));
  if (t.key === "Enter" && alvo.tagName === "INPUT") (alvo as HTMLInputElement).form?.requestSubmit?.();
  await esperar(350);
  return `Premida a tecla ${t.key}.`;
}

export const esperarMs = async (ms: number): Promise<string> => {
  await esperar(Math.min(5000, Math.max(100, ms)));
  return "Esperei.";
};
