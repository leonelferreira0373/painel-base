import { describe, expect, it } from "vitest";
import { consumirContexto, textoDoContexto } from "./ia-contexto";

describe("contexto da pergunta", () => {
  it("o texto leva o título, a página e os dados, cortados se forem muitos", () => {
    const t = textoDoContexto({ titulo: "Volume", pagina: "/pagamentos/", dados: { linhas: [1, 2, 3] } });
    expect(t).toContain("Volume");
    expect(t).toContain("em /pagamentos/");
    expect(t).toContain('{"linhas":[1,2,3]}');
    expect(textoDoContexto({ titulo: "x", dados: "y".repeat(100) }, 20)).toContain("(cortado)");
    expect(textoDoContexto({ titulo: "Só o título" })).not.toContain("Dados");
  });
  it("sem nada à espera não há contexto", () => {
    expect(consumirContexto()).toBeNull();
  });
});
