import { describe, expect, it } from "vitest";
import { gerarEmails } from "@/dados/email";
import { analisarContactos, contactoDe, contactoCorresponde, descreverEspera, metricasDeContactos } from "./email-contactos";

const agora = new Date("2026-10-29T12:00:00.000Z");
const emails = gerarEmails(agora);
const c = analisarContactos(emails, agora);

describe("o estado de cada contacto", () => {
  it("urgente: pede algo com pressa e ainda não foi atendido", () => {
    expect(c["marta.pinto@atlascomercio.pt"].principal).toBe("urgente");
    expect(c["marta.pinto@atlascomercio.pt"].motivo).toContain("urgência");
  });
  it("quente: um interessado que escreveu há pouco", () => {
    expect(c["rui.matos@boreal.pt"].principal).toBe("quente");
    expect(c["luis.teixeira@estreladosul.pt"].principal).toBe("quente");
  });
  it("atendido: a última mensagem tem resposta nossa", () => {
    expect(c["paulo.mendes@fenix.pt"].principal).toBe("atendido");
    expect(c["sara.lopes@atlascomercio.pt"].principal).toBe("atendido");
    expect(c["vera.almeida@cerne.pt"].estados).toEqual(expect.arrayContaining(["atendido", "lead", "frio"]));
  });
  it("visto, frio e automático", () => {
    expect(c["faturacao@delta-servicos.pt"].principal).toBe("visto");
    expect(c["tomas.ribeiro@boreal.pt"].principal).toBe("frio");
    const sistema = Object.values(c).find((x) => x.endereco.startsWith("mailer-daemon@"));
    expect(sistema?.principal).toBe("automatico");
  });
  it("sem resposta durante três dias, qualquer pedido fica urgente", () => {
    const depois = new Date(agora.getTime() + 4 * 86_400_000);
    expect(analisarContactos(emails, depois)["faturacao@delta-servicos.pt"].principal).toBe("urgente");
  });
  it("a mesma pessoa em maiúsculas e minúsculas é um só contacto", () => {
    const m = [...emails, { ...emails[2], id: "x", de: "Faturação Delta <FATURACAO@Delta-Servicos.pt>", data: new Date(agora.getTime() - 3_600_000).toISOString() }];
    expect(analisarContactos(m, agora)["faturacao@delta-servicos.pt"].recebidas).toBe(2);
  });
  it("o contacto de uma mensagem recebida é quem escreveu; o de uma enviada, o primeiro destinatário", () => {
    expect(contactoDe(emails.find((e) => e.id === "em-r2")!, c)?.nome).toBe("Rui Matos");
    expect(contactoDe(emails.find((e) => e.id === "em-e1")!, c)?.endereco).toBe("marta.pinto@atlascomercio.pt");
  });
});

describe("as métricas dos contactos", () => {
  const m = metricasDeContactos(c, emails);
  it("conta urgentes, leads e a taxa de resposta (sem os automáticos)", () => {
    expect(m.urgentes).toBe(1);
    expect(m.leads).toBeGreaterThanOrEqual(3);
    expect(m.taxaDeResposta).toBeGreaterThan(0);
    expect(m.taxaDeResposta).toBeLessThanOrEqual(1);
    expect(m.contactos).toBe(Object.keys(c).length);
  });
  it("os estados principais somam o número de contactos", () => {
    expect(Object.values(m.porEstado).reduce((s, x) => s + x, 0)).toBe(m.contactos);
  });
  it("mede em horas o tempo até à primeira resposta", () => {
    expect(m.horasAteResponder).not.toBeNull();
    expect(m.horasAteResponder!).toBeGreaterThan(0);
  });
});

describe("o resto", () => {
  it("descreve a espera", () => {
    expect(descreverEspera(0.2)).toBe("há menos de uma hora");
    expect(descreverEspera(5)).toBe("há 5 h");
    expect(descreverEspera(48)).toBe("há 2 dias");
    expect(descreverEspera(24)).toBe("há 1 dia");
  });
  it("a pesquisa vê o nome e o endereço", () => {
    const r = c["rui.matos@boreal.pt"];
    expect(contactoCorresponde(r, "matos")).toBe(true);
    expect(contactoCorresponde(r, "boreal")).toBe(true);
    expect(contactoCorresponde(r, "zzz")).toBe(false);
    expect(contactoCorresponde(r, "")).toBe(true);
  });
});
