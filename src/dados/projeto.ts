// Identidade do projeto: o endereço público do site, usado nos metadados, no robots e no mapa do site.
// Tudo o resto que é de um produto concreto (menu, módulos, funções, textos, painéis) vive nos outros ficheiros desta pasta.
export const PROJETO = {
  urlSite: process.env.NEXT_PUBLIC_URL_SITE || "https://painel.exemplo.com",
} as const;
