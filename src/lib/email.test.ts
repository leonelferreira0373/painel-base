import { describe, expect, it } from "vitest";
import {
  agendarCampanha,
  agendarEmail,
  AUDIENCIAS,
  campanhaNova,
  campanhasDevidas,
  cancelarCampanha,
  contagemPorDia,
  dataNaLista,
  duplicarCampanha,
  emailNovo,
  emailsDevidos,
  encaminhar,
  enderecosDe,
  enviarCampanha,
  enviarEmail,
  erroDaCampanha,
  erroDoAgendamento,
  erroDoEmail,
  erroDosDestinatarios,
  estatisticasSimuladas,
  isoParaLocal,
  localParaIso,
  nomeDe,
  pesquisarEmails,
  quandoFalta,
  responderA,
  rotuloDoDia,
  serieDeCampanhas,
  soEndereco,
  taxaDeAbertura,
  totaisDeCampanhas,
  type CampanhaDeEmail,
} from "./email";

const AGORA = new Date(2026, 9, 29, 10, 0); // 29 out. 2026, 10:00 (hora local)

describe("endereços", () => {
  it("separa por vírgula, ponto e vírgula e linha", () => {
    expect(enderecosDe("a@x.pt, Ana <b@x.pt>;\n c@x.pt ,,")).toEqual(["a@x.pt", "Ana <b@x.pt>", "c@x.pt"]);
  });
  it("tira o endereço e o nome", () => {
    expect(soEndereco("Ana Silva <ana@x.pt>")).toBe("ana@x.pt");
    expect(soEndereco(" ana@x.pt ")).toBe("ana@x.pt");
    expect(nomeDe('"Ana Silva" <ana@x.pt>')).toBe("Ana Silva");
    expect(nomeDe("ana@x.pt")).toBe("ana@x.pt");
  });
  it("diz o primeiro destinatário que não serve", () => {
    expect(erroDosDestinatarios("")).toBe("Escreva para quem vai.");
    expect(erroDosDestinatarios("a@x.pt, joao")).toBe("joao não é um endereço de e-mail.");
    expect(erroDosDestinatarios("a@x.pt, Ana <b@x.pt>")).toBeNull();
    expect(erroDosDestinatarios(Array.from({ length: 51 }, (_, i) => `u${i}@x.pt`).join(","))).toMatch(/No máximo 50/);
  });
});

describe("validação", () => {
  it("o e-mail pede destinatário, assunto e mensagem, por esta ordem", () => {
    expect(erroDoEmail({ para: "", assunto: "", corpo: "" })).toBe("Escreva para quem vai.");
    expect(erroDoEmail({ para: "a@x.pt", assunto: " ", corpo: "x" })).toBe("Escreva o assunto.");
    expect(erroDoEmail({ para: "a@x.pt", assunto: "Olá", corpo: " " })).toBe("Escreva a mensagem.");
    expect(erroDoEmail({ para: "a@x.pt", assunto: "Olá", corpo: "Bom dia" })).toBeNull();
  });
  it("a campanha pede nome, assunto, remetente, audiência e mensagem", () => {
    const c = { nome: "N", assunto: "A", remetente: "Equipa <geral@x.pt>", audiencia: "ativos", corpo: "Olá" };
    expect(erroDaCampanha(c)).toBeNull();
    expect(erroDaCampanha({ ...c, nome: " " })).toBe("Dê um nome à campanha.");
    expect(erroDaCampanha({ ...c, remetente: "" })).toBe("Escolha o remetente.");
    expect(erroDaCampanha({ ...c, audiencia: "zzz" })).toBe("Escolha a audiência.");
    expect(erroDaCampanha({ ...c, corpo: "" })).toBe("Escreva a mensagem.");
  });
  it("o agendamento tem de estar no futuro", () => {
    expect(erroDoAgendamento("", AGORA)).toBe("Escolha o dia e a hora.");
    expect(erroDoAgendamento("2026-10-29T09:00", AGORA)).toBe("Escolha uma hora no futuro.");
    expect(erroDoAgendamento("2026-10-29T10:00", AGORA)).toBe("Escolha uma hora no futuro.");
    expect(erroDoAgendamento("2026-10-30T09:00", AGORA)).toBeNull();
  });
});

describe("datas", () => {
  it("ida e volta entre a hora do seletor e o ISO", () => {
    expect(isoParaLocal(localParaIso("2026-11-02T08:30"))).toBe("2026-11-02T08:30");
  });
  it("hoje, amanhã e os outros dias", () => {
    expect(rotuloDoDia(new Date(2026, 9, 29, 18, 0).toISOString(), AGORA)).toBe("Hoje");
    expect(rotuloDoDia(new Date(2026, 9, 30, 9, 0).toISOString(), AGORA)).toBe("Amanhã");
    expect(rotuloDoDia(new Date(2026, 10, 2, 9, 0).toISOString(), AGORA)).toBe("segunda, 2 nov.");
  });
  it("na lista, a hora de hoje ou a data", () => {
    expect(dataNaLista(new Date(2026, 9, 29, 8, 5).toISOString(), AGORA)).toBe("08:05");
    expect(dataNaLista(new Date(2026, 9, 12, 8, 5).toISOString(), AGORA)).toBe("12 out.");
    expect(dataNaLista(new Date(2025, 11, 31, 8, 5).toISOString(), AGORA)).toBe("31 dez. 2025");
  });
  it("quanto falta", () => {
    const em = (min: number) => new Date(AGORA.getTime() + min * 60_000).toISOString();
    expect(quandoFalta(em(-5), AGORA)).toBe("agora");
    expect(quandoFalta(em(12), AGORA)).toBe("em 12 min");
    expect(quandoFalta(em(180), AGORA)).toBe("em 3 h");
    expect(quandoFalta(em(24 * 60), AGORA)).toBe("em 1 dia");
    expect(quandoFalta(em(3 * 24 * 60), AGORA)).toBe("em 3 dias");
  });
});

describe("mensagens", () => {
  const base = emailNovo("1", { de: "Ana Silva <ana@x.pt>", para: "geral@y.pt", assunto: "Re: Prazo", corpo: "Bom dia\nQuando chega?", pasta: "recebidos", data: new Date(2026, 9, 28, 9, 0).toISOString() }, AGORA);
  it("enviar e agendar mudam de pasta e de estado", () => {
    const e = enviarEmail(agendarEmail(base, "2026-10-30T09:00:00.000Z"), AGORA);
    expect(e).toMatchObject({ pasta: "enviados", estado: "Entregue", data: AGORA.toISOString() });
    expect(agendarEmail(base, "2026-10-30T09:00:00.000Z")).toMatchObject({ pasta: "agendados", estado: "Agendado", data: "2026-10-30T09:00:00.000Z" });
  });
  it("só os agendados com a hora passada saem, à hora marcada", () => {
    const passado = agendarEmail({ ...base, id: "a" }, new Date(2026, 9, 29, 9, 0).toISOString());
    const futuro = agendarEmail({ ...base, id: "b" }, new Date(2026, 9, 29, 15, 0).toISOString());
    const r = emailsDevidos([passado, futuro, base], AGORA);
    expect(r.map((x) => x.id)).toEqual(["a"]);
    expect(r[0]).toMatchObject({ pasta: "enviados", estado: "Entregue", data: passado.data });
  });
  it("responder cita o original e não repete o «Re:»", () => {
    const r = responderA(base);
    expect(r.para).toBe("ana@x.pt");
    expect(r.assunto).toBe("Re: Prazo");
    expect(r.corpo).toContain("> Quando chega?");
    expect(r.corpo).toContain("Ana Silva escreveu");
  });
  it("responder a uma enviada escreve a quem a recebeu", () => {
    expect(responderA({ ...base, pasta: "enviados" }).para).toBe("geral@y.pt");
  });
  it("encaminhar não tem destinatário", () => {
    expect(encaminhar(base)).toMatchObject({ para: "", assunto: "Fwd: Prazo" });
  });
  it("pesquisar ignora acentos e maiúsculas e ordena pelas mais recentes", () => {
    const a = { ...base, id: "a", assunto: "Fatura de outubro", data: "2026-10-01T10:00:00.000Z" };
    const b = { ...base, id: "b", assunto: "Outra FATURA", data: "2026-10-05T10:00:00.000Z" };
    const c = { ...base, id: "c", assunto: "Reunião", corpo: "nada", de: "x@x.pt" };
    expect(pesquisarEmails([a, b, c], "fatura").map((e) => e.id)).toEqual(["b", "a"]);
    expect(pesquisarEmails([a, b, c], "reuniao").map((e) => e.id)).toEqual(["c"]);
    expect(pesquisarEmails([a, b, c], " ")).toHaveLength(3);
  });
});

describe("campanhas", () => {
  const nova = { ...campanhaNova("c1", AGORA, "Equipa <geral@x.pt>"), nome: "Newsletter", assunto: "Novidades", corpo: "Olá", audiencia: "newsletter" };
  it("os números simulados são sempre os mesmos e fazem sentido", () => {
    const a = estatisticasSimuladas("c1", 1000);
    expect(estatisticasSimuladas("c1", 1000)).toEqual(a);
    expect(a.entregues + a.falhas).toBe(1000);
    expect(a.abertos).toBeLessThanOrEqual(a.entregues);
    expect(a.cliques).toBeLessThanOrEqual(a.abertos);
    expect(estatisticasSimuladas("c2", 1000)).not.toEqual(a);
  });
  it("enviar pesa pela audiência e agendar guarda a hora", () => {
    const e = enviarCampanha(nova, AGORA);
    expect(e).toMatchObject({ estado: "Enviada", destinatarios: AUDIENCIAS.newsletter.pessoas, enviadaEm: AGORA.toISOString() });
    expect(taxaDeAbertura(e)).toBeGreaterThan(0.2);
    const ag = agendarCampanha(nova, "2026-10-30T09:00:00.000Z", AGORA);
    expect(ag).toMatchObject({ estado: "Agendada", agendadaPara: "2026-10-30T09:00:00.000Z" });
    expect(cancelarCampanha(ag, AGORA)).toMatchObject({ estado: "Cancelada", agendadaPara: undefined });
  });
  it("as devidas saem à hora marcada, não à de agora", () => {
    const ag = agendarCampanha(nova, new Date(2026, 9, 29, 9, 0).toISOString(), AGORA);
    const futura = agendarCampanha({ ...nova, id: "c2" }, new Date(2026, 9, 29, 18, 0).toISOString(), AGORA);
    const r = campanhasDevidas([ag, futura, nova], AGORA);
    expect(r.map((c) => c.id)).toEqual(["c1"]);
    expect(r[0].enviadaEm).toBe(ag.agendadaPara);
  });
  it("duplicar dá um rascunho sem números", () => {
    const d = duplicarCampanha(enviarCampanha(nova, AGORA), "c9", AGORA);
    expect(d).toMatchObject({ id: "c9", nome: "Newsletter (cópia)", estado: "Rascunho", destinatarios: 0, abertos: 0, enviadaEm: undefined });
  });
  it("os totais só contam as enviadas e pesam as taxas", () => {
    const a = enviarCampanha(nova, new Date(2026, 8, 1));
    const b = enviarCampanha({ ...nova, id: "c2", audiencia: "novos" }, new Date(2026, 8, 20));
    const t = totaisDeCampanhas([a, b, nova]);
    expect(t.enviadas).toBe(2);
    expect(t.destinatarios).toBe(a.destinatarios + b.destinatarios);
    expect(t.aberturas).toBeCloseTo((a.abertos + b.abertos) / (a.entregues + b.entregues), 10);
    expect(totaisDeCampanhas([nova])).toEqual({ enviadas: 0, destinatarios: 0, aberturas: 0, cliques: 0, falhas: 0 });
  });
  it("a série vai da campanha mais antiga à mais recente", () => {
    const a = enviarCampanha({ ...nova, id: "a" }, new Date(2026, 8, 20));
    const b = enviarCampanha({ ...nova, id: "b", audiencia: "novos" }, new Date(2026, 8, 1));
    expect(serieDeCampanhas([a, b, nova], (c) => c.destinatarios)).toEqual([b.destinatarios, a.destinatarios]);
  });
});

describe("contagem por dia", () => {
  it("conta cada item no seu dia e deixa de fora o que passa da janela", () => {
    const datas = [new Date(2026, 9, 29, 23, 0), new Date(2026, 9, 30, 1, 0), new Date(2026, 9, 30, 9, 0), new Date(2026, 10, 10, 9, 0), new Date(2026, 9, 28, 9, 0)].map((d) => d.toISOString());
    expect(contagemPorDia(datas, (d) => d, AGORA, 4)).toEqual([1, 2, 0, 0]);
    expect(contagemPorDia(datas, (d) => d, AGORA, 4, () => 10)).toEqual([10, 20, 0, 0]);
  });
});
