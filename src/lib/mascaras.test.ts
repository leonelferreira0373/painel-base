// Testes das máscaras de escrita: só números entram e os separadores põem-se sozinhos.
import { describe, expect, it } from "vitest";
import { mascaraDataHora } from "./mascaras";

describe("máscara de data e hora", () => {
  it("põe os separadores à medida que se escreve", () => {
    expect(mascaraDataHora("2026")).toBe("2026");
    expect(mascaraDataHora("20261")).toBe("2026-1");
    expect(mascaraDataHora("202610")).toBe("2026-10");
    expect(mascaraDataHora("20261028")).toBe("2026-10-28");
    expect(mascaraDataHora("2026102814")).toBe("2026-10-28 14");
    expect(mascaraDataHora("202610281430")).toBe("2026-10-28 14:30");
  });
  it("ignora o que não é número e o que passa do tamanho", () => {
    expect(mascaraDataHora("2026-10-28 14:30")).toBe("2026-10-28 14:30");
    expect(mascaraDataHora("20261028143099")).toBe("2026-10-28 14:30");
    expect(mascaraDataHora("ab")).toBe("");
  });
});
