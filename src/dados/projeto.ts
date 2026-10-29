// Identidade do projeto: o endereço público do site, usado nos metadados, no robots e no mapa do site.
// Tudo o resto que é de um produto concreto (menu, módulos, funções, textos, painéis) vive nos outros ficheiros desta pasta.
export const PROJETO = {
  /** O nome da empresa que recebe os pagamentos (nos dados de demonstração das contas bancárias). */
  empresa: "Empresa Exemplo, Lda.",
  /** Identificador da conta, no meio de todos os endereços (como o da Cloudflare): /<conta>/<área>/<módulo>/. É de demonstração. */
  contaId: "d3db8c5cbd4a2c0bbf49138e58e3a4a4",
  urlSite: process.env.NEXT_PUBLIC_URL_SITE || "https://painel.exemplo.com",
} as const;
