# Painel base

**PT** — Base de código aberto para painéis de administração, no estilo do painel da Cloudflare: Next.js 15 (exportação estática), React 19, [`@cloudflare/kumo`](https://github.com/cloudflare/kumo), Tailwind v4 e ECharts. Vem com menu lateral, módulos de registos com fluxo de estados, página inicial com métricas, definições da conta, tema claro e escuro, páginas de entrada, um serviço de autenticação e uma análise de dados que corre toda no navegador.

**EN** — Open-source base for admin panels in the style of the Cloudflare dashboard (Next.js 15 static export, React 19, Kumo, Tailwind 4, ECharts). Everything project-specific lives in `src/dados/`; the UI rules and the recipes for adding modules are in `docs/`. The interface is in Portuguese (pt-PT). Not affiliated with Cloudflare.

## O que traz

- **Estrutura do painel:** barra lateral de ícones que se expande, cabeçalho com o caminho da página, pesquisa rápida (Ctrl+K), perfil, gaveta no telemóvel.
- **Módulos de registos** gerados por configuração: tabela com pesquisa, ordenação e paginação, formulário de novo registo, fluxo de estados com permissões por função, notificações e gráficos.
- **Página inicial** com cartões de métricas (período, tipo de gráfico, esqueletos de carregamento), listas curtas e faixa de aviso.
- **Controlo de acesso por função** (demonstração; ver `docs/AUTENTICACAO.md`).
- **Definições da conta:** perfil, segurança, e-mail e telefone, notificações, lembretes, aparência, chaves de acesso pessoais, dados e privacidade.
- **Entrada:** entrar, registar, recuperar palavra-passe e e-mail, verificação em dois passos, páginas legais.
- **Tema claro e escuro**, desvanecimento nas pontas das áreas com scroll, dicas em todo o lado, estados vazios e de carregamento.
- **Análise de dados no navegador:** CSV, JSON, XML, Excel, PDF (com OCR), Word, ZIP, e-mails e imagens → perfil, qualidade, gráficos, exportação em CSV, Excel e PDF. Nada sai do dispositivo.
- **`servidor-auth/`:** serviço de autenticação sem dependências (scrypt, cookie assinado, TOTP).
- **Docker + nginx** sem privilégios, com cabeçalhos de segurança.

## Começar

```bash
npm ci
npm run dev        # http://localhost:3010
```

Requer Node 22 ou superior. Entre com qualquer e-mail e palavra-passe (modo simulado). Os e-mails de demonstração de cada função aparecem no menu do perfil, em «Trocar de conta».

| Comando | Para quê |
| --- | --- |
| `npm run dev` | desenvolvimento |
| `npm run build` | exportação estática para `out/` |
| `npm run typecheck` | tipos |
| `npm test` | testes, incluindo a coerência dos dados do projeto |
| `npm run padroes` | regras de código (sem HTML, sem base64, sem cores fixas…) |

## Usar noutro projeto

Use este repositório como modelo («Use this template») e trabalhe em `src/dados/`: menu, módulos, funções, textos, dicas e página inicial. Os componentes não se alteram para acrescentar páginas.

- **Receitas passo a passo** (nova página de registos, painel à medida, área, cartão, secção de conta, função, ícone, gráfico): [`docs/ADICIONAR-MODULO.md`](docs/ADICIONAR-MODULO.md)
- **Sistema de design** (tokens, peças, estados, telemóvel, dicas, desvanecimento): [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)
- **Padrões de código:** [`docs/PADROES-DE-CODIGO.md`](docs/PADROES-DE-CODIGO.md)
- **Arquitetura:** [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)
- **Autenticação:** [`docs/AUTENTICACAO.md`](docs/AUTENTICACAO.md)
- **Publicar com Docker:** [`docs/PUBLICAR.md`](docs/PUBLICAR.md)

Quem trabalha com um assistente de programação (por exemplo, Claude Code) encontra as regras resumidas em [`AGENTS.md`](AGENTS.md).

## Estado

O controlo de acesso e a autenticação do painel são **simulados** no navegador até ligar o `servidor-auth` (ver `docs/AUTENTICACAO.md`). Os dados dos módulos são fictícios. Os textos legais são de demonstração: substitua-os antes de publicar um produto real.

## Licença e créditos

[MIT](LICENSE). A interface assenta no [`@cloudflare/kumo`](https://github.com/cloudflare/kumo) (MIT) e segue padrões visuais do painel da Cloudflare; este projeto é independente e não é afiliado nem apoiado pela Cloudflare. Os restantes componentes de código aberto usados estão em `package.json`.
