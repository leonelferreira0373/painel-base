import { describe, expect, it } from "vitest";
import { avisoDeTamanho, codigoDoId, eTexto, extrairLigacao, formatarCodigo, formatarDuracaoMs, formatarTamanho, gerarCodigoCurto, idDeTexto, idDoCodigo, lembrarPar, ligacaoDoPar, ligacaoDoSnapshare, nomeDoAparelho, nomeDoColado, normalizarCodigo, percentagem, plataformaDe, tempoQueFalta, velocidade } from "./partilha";

describe("o código de ligação", () => {
  it("tem seis letras e números sem os que se confundem", () => {
    for (let i = 0; i < 50; i++) expect(gerarCodigoCurto()).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(gerarCodigoCurto(() => new Uint32Array([0, 1, 2, 3, 4, 5]))).toBe("ABCDEF");
  });
  it("escreve-se com hífen e lê-se sem ele", () => {
    expect(formatarCodigo("K7MQ3X")).toBe("K7M-Q3X");
    expect(normalizarCodigo(" k7m-q3x ")).toBe("K7MQ3X");
    expect(idDoCodigo("k7m-q3x")).toBe("snap-K7MQ3X");
    expect(idDoCodigo("K7M")).toBeNull();
    expect(codigoDoId("snap-K7MQ3X")).toBe("K7MQ3X");
  });
  it("lê o par de uma ligação (do painel ou do SnapShare), do código ou do identificador", () => {
    expect(idDeTexto("https://painel.exemplo.com/receber/?peer=snap-K7MQ3X")).toBe("snap-K7MQ3X");
    expect(idDeTexto(ligacaoDoSnapshare("snap-K7MQ3X"))).toBe("snap-K7MQ3X");
    expect(idDeTexto("k7m-q3x")).toBe("snap-K7MQ3X");
    expect(idDeTexto("snap-k7mq3x")).toBe("snap-K7MQ3X");
    expect(idDeTexto("olá")).toBeNull();
    expect(idDeTexto("")).toBeNull();
  });
  it("a ligação do painel leva o par e não duplica a barra", () => {
    expect(ligacaoDoPar("snap-K7MQ3X", "https://painel.exemplo.com/")).toBe("https://painel.exemplo.com/receber/?peer=snap-K7MQ3X");
  });
});

describe("o aparelho", () => {
  it("o nome é sempre o mesmo para o mesmo identificador", () => {
    expect(nomeDoAparelho("snap-K7MQ3X", "Android")).toBe(nomeDoAparelho("snap-K7MQ3X", "Android"));
    expect(nomeDoAparelho("snap-K7MQ3X", "PC")).toMatch(/^[\wÀ-ÿ]+-[\wÀ-ÿ-]+-PC$/);
    expect(nomeDoAparelho("snap-K7MQ3X")).not.toMatch(/PC$/);
  });
  it("reconhece a plataforma", () => {
    expect(plataformaDe("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe("iOS");
    expect(plataformaDe("Mozilla/5.0 (Linux; Android 14)")).toBe("Android");
    expect(plataformaDe("Mozilla/5.0 (Windows NT 10.0)")).toBe("PC");
    expect(plataformaDe("x")).toBe("Aparelho");
  });
});

describe("tamanhos, tempos e velocidade", () => {
  it("escreve tamanhos e durações em português", () => {
    expect(formatarTamanho(512)).toBe("512 B");
    expect(formatarTamanho(1536)).toBe("1,5 KB");
    expect(formatarTamanho(5 * 1024 ** 2)).toBe("5,0 MB");
    expect(formatarTamanho(3 * 1024 ** 3)).toBe("3,00 GB");
    expect(formatarDuracaoMs(250)).toBe("250 ms");
    expect(formatarDuracaoMs(2500)).toBe("2,5 s");
    expect(formatarDuracaoMs(95_000)).toBe("1 min 35 s");
  });
  it("calcula a velocidade e o tempo que falta", () => {
    expect(velocidade(2_000_000, 0, 2000)).toBe(1_000_000);
    expect(velocidade(5, 100, 100)).toBe(0);
    expect(tempoQueFalta(10_000_000, 2_000_000, 0, 2000)).toBe(8000);
    expect(tempoQueFalta(10, 10, 0, 1000)).toBeNull();
    expect(tempoQueFalta(10, 0, 0, 1000)).toBeNull();
    expect(percentagem(50, 200)).toBe(25);
    expect(percentagem(5, 0)).toBe(0);
    expect(percentagem(300, 200)).toBe(100);
  });
});

describe("o que se recebe e se envia", () => {
  it("reconhece texto e ligações", () => {
    expect(eTexto("nota.txt", "")).toBe(true);
    expect(eTexto("dados.bin", "text/plain")).toBe(true);
    expect(eTexto("foto.png", "image/png")).toBe(false);
    expect(extrairLigacao("vê isto https://exemplo.pt/a?b=1 depois")).toBe("https://exemplo.pt/a?b=1");
    expect(extrairLigacao("sem ligação")).toBeNull();
  });
  it("dá nome ao que vem da área de transferência", () => {
    const d = new Date("2026-10-29T14:02:11.000Z");
    expect(nomeDoColado("image/png", d)).toBe("area-de-transferencia-2026-10-29T14-02-11.png");
    expect(nomeDoColado("image/jpeg", d)).toMatch(/\.jpg$/);
    expect(nomeDoColado("text/plain", d)).toMatch(/\.txt$/);
    expect(nomeDoColado("application/vnd.api+json", d)).toMatch(/\.vnd\.api$|\.[a-z.]+$/);
  });
  it("avisa dos ficheiros grandes e bloqueia os enormes no telemóvel", () => {
    expect(avisoDeTamanho(10 * 1024 ** 2, false)).toBeNull();
    expect(avisoDeTamanho(600 * 1024 ** 2, false)?.nivel).toBe("aviso");
    expect(avisoDeTamanho(3 * 1024 ** 3, false)?.nivel).toBe("aviso");
    expect(avisoDeTamanho(3 * 1024 ** 3, true)?.nivel).toBe("bloqueio");
  });
  it("lembra os últimos oito aparelhos, o mais recente primeiro e sem repetir", () => {
    let l = [] as ReturnType<typeof lembrarPar>;
    for (let i = 0; i < 10; i++) l = lembrarPar(l, { peerId: `p${i}`, at: i });
    expect(l).toHaveLength(8);
    expect(l[0].peerId).toBe("p9");
    l = lembrarPar(l, { peerId: "p5", at: 99, platform: "PC" });
    expect(l.map((p) => p.peerId)[0]).toBe("p5");
    expect(l.filter((p) => p.peerId === "p5")).toHaveLength(1);
  });
});
