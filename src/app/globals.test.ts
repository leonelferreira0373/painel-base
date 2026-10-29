// Garante que as regras de posição das janelas em globals.css sobrevivem à minificação do CSS de produção. O minificador junta «transform: none» e «translate: none» num só «transform: translate(0)» e perde o translate: a pesquisa rápida, que o Tailwind centra com a propriedade translate, abria deslocada 50 % para a esquerda no telemóvel (e só em produção).
import { readFileSync } from "node:fs";
import { transform } from "lightningcss";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

/** O corpo de uma regra (sem os comentários), pelo seletor. */
function regra(seletor: string): string {
  const inicio = css.indexOf(`${seletor} {`);
  expect(inicio, seletor).toBeGreaterThan(-1);
  return css.slice(css.indexOf("{", inicio) + 1, css.indexOf("}", inicio)).replace(/\/\*[\s\S]*?\*\//g, "");
}

const minificar = (corpo: string) => new TextDecoder().decode(transform({ filename: "regra.css", code: Buffer.from(`a{${corpo}}`), minify: true, targets: { chrome: 100 << 16 } }).code);

describe("globals.css em produção", () => {
  it("a pesquisa rápida no telemóvel continua a anular o translate do Tailwind depois de minificada", () => {
    const minificada = minificar(regra('[role="dialog"][class*="max-w-2xl"]'));
    expect(minificada).toMatch(/translate:0[;!}]/);
    expect(minificada).not.toMatch(/transform:/);
  });
  it("nenhuma regra mistura «transform: none» com «translate: none» (a minificação perderia o translate)", () => {
    for (const bloco of css.match(/\{[^{}]*\}/g) ?? []) {
      const sem = bloco.replace(/\/\*[\s\S]*?\*\//g, "");
      const mistura = /transform:\s*none\s*!important/.test(sem) && /(^|[;\s])translate:\s*none\s*!important/.test(sem);
      // o seletor do popup dos seletores de conta usa o Floating UI (transform inline) e funciona com o transform; o translate dele não conta
      if (mistura) expect(sem).toMatch(/inset:\s*0/);
    }
  });
});
