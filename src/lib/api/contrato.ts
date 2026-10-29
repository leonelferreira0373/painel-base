// O contrato das APIs do super painel: cada ecrã lê os seus dados destes endereços. Com o painel em modo «simulado» os dados vêm de geradores locais (nada sai do navegador); em modo «ligado» vêm de qualquer servidor que cumpra este contrato (ver docs/API.md). Para ligar o painel a um projeto, implementa-se este contrato nesse projeto e põe-se o endereço em Developer tools, «API e ligações».

export type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Endpoint {
  /** Identificador estável (usado nos testes e na documentação). */
  id: string;
  area: "pagamentos" | "marketing" | "dev";
  metodo: Metodo;
  /** O caminho, com «{id}» onde vai um identificador. */
  caminho: string;
  descricao: string;
  /** Um exemplo do corpo da resposta (ou do pedido, nos POST, PUT e PATCH). */
  exemplo: unknown;
}

const PAGAMENTO = { id: "pg-2601", referencia: "PG-02601", cliente: "Cliente Exemplo", metodo: "Transferência", valor: 125000, moeda: "AOA", data: "2026-10-28", estado: "Confirmado", conta: "AO06 0040 0000 1234 5678 1014 2" };
const ERRO = { id: "er-1", nivel: "erro", mensagem: "TypeError: x is undefined", origem: "/api/pedidos", ocorrencias: 14, ultimo: "2026-10-29T03:12:00Z", estado: "Novo" };

export const ENDPOINTS: Endpoint[] = [
  // Pagamentos
  { id: "pagamentos-listar", area: "pagamentos", metodo: "GET", caminho: "/v1/pagamentos", descricao: "Lista os pagamentos (filtros: estado, de, ate, metodo, pagina).", exemplo: { itens: [PAGAMENTO], total: 1 } },
  { id: "pagamentos-criar", area: "pagamentos", metodo: "POST", caminho: "/v1/pagamentos", descricao: "Regista um pagamento.", exemplo: PAGAMENTO },
  { id: "pagamentos-atualizar", area: "pagamentos", metodo: "PATCH", caminho: "/v1/pagamentos/{id}", descricao: "Muda o estado de um pagamento (Confirmado, Recusado, Reembolsado).", exemplo: { estado: "Confirmado" } },
  { id: "pagamentos-metricas", area: "pagamentos", metodo: "GET", caminho: "/v1/pagamentos/metricas", descricao: "Métricas do período: volume, número, ticket médio, taxa de sucesso, por método e por dia.", exemplo: { volume: 3250000, numero: 41, ticketMedio: 79268, taxaDeSucesso: 0.88, porMetodo: [{ metodo: "Transferência", valor: 2100000 }], porDia: [{ data: "2026-10-28", valor: 410000 }] } },
  { id: "comprovativos-listar", area: "pagamentos", metodo: "GET", caminho: "/v1/comprovativos", descricao: "Lista os comprovativos recebidos, com o estado de validação.", exemplo: { itens: [{ id: "cp-1", ficheiro: "comprovativo-0142.pdf", pagamento: "PG-02601", de: "Cliente Exemplo", recebido: "2026-10-28T09:41:00Z", estado: "Por validar", url: "https://…/ficheiros/cp-1" }] } },
  { id: "comprovativos-enviar", area: "pagamentos", metodo: "POST", caminho: "/v1/comprovativos", descricao: "Recebe um comprovativo (multipart/form-data: ficheiro, pagamento, de).", exemplo: { id: "cp-2", estado: "Por validar" } },
  { id: "comprovativos-decidir", area: "pagamentos", metodo: "PATCH", caminho: "/v1/comprovativos/{id}", descricao: "Valida ou rejeita um comprovativo (e, se for validado, confirma o pagamento).", exemplo: { estado: "Validado", nota: "Montante e referência conferem." } },
  { id: "contas-listar", area: "pagamentos", metodo: "GET", caminho: "/v1/contas-bancarias", descricao: "Lista as contas e IBANs configurados.", exemplo: { itens: [{ id: "cb-1", banco: "BAI", titular: "Empresa Exemplo, Lda.", iban: "AO06004000001234567810142", moeda: "AOA", principal: true, ativa: true }] } },
  { id: "contas-guardar", area: "pagamentos", metodo: "PUT", caminho: "/v1/contas-bancarias/{id}", descricao: "Cria ou altera uma conta (o IBAN é validado com o módulo 97).", exemplo: { banco: "BAI", titular: "Empresa Exemplo, Lda.", iban: "AO06004000001234567810142", moeda: "AOA", principal: true, ativa: true } },
  { id: "contas-remover", area: "pagamentos", metodo: "DELETE", caminho: "/v1/contas-bancarias/{id}", descricao: "Remove uma conta.", exemplo: { removida: true } },
  // Marketing
  { id: "eventos-registar", area: "marketing", metodo: "POST", caminho: "/v1/eventos", descricao: "Recebe os eventos do site: visitas e cliques (ver Marketing, «Rastreio»).", exemplo: { tipo: "visita", visitante: "v-8f2a", sessao: "s-91c0", pagina: "/precos", referrer: "https://www.google.com/", utm: { source: "google", medium: "cpc", campaign: "outubro" }, quando: "2026-10-29T03:12:00Z" } },
  { id: "marketing-resumo", area: "marketing", metodo: "GET", caminho: "/v1/marketing/resumo", descricao: "Visitas, visitantes, páginas por visita, taxa de rejeição e conversões do período, com a série por dia.", exemplo: { visitas: 9120, visitantes: 5230, paginasPorVisita: 2.8, rejeicao: 0.41, conversoes: 212, porDia: [{ data: "2026-10-28", visitas: 1290 }] } },
  { id: "marketing-origens", area: "marketing", metodo: "GET", caminho: "/v1/marketing/origens", descricao: "De onde vêm os visitantes: fonte, meio e campanha.", exemplo: { itens: [{ fonte: "google", meio: "organico", campanha: "", visitas: 3100, visitantes: 2200, conversoes: 90 }] } },
  { id: "marketing-paginas", area: "marketing", metodo: "GET", caminho: "/v1/marketing/paginas", descricao: "As páginas mais vistas (as «quentes»), com tempo médio e rejeição.", exemplo: { itens: [{ pagina: "/precos", visitas: 1800, tempoMedio: 74, rejeicao: 0.32, conversoes: 41 }] } },
  { id: "marketing-cliques", area: "marketing", metodo: "GET", caminho: "/v1/marketing/cliques", descricao: "Os botões e ligações mais clicados, por página.", exemplo: { itens: [{ elemento: "Pedir proposta", pagina: "/precos", cliques: 640, visitantes: 520 }] } },
  // Developer tools
  { id: "saude", area: "dev", metodo: "GET", caminho: "/v1/dev/saude", descricao: "Saúde do servidor: CPU, memória, disco, rede, carga, tempo ligado e serviços (contentores).", exemplo: { cpu: 0.23, memoria: 0.58, disco: 0.41, redeEntrada: 120000, redeSaida: 340000, carga: [0.4, 0.5, 0.6], tempoLigado: 1209600, servicos: [{ nome: "web", estado: "saudavel", cpu: 0.02, memoria: 120000000 }] } },
  { id: "pedidos", area: "dev", metodo: "GET", caminho: "/v1/dev/pedidos", descricao: "Os pedidos web mais recentes (filtro «desde» para receber só os novos; chamar de segundo a segundo dá o tempo real).", exemplo: { itens: [{ id: "rq-1", quando: "2026-10-29T03:12:00.120Z", metodo: "GET", caminho: "/precos", estado: 200, ms: 38, ip: "102.67.1.4", pais: "AO", agente: "Chrome 141" }] } },
  { id: "erros-listar", area: "dev", metodo: "GET", caminho: "/v1/dev/erros", descricao: "Os erros agrupados por mensagem, com o número de ocorrências.", exemplo: { itens: [ERRO] } },
  { id: "erros-decidir", area: "dev", metodo: "PATCH", caminho: "/v1/dev/erros/{id}", descricao: "Marca um erro como visto ou resolvido.", exemplo: { estado: "Resolvido" } },
  { id: "bd-tabelas", area: "dev", metodo: "GET", caminho: "/v1/dev/bd/tabelas", descricao: "As tabelas da base de dados: linhas, tamanho e se a segurança por linha (RLS) está ligada.", exemplo: { itens: [{ nome: "utilizadores", linhas: 1240, bytes: 884736, rls: true, politicas: [{ nome: "ver_proprios", comando: "SELECT", expressao: "id = auth.uid()" }] }] } },
  { id: "bd-rls", area: "dev", metodo: "PATCH", caminho: "/v1/dev/bd/tabelas/{nome}/rls", descricao: "Liga ou desliga a segurança por linha de uma tabela.", exemplo: { rls: true } },
  { id: "bd-linhas", area: "dev", metodo: "DELETE", caminho: "/v1/dev/bd/tabelas/{nome}/linhas", descricao: "Apaga linhas de uma tabela (filtro «antes» para só apagar as mais antigas).", exemplo: { antes: "2026-07-01", apagadas: 312 } },
  { id: "backups-listar", area: "dev", metodo: "GET", caminho: "/v1/dev/backups", descricao: "Lista as cópias de segurança.", exemplo: { itens: [{ id: "bk-1", quando: "2026-10-29T02:00:00Z", tipo: "Automático", bytes: 52428800, estado: "Concluído", destino: "s3://copias/painel" }] } },
  { id: "backups-criar", area: "dev", metodo: "POST", caminho: "/v1/dev/backups", descricao: "Cria uma cópia de segurança agora.", exemplo: { id: "bk-2", estado: "A decorrer" } },
  { id: "backups-restaurar", area: "dev", metodo: "POST", caminho: "/v1/dev/backups/{id}/restaurar", descricao: "Restaura uma cópia de segurança.", exemplo: { estado: "A decorrer" } },
  { id: "backups-destino", area: "dev", metodo: "PUT", caminho: "/v1/dev/backups/destino", descricao: "Define para onde vão as cópias (local, S3, SFTP) e o agendamento.", exemplo: { tipo: "s3", endereco: "s3://copias/painel", frequencia: "diaria", hora: "02:00", retencao: 14 } },
  { id: "firewall-estado", area: "dev", metodo: "GET", caminho: "/v1/dev/firewall", descricao: "Estado do firewall (ligado ou desligado) e limite de pedidos por minuto.", exemplo: { ativo: true, limitePorMinuto: 120 } },
  { id: "firewall-ligar", area: "dev", metodo: "PATCH", caminho: "/v1/dev/firewall", descricao: "Liga ou desliga o firewall e muda o limite de pedidos.", exemplo: { ativo: true, limitePorMinuto: 120 } },
  { id: "firewall-regras-listar", area: "dev", metodo: "GET", caminho: "/v1/dev/firewall/regras", descricao: "Lista as regras (permitir ou bloquear um IP, uma gama CIDR ou um país).", exemplo: { itens: [{ id: "fw-1", acao: "bloquear", alvo: "203.0.113.0/24", nota: "Abuso", ativa: true }] } },
  { id: "firewall-regras-guardar", area: "dev", metodo: "PUT", caminho: "/v1/dev/firewall/regras/{id}", descricao: "Cria ou altera uma regra (inclui ligá-la ou desligá-la).", exemplo: { acao: "bloquear", alvo: "203.0.113.0/24", nota: "Abuso", ativa: true } },
  { id: "firewall-regras-remover", area: "dev", metodo: "DELETE", caminho: "/v1/dev/firewall/regras/{id}", descricao: "Apaga uma regra.", exemplo: { removida: true } },
  { id: "firewall-bloqueios", area: "dev", metodo: "GET", caminho: "/v1/dev/firewall/bloqueios", descricao: "Os pedidos bloqueados mais recentes e porquê.", exemplo: { itens: [{ id: "bl-1", quando: "2026-10-29T03:12:00Z", ip: "203.0.113.9", caminho: "/entrar/", motivo: "Regra fw-1" }] } },
  { id: "backups-apagar", area: "dev", metodo: "DELETE", caminho: "/v1/dev/backups/{id}", descricao: "Apaga uma cópia de segurança.", exemplo: { removida: true } },
  { id: "emails-dns", area: "dev", metodo: "GET", caminho: "/v1/dev/emails/dns", descricao: "Verifica o SPF, o DKIM, o DMARC e o PTR do domínio de envio.", exemplo: { itens: [{ nome: "SPF", estado: "ok", detalhe: "v=spf1 mx -all" }] } },
  { id: "paginas-listar", area: "dev", metodo: "GET", caminho: "/v1/dev/paginas", descricao: "As páginas do site e se estão ativas, em manutenção ou desativadas.", exemplo: { itens: [{ caminho: "/precos", estado: "ativa", mensagem: "" }] } },
  { id: "paginas-estado", area: "dev", metodo: "PATCH", caminho: "/v1/dev/paginas", descricao: "Ativa, desativa ou põe uma página em manutenção.", exemplo: { caminho: "/precos", estado: "manutencao", mensagem: "Voltamos já." } },
  { id: "emails-listar", area: "dev", metodo: "GET", caminho: "/v1/dev/emails", descricao: "O registo dos e-mails enviados e o que aconteceu a cada um.", exemplo: { itens: [{ id: "em-1", para: "cliente@exemplo.pt", assunto: "Pedido confirmado", estado: "Entregue", quando: "2026-10-29T03:10:00Z" }] } },
  { id: "emails-configuracao", area: "dev", metodo: "PUT", caminho: "/v1/dev/emails/configuracao", descricao: "Define o fornecedor de e-mail (SMTP) e o remetente.", exemplo: { servidor: "smtp.exemplo.pt", porta: 587, utilizador: "envios", remetente: "Painel <nao-responder@exemplo.pt>" } },
  { id: "emails-teste", area: "dev", metodo: "POST", caminho: "/v1/dev/emails/teste", descricao: "Envia um e-mail de teste e devolve o resultado do envio.", exemplo: { para: "eu@exemplo.pt" } },
  { id: "limpeza", area: "dev", metodo: "POST", caminho: "/v1/dev/limpeza", descricao: "Apaga dados de manutenção: cache, logs antigos, ficheiros temporários, dados de teste.", exemplo: { alvo: "logs", antes: "2026-09-29" } },
];

/** O endpoint com este identificador. */
export const endpointPorId = (id: string) => ENDPOINTS.find((e) => e.id === id);

/** O pedido de um endpoint como comando curl, com o endereço e o token da ligação. */
export function comoCurl(e: Endpoint, base: string, token: string): string {
  const corpo = e.metodo === "GET" || e.metodo === "DELETE" ? "" : ` \\\n  -H 'Content-Type: application/json' \\\n  -d '${JSON.stringify(e.exemplo)}'`;
  return `curl -X ${e.metodo} '${base.replace(/\/$/, "")}${e.caminho}' \\\n  -H 'Authorization: Bearer ${token || "<token>"}'${corpo}`;
}

/** O contrato como documento OpenAPI 3.1 (para importar noutras ferramentas). */
export function paraOpenApi(titulo: string): object {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const e of ENDPOINTS) {
    paths[e.caminho] = {
      ...(paths[e.caminho] ?? {}),
      [e.metodo.toLowerCase()]: {
        tags: [e.area],
        operationId: e.id,
        summary: e.descricao,
        security: [{ bearer: [] }],
        ...(e.metodo === "GET" || e.metodo === "DELETE" ? {} : { requestBody: { content: { "application/json": { example: e.exemplo } } } }),
        responses: { "200": { description: "Sucesso", content: { "application/json": { example: e.exemplo } } }, "401": { description: "Sem autorização" } },
      },
    };
  }
  return { openapi: "3.1.0", info: { title: titulo, version: "1.0.0" }, components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } } }, paths };
}
