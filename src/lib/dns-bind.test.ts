import { describe, expect, it } from "vitest";
import { deBind, erroDoRegistoDns, paraBind, textoDoTtl, ttlDe, type RegistoDns } from "./dns-bind";

const r = (p: Partial<RegistoDns> & Pick<RegistoDns, "tipo" | "nome" | "valor">, i = 1): RegistoDns => ({ id: `r${i}`, ttl: 300, ...p });
const id = (n: number) => `id${n}`;

describe("paraBind", () => {
  const registos = [r({ tipo: "A", nome: "@", valor: "203.0.113.10" }), r({ tipo: "CNAME", nome: "www", valor: "exemplo.com" }, 2), r({ tipo: "MX", nome: "@", valor: "mail.exemplo.com", prioridade: 10 }, 3), r({ tipo: "TXT", nome: "@", valor: 'v=spf1 mx "-all"', ttl: 1, comentario: "SPF" }, 4)];
  const zona = paraBind("exemplo.com", registos, new Date("2026-10-29T10:00:00Z"));
  it("escreve a origem, o TTL e uma linha por registo", () => {
    expect(zona).toContain("$ORIGIN exemplo.com.");
    expect(zona).toContain("@\t300\tIN\tA\t203.0.113.10");
    expect(zona).toContain("www\t300\tIN\tCNAME\texemplo.com.");
    expect(zona).toContain("@\t300\tIN\tMX\t10 mail.exemplo.com.");
  });
  it("escreve o TXT entre aspas, com as aspas de dentro protegidas, o TTL automático como 300 e o comentário", () => {
    expect(zona).toContain('@\t300\tIN\tTXT\t"v=spf1 mx \\"-all\\"" ; SPF');
  });
  it("parte os TXT compridos em pedaços de 255", () => {
    const longo = paraBind("exemplo.com", [r({ tipo: "TXT", nome: "k", valor: "a".repeat(300) })]);
    expect(longo.match(/"a+"/g)?.map((x) => x.length - 2)).toEqual([255, 45]);
  });
});

describe("deBind", () => {
  it("lê o que paraBind escreve", () => {
    const registos = [r({ tipo: "A", nome: "@", valor: "203.0.113.10" }), r({ tipo: "CNAME", nome: "www", valor: "exemplo.com" }, 2), r({ tipo: "MX", nome: "@", valor: "mail.exemplo.com", prioridade: 10 }, 3), r({ tipo: "TXT", nome: "@", valor: 'v=spf1 mx "-all"' }, 4), r({ tipo: "SRV", nome: "_sip._tcp", valor: "5 5060 sip.exemplo.com", prioridade: 20 }, 5), r({ tipo: "CAA", nome: "@", valor: '0 issue "letsencrypt.org"' }, 6)];
    const lida = deBind(paraBind("exemplo.com", registos), "", id);
    expect(lida.erros).toEqual([]);
    expect(lida.zona).toBe("exemplo.com");
    expect(lida.registos.map(({ id: _id, ...x }) => x)).toEqual(registos.map(({ id: _id, ...x }) => x));
  });
  it("entende nomes relativos e absolutos, classe, TTL com unidades, $ORIGIN e o dono repetido", () => {
    const t = `$ORIGIN exemplo.com.
$TTL 1h
@ IN A 192.0.2.1
www 2h IN A 192.0.2.2
    IN AAAA 2001:db8::2
mail.exemplo.com. 300 IN A 192.0.2.3
ftp IN CNAME www
blog IN CNAME exemplo.org.`;
    const { registos, erros } = deBind(t, "", id);
    expect(erros).toEqual([]);
    expect(registos.map((x) => [x.nome, x.tipo, x.valor, x.ttl])).toEqual([
      ["@", "A", "192.0.2.1", 3600],
      ["www", "A", "192.0.2.2", 7200],
      ["www", "AAAA", "2001:db8::2", 3600],
      ["mail", "A", "192.0.2.3", 300],
      ["ftp", "CNAME", "www.exemplo.com", 3600],
      ["blog", "CNAME", "exemplo.org", 3600],
    ]);
  });
  it("ignora o SOA e os comentários, junta as linhas entre parênteses e os TXT partidos", () => {
    const t = `; um comentário
$ORIGIN exemplo.com.
@ IN SOA ns1.exemplo.com. admin.exemplo.com. (
   2026102901 ; serial
   7200 3600 1209600 300 )
@ IN TXT ( "v=DKIM1; k=rsa; "
           "p=ABC123" ) ; chave
@ 600 IN MX 20 mail2`;
    const { registos, erros } = deBind(t, "", id);
    expect(erros).toEqual([]);
    expect(registos).toHaveLength(2);
    expect(registos[0]).toMatchObject({ tipo: "TXT", valor: "v=DKIM1; k=rsa; p=ABC123" });
    expect(registos[1]).toMatchObject({ tipo: "MX", prioridade: 20, valor: "mail2.exemplo.com", ttl: 600 });
  });
  it("diz o que não percebeu e continua", () => {
    const { registos, erros } = deBind("$ORIGIN exemplo.com.\n@ IN HINFO a b\n@ IN MX mail\n@ IN A 192.0.2.1\n$INCLUDE x.zone", "", id);
    expect(registos).toHaveLength(1);
    expect(erros).toHaveLength(3);
    expect(erros[0]).toMatch(/HINFO/);
    expect(erros[1]).toMatch(/MX/);
    expect(erros[2]).toMatch(/\$INCLUDE/);
  });
  it("usa a zona dada quando não há $ORIGIN", () => {
    const { zona, registos } = deBind("www IN CNAME @", "exemplo.com", id);
    expect(zona).toBe("exemplo.com");
    expect(registos[0]).toMatchObject({ nome: "www", valor: "exemplo.com" });
  });
});

describe("tempos", () => {
  it("lê as unidades", () => {
    expect(ttlDe("300")).toBe(300);
    expect(ttlDe("1h")).toBe(3600);
    expect(ttlDe("1w")).toBe(604_800);
    expect(ttlDe("IN")).toBeNull();
  });
  it("escreve em palavras", () => {
    expect(textoDoTtl(1)).toBe("Auto");
    expect(textoDoTtl(300)).toBe("5 min");
    expect(textoDoTtl(3600)).toBe("1 h");
    expect(textoDoTtl(86_400)).toBe("1 d");
    expect(textoDoTtl(90)).toBe("90 s");
  });
});

describe("erroDoRegistoDns", () => {
  const ok = { tipo: "A" as const, nome: "www", valor: "203.0.113.10", ttl: 300 };
  it("aceita registos certos", () => {
    expect(erroDoRegistoDns(ok)).toBeNull();
    expect(erroDoRegistoDns({ ...ok, tipo: "AAAA", valor: "2001:db8::1" })).toBeNull();
    expect(erroDoRegistoDns({ ...ok, tipo: "CNAME", valor: "exemplo.com." })).toBeNull();
    expect(erroDoRegistoDns({ ...ok, tipo: "MX", nome: "@", valor: "mail.exemplo.com", prioridade: 10 })).toBeNull();
    expect(erroDoRegistoDns({ ...ok, tipo: "SRV", nome: "_sip._tcp", valor: "5 5060 sip.exemplo.com", prioridade: 20 })).toBeNull();
    expect(erroDoRegistoDns({ ...ok, tipo: "CAA", nome: "@", valor: '0 issue "letsencrypt.org"' })).toBeNull();
    expect(erroDoRegistoDns({ ...ok, tipo: "TXT", nome: "@", valor: "v=spf1 mx -all", ttl: 1 })).toBeNull();
  });
  it("diz o que está mal", () => {
    expect(erroDoRegistoDns({ ...ok, valor: "999.1.1.1" })).toMatch(/IPv4/);
    expect(erroDoRegistoDns({ ...ok, tipo: "AAAA", valor: "203.0.113.10" })).toMatch(/IPv6/);
    expect(erroDoRegistoDns({ ...ok, nome: "a b" })).toMatch(/nome/);
    expect(erroDoRegistoDns({ ...ok, valor: " " })).toMatch(/conteúdo/);
    expect(erroDoRegistoDns({ ...ok, ttl: 30 })).toMatch(/TTL/);
    expect(erroDoRegistoDns({ ...ok, tipo: "MX", valor: "mail.exemplo.com" })).toMatch(/prioridade/);
    expect(erroDoRegistoDns({ ...ok, tipo: "CAA", valor: "issue letsencrypt.org" })).toMatch(/CAA/);
  });
});
