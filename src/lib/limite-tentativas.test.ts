import { describe, expect, it } from "vitest";
import { aposFalha, CONFIG_OTP, estadoAtual, formatarEspera, mensagemDeFalha, SEM_TENTATIVAS, segundosDeEspera, tentativasRestantes, type EstadoDeTentativas } from "./limite-tentativas";

const t0 = 1_000_000_000_000;
const falhar = (e: EstadoDeTentativas, vezes: number, agora = t0): EstadoDeTentativas => Array.from({ length: vezes }).reduce<EstadoDeTentativas>((s) => aposFalha(s, agora, CONFIG_OTP), e);

describe("limite de tentativas dos códigos", () => {
  it("cada código errado gasta uma tentativa e à quinta o campo fecha 30 segundos", () => {
    let e = falhar(SEM_TENTATIVAS, 1);
    expect(tentativasRestantes(e)).toBe(4);
    expect(segundosDeEspera(e, t0)).toBe(0);
    e = falhar(e, 4);
    expect(segundosDeEspera(e, t0)).toBe(30);
    expect(e.falhas).toBe(0);
    expect(e.nivel).toBe(1);
  });
  it("enquanto está fechado, mais erros não mudam nada", () => {
    const fechado = falhar(SEM_TENTATIVAS, 5);
    expect(aposFalha(fechado, t0 + 5000, CONFIG_OTP)).toBe(fechado);
  });
  it("o fecho cresce de cada vez: 30 s, 1 min, 5 min, 15 min, 1 h (e o último repete-se)", () => {
    let e = SEM_TENTATIVAS;
    const esperados = [30, 60, 300, 900, 3600, 3600];
    let agora = t0;
    for (const s of esperados) {
      e = falhar(e, 5, agora);
      expect(segundosDeEspera(e, agora)).toBe(s);
      agora += s * 1000 + 1000;
    }
  });
  it("depois de uma hora sem erros esquece tudo; com o fecho ainda a correr, não", () => {
    const e = falhar(SEM_TENTATIVAS, 3);
    expect(estadoAtual(e, t0 + 3_599_000)).toBe(e);
    expect(estadoAtual(e, t0 + 3_601_000)).toBe(SEM_TENTATIVAS);
    const fechado = falhar(SEM_TENTATIVAS, 5);
    expect(estadoAtual(fechado, t0 + 10_000)).toBe(fechado);
  });
  it("as frases dizem as tentativas que restam e quanto falta", () => {
    expect(mensagemDeFalha(falhar(SEM_TENTATIVAS, 1), t0)).toBe("Esse código não está certo. Restam 4 tentativas.");
    expect(mensagemDeFalha(falhar(SEM_TENTATIVAS, 4), t0)).toBe("Esse código não está certo. Resta uma tentativa.");
    expect(mensagemDeFalha(falhar(SEM_TENTATIVAS, 5), t0)).toBe("Demasiadas tentativas. Tente de novo dentro de 0:30.");
  });
  it("escreve a espera em minutos e segundos", () => {
    expect(formatarEspera(30)).toBe("0:30");
    expect(formatarEspera(300)).toBe("5:00");
    expect(formatarEspera(3600)).toBe("1:00:00");
    expect(formatarEspera(61)).toBe("1:01");
  });
});
