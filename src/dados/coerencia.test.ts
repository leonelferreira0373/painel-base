// Garante que os ficheiros de dados do projeto (menu, módulos, funções, dicas e página inicial) continuam coerentes entre si.
// Corre com `npm test`: quem acrescenta um módulo e se esquece de um passo da receita (docs/ADICIONAR-MODULO.md) vê aqui o que falta.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SIGNIFICADO_ESTADO } from "./dicas";
import { AREAS, caminho } from "./estrutura";
import { REGISTOS } from "./modulos";
import { MODULO_NOTIFICACOES } from "./notificacoes";
import { FUNCOES } from "./rbac";
import { AVISO_VISAO, CARTAO_ANEL, CARTOES_SERIE, LISTAS_VISAO } from "./visao";
import { DICA_CARTAO } from "./dicas";

const modulos = AREAS.flatMap((a) => a.modulos.map((m) => ({ area: a.id, ...m })));
const caminhos = new Set(modulos.map((m) => caminho(m.area, m.id)));
const idsDeModulos = new Set(modulos.map((m) => m.id));
const idsDeAreas = new Set(AREAS.map((a) => a.id));
const painelRegistados = [...readFileSync(new URL("../components/Paineis.tsx", import.meta.url), "utf8").matchAll(/^\s{2}([a-z0-9-]+|"[a-z0-9-]+"):\s*\(\)\s*=>/gm)].map((m) => m[1].replaceAll('"', ""));

describe("menu", () => {
  it("não repete áreas nem módulos", () => {
    expect(idsDeAreas.size).toBe(AREAS.length);
    expect(idsDeModulos.size).toBe(modulos.length);
  });

  it("cada módulo de registos tem a sua definição e cada definição tem o seu módulo", () => {
    for (const m of modulos.filter((x) => x.tipo === "registos")) expect(REGISTOS[m.id], `falta REGISTOS["${m.id}"]`).toBeDefined();
    const deRegistos = new Set(modulos.filter((x) => x.tipo === "registos").map((x) => x.id));
    for (const id of Object.keys(REGISTOS)) expect(deRegistos.has(id), `REGISTOS["${id}"] não está no menu (estrutura.ts)`).toBe(true);
  });

  it("cada módulo do tipo «painel» está registado em PAINEIS (components/Paineis.tsx)", () => {
    for (const m of modulos.filter((x) => x.tipo === "painel")) expect(painelRegistados, `falta "${m.id}" em PAINEIS`).toContain(m.id);
  });
});

describe("registos", () => {
  for (const def of Object.values(REGISTOS)) {
    describe(def.id, () => {
      const colunas = new Set(def.colunas.map((c) => c.chave));
      const linhas = def.semente();

      it("o `id` da definição é a chave", () => {
        expect(REGISTOS[def.id]).toBe(def);
      });

      it("os dados de partida têm identificadores únicos e todas as colunas", () => {
        expect(new Set(linhas.map((l) => l.id)).size).toBe(linhas.length);
        for (const l of linhas) for (const c of colunas) expect(l, `linha ${l.id} sem «${c}»`).toHaveProperty(c);
      });

      it("os campos do formulário têm chave única e as opções que o tipo pede", () => {
        expect(new Set(def.campos.map((c) => c.chave)).size).toBe(def.campos.length);
        for (const c of def.campos) if (c.tipo === "opcoes") expect(c.opcoes?.length, `campo «${c.chave}» sem opções`).toBeGreaterThan(0);
      });

      it("os gráficos apontam para colunas que existem", () => {
        for (const g of def.graficos) for (const k of [g.por, g.data, g.medida]) if (k) expect(colunas.has(k), `gráfico «${g.titulo}»: coluna «${k}»`).toBe(true);
      });

      if (def.estadoChave) {
        const chave = def.estadoChave;
        const estados = new Set(linhas.map((l) => String(l[chave])));
        it("a coluna de estado existe e é do tipo «estado»", () => {
          expect(def.colunas.find((c) => c.chave === chave)?.tipo).toBe("estado");
        });
        it("o estado inicial e as transições usam estados conhecidos, de funções que existem", () => {
          const conhecidos = new Set([...estados, ...(def.transicoes ?? []).flatMap((t) => [...t.de, t.para])]);
          if (def.estadoInicial) expect(conhecidos.has(def.estadoInicial), `estado inicial «${def.estadoInicial}»`).toBe(true);
          for (const t of def.transicoes ?? []) for (const f of t.funcoes) expect(FUNCOES.some((x) => x.id === f), `função «${f}» em «${t.rotulo}»`).toBe(true);
        });
        it("cada estado tem o seu significado nas dicas (dados/dicas.ts)", () => {
          const todos = new Set([...estados, ...(def.transicoes ?? []).flatMap((t) => [...t.de, t.para])]);
          for (const e of todos) expect(SIGNIFICADO_ESTADO[def.id]?.[e] ?? SIGNIFICADO_ESTADO["*"][e], `sem dica para «${e}» em ${def.id}`).toBeTruthy();
        });
        it("as transições com `notifica` têm para onde enviar", () => {
          if ((def.transicoes ?? []).some((t) => t.notifica)) expect(REGISTOS[MODULO_NOTIFICACOES]).toBeDefined();
        });
      }
    });
  }
});

describe("funções", () => {
  it("só falam de áreas e módulos que existem", () => {
    for (const f of FUNCOES) {
      for (const a of Object.keys(f.areas)) expect(idsDeAreas.has(a), `${f.id}: área «${a}»`).toBe(true);
      for (const m of f.fechados ?? []) expect(idsDeModulos.has(m), `${f.id}: módulo «${m}»`).toBe(true);
    }
  });
  it("têm identificadores únicos", () => {
    expect(new Set(FUNCOES.map((f) => f.id)).size).toBe(FUNCOES.length);
  });
});

describe("página inicial", () => {
  it("os cartões e as listas apontam para módulos, colunas e ligações que existem", () => {
    for (const c of CARTOES_SERIE) {
      expect(REGISTOS[c.registos], `cartão «${c.id}»: módulo «${c.registos}»`).toBeDefined();
      expect(REGISTOS[c.registos].colunas.some((x) => x.chave === c.campo), `cartão «${c.id}»: coluna «${c.campo}»`).toBe(true);
      expect(caminhos.has(c.href), `cartão «${c.id}»: ligação ${c.href}`).toBe(true);
      expect(DICA_CARTAO[c.id], `cartão «${c.id}» sem dica (dicas.ts)`).toBeTruthy();
    }
    for (const l of LISTAS_VISAO) {
      expect(REGISTOS[l.registos], `lista «${l.id}»`).toBeDefined();
      expect(caminhos.has(l.href), `lista «${l.id}»: ligação ${l.href}`).toBe(true);
    }
    for (const r of [CARTAO_ANEL, AVISO_VISAO]) {
      expect(REGISTOS[r.registos]).toBeDefined();
      expect(caminhos.has(r.href)).toBe(true);
    }
    expect(DICA_CARTAO[CARTAO_ANEL.id]).toBeTruthy();
    expect(idsDeModulos.has(AVISO_VISAO.modulo)).toBe(true);
  });
});
