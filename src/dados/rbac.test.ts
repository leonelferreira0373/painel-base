import { describe, expect, it } from "vitest";
import { AREAS } from "./estrutura";
import { REGISTOS } from "./modulos";
import { FUNCOES, funcaoPorId, podeEditar, podeVer } from "./rbac";

const AREAS_DO_SUPER = ["pagamentos", "marketing", "dev"];

describe("permissões das áreas de pagamentos, marketing e ferramentas de programador", () => {
  it("o administrador vê e altera as três áreas", () => {
    const admin = funcaoPorId("administrador");
    for (const a of AREAS_DO_SUPER) {
      expect(podeVer(admin, a), a).toBe(true);
      expect(podeEditar(admin, a), a).toBe(true);
    }
  });

  it("há uma função que só vê pagamentos e ferramentas de programador, e altera o marketing", () => {
    const analista = funcaoPorId("analista");
    expect(podeVer(analista, "pagamentos")).toBe(true);
    expect(podeEditar(analista, "pagamentos")).toBe(false);
    expect(podeVer(analista, "dev")).toBe(true);
    expect(podeEditar(analista, "dev")).toBe(false);
    expect(podeEditar(analista, "marketing")).toBe(true);
  });

  it("quem não vê uma área também não a altera", () => {
    for (const f of FUNCOES) for (const a of AREAS_DO_SUPER) if (!podeVer(f, a)) expect(podeEditar(f, a), `${f.id} em ${a}`).toBe(false);
  });

  it("os módulos de registos só dão passos a funções que podem alterar a área", () => {
    for (const a of AREAS.filter((x) => AREAS_DO_SUPER.includes(x.id))) {
      for (const m of a.modulos) {
        for (const t of REGISTOS[m.id]?.transicoes ?? []) {
          for (const id of t.funcoes) expect(podeEditar(funcaoPorId(id), a.id, m.id), `«${t.rotulo}» em ${m.id} dá o passo a ${id}, que só vê`).toBe(true);
        }
      }
    }
  });
});
