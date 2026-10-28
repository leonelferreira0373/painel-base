// Atalhos de teclado configuráveis: lê a combinação de um evento do teclado («Ctrl+Shift+K»), valida-a e junta os atalhos de origem com os que o utilizador mudou.
import { ATALHOS } from "@/dados/atalhos";

const PONTUACAO: Record<string, string> = { Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'", Backslash: "\\", BracketLeft: "[", BracketRight: "]", Minus: "-", Equal: "=", Backquote: "`" };

/** A combinação de um evento, por exemplo «Ctrl+Shift+K»; devolve null enquanto só há teclas modificadoras premidas. Cmd (Mac) conta como Ctrl. */
export function combinacaoDe(e: KeyboardEvent): string | null {
  if (["Control", "Shift", "Alt", "Meta", "AltGraph", "Dead", "Unidentified"].includes(e.key)) return null;
  let tecla: string;
  if (/^Key[A-Z]$/.test(e.code)) tecla = e.code.slice(3);
  else if (/^Digit[0-9]$/.test(e.code)) tecla = e.code.slice(5);
  else if (PONTUACAO[e.code]) tecla = PONTUACAO[e.code];
  else tecla = e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const partes: string[] = [];
  if (e.ctrlKey || e.metaKey) partes.push("Ctrl");
  if (e.altKey) partes.push("Alt");
  if (e.shiftKey) partes.push("Shift");
  partes.push(tecla);
  return partes.join("+");
}

/** Combinações que o navegador ou o sistema já usam: não se deixam atribuir. */
const RESERVADAS = new Set(["Ctrl+C", "Ctrl+V", "Ctrl+X", "Ctrl+A", "Ctrl+Z", "Ctrl+Y", "Ctrl+W", "Ctrl+T", "Ctrl+N", "Ctrl+R", "Ctrl+P", "Ctrl+S", "Ctrl+F", "Ctrl+L", "Ctrl+Q", "Ctrl+Shift+N", "Ctrl+Shift+T", "Alt+F4", "F5", "F11", "F12", "Tab", "Enter", "Escape"]);

/** O que há de errado com uma combinação para um atalho, ou null se serve. `atuais` são os atalhos em vigor (identificador → combinação). */
export function erroDeCombinacao(combinacao: string, id: string, atuais: Record<string, string>): string | null {
  if (!combinacao.includes("+") && !/^F\d{1,2}$/.test(combinacao)) return "Junte Ctrl ou Alt a uma tecla.";
  if (/^(Shift\+)?[A-Z0-9]$/.test(combinacao)) return "Junte Ctrl ou Alt a uma tecla.";
  if (RESERVADAS.has(combinacao)) return "Essa combinação é do navegador.";
  const outro = ATALHOS.find((a) => a.id !== id && atuais[a.id] === combinacao);
  return outro ? `Já é usada em «${outro.rotulo}».` : null;
}

/** «Ctrl+K» → «Ctrl + K». */
export const mostrarCombinacao = (c: string) => c.replaceAll("+", " + ");

/** Os atalhos em vigor: os de origem, com as mudanças do utilizador por cima. */
export function atalhosEfetivos(personalizados?: Record<string, string>): Record<string, string> {
  return Object.fromEntries(ATALHOS.map((a) => [a.id, personalizados?.[a.id] ?? a.padrao]));
}
