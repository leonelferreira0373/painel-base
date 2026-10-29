import { describe, expect, it } from "vitest";
import { cancelarConvite, conviteNovo, erroDoConvite, expirarConvites, reenviarConvite, responderAoConvite, revogarConvite, totaisDeConvites } from "./convites";

const agora = new Date("2026-10-29T10:00:00.000Z");
const novo = (parcial = {}) => ({ ...conviteNovo("c1", { email: " Ana@Empresa.pt ", funcao: "admin", convidadoPor: "Leonel" }, agora), ...parcial });

describe("convites", () => {
  it("cria um convite pendente que dura sete dias", () => {
    const c = novo();
    expect(c).toMatchObject({ email: "ana@empresa.pt", estado: "Pendente", enviadoEm: agora.toISOString() });
    expect(c.expiraEm).toBe("2026-11-05T10:00:00.000Z");
  });
  it("valida o e-mail, a função e os repetidos", () => {
    expect(erroDoConvite("ana", "admin", [])).toMatch(/e-mail/);
    expect(erroDoConvite("ana@empresa.pt", "", [])).toMatch(/função/);
    expect(erroDoConvite("ANA@empresa.pt", "admin", [novo()])).toMatch(/já tem um convite/);
    expect(erroDoConvite("ana@empresa.pt", "admin", [novo({ estado: "Recusado" })])).toBeNull();
  });
  it("expira só os pendentes cujo prazo passou", () => {
    const depois = new Date("2026-11-06T00:00:00.000Z");
    const [a, b] = expirarConvites([novo(), novo({ id: "c2", estado: "Aceite" })], depois);
    expect(a.estado).toBe("Expirado");
    expect(b.estado).toBe("Aceite");
    expect(expirarConvites([novo()], agora)[0].estado).toBe("Pendente");
  });
  it("a resposta só conta uma vez", () => {
    const aceite = responderAoConvite(novo(), true, agora);
    expect(aceite).toMatchObject({ estado: "Aceite", respondidoEm: agora.toISOString() });
    expect(responderAoConvite(aceite, false, agora).estado).toBe("Aceite");
    expect(responderAoConvite(novo(), false, agora).estado).toBe("Recusado");
  });
  it("cancela e reenvia", () => {
    expect(cancelarConvite(novo(), agora).estado).toBe("Cancelado");
    const outra = new Date("2026-12-01T09:00:00.000Z");
    expect(reenviarConvite(novo({ estado: "Expirado" }), outra)).toMatchObject({ estado: "Pendente", enviadoEm: outra.toISOString(), expiraEm: "2026-12-08T09:00:00.000Z" });
  });
  it("um convite personalizado leva as permissões e mantém-nas ao reenviar", () => {
    const permissoes = { dados: { ver: true, editar: false, fechados: ["x"] } };
    const c = conviteNovo("c9", { email: "rui@empresa.pt", funcao: "pers-c9", convidadoPor: "Leonel", permissoes }, agora);
    expect(c.permissoes).toEqual(permissoes);
    expect(reenviarConvite({ ...c, estado: "Expirado" }, agora).permissoes).toEqual(permissoes);
    expect(conviteNovo("c8", { email: "rui@empresa.pt", funcao: "admin", convidadoPor: "Leonel" }, agora)).not.toHaveProperty("permissoes");
  });
  it("só se revoga o acesso de quem aceitou, e o convite guarda o cargo", () => {
    const aceite = revogarConvite(novo({ estado: "Aceite" }), agora);
    expect(aceite).toMatchObject({ estado: "Revogado", revogadoEm: agora.toISOString() });
    expect(revogarConvite(novo(), agora).estado).toBe("Pendente");
    expect(revogarConvite(aceite, agora).estado).toBe("Revogado");
    expect(conviteNovo("c7", { email: "rui@empresa.pt", funcao: "pers-c7", convidadoPor: "Leonel", cargo: "  Gestor de frota " }, agora).cargo).toBe("Gestor de frota");
    expect(conviteNovo("c6", { email: "rui@empresa.pt", funcao: "admin", convidadoPor: "Leonel" }, agora)).not.toHaveProperty("cargo");
  });
  it("conta por estado", () => {
    expect(totaisDeConvites([novo(), novo({ estado: "Aceite" }), novo({ estado: "Aceite" }), novo({ estado: "Recusado" })])).toEqual({ Pendente: 1, Aceite: 2, Recusado: 1, Expirado: 0, Cancelado: 0, Revogado: 0 });
  });
});
