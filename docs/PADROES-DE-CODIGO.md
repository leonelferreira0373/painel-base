# Padrões de código

Estas regras mantêm o código uniforme: quem lê uma página lê todas. O que for possível verificar automaticamente é verificado por `npm run padroes` (e pelo CI); o resto é revisto nos pull requests.

## 1. Stack

Next.js 15 (App Router, **exportação estática**: `output: "export"`), React 19, TypeScript estrito, Tailwind v4, [`@cloudflare/kumo`](https://github.com/cloudflare/kumo), ECharts, Phosphor Icons. Em produção serve-se a pasta exportada com nginx: **não há servidor Node nem funções do servidor**. Não se usa `getServerSideProps`, rotas `route.ts`, `cookies()`, `headers()` nem componentes que dependam de pedidos.

## 2. Estrutura de pastas

```
src/
  app/            rotas do Next (finas: só escolhem o componente)
  components/     peças de interface
    auth/         molduras e páginas de entrada
    conta/        definições da conta
    graficos/     gráficos (ECharts)
    analise/      páginas de análise de dados
  dados/          TUDO o que é de um projeto concreto (menu, módulos, funções, textos, dicas, página inicial)
  lib/            lógica sem interface (estado, tema, autenticação, extração de ficheiros, análise)
docs/             esta documentação
servidor-auth/    serviço de autenticação real (opcional)
scripts/          verificação de padrões e cópia de ativos
```

**A regra central:** o que muda de projeto para projeto vive em `src/dados/`; o que é do painel vive em `src/components/` e `src/lib/`. Para fazer um painel novo, mexe-se em `src/dados/` e acrescentam-se módulos; os componentes não se alteram. Se precisar de mexer num componente para acrescentar um módulo, falta uma opção de configuração em `src/dados/`: acrescente-a.

## 3. Ficheiros

- **Todo o ficheiro de código começa por um comentário** (uma ou duas linhas) a dizer para que serve. Se o ficheiro usa `"use client"`, o comentário vem antes.
- Um componente principal por ficheiro, com o nome do ficheiro (`Dica.tsx` exporta `Dica`). Ficheiros que agrupam peças pequenas e relacionadas (`ui.tsx`, `Estados.tsx`, `conta/Pecas.tsx`) exportam várias.
- Páginas em `src/app/**/page.tsx` são finas: importam o componente de `src/components/` e exportam `metadata`.
- Testes ao lado do código: `nome.test.ts` (só `.ts`, ambiente `node`). A lógica pura em `src/lib/` e os dados em `src/dados/` têm teste; as peças de interface verificam-se no navegador.

## 4. Nomes e língua

- Código, comentários, textos e mensagens de commit em **português** (pt-PT); identificadores em português sem acentos: `registos`, `funcao`, `periodo`, `aoClicar`.
- Eventos de componentes começam por `ao`: `aoMudar`, `aoRemover`, `aoAtualizar`.
- Componentes e tipos em `PascalCase`; funções, variáveis e constantes de módulo em `camelCase`; tabelas de dados em `MAIUSCULAS` (`AREAS`, `REGISTOS`, `FUNCOES`).
- Chaves de `localStorage`/`IndexedDB` com o prefixo `painel.` (`painel.tema`); eventos de janela com `painel:` (`painel:menu`).
- Ids de áreas e módulos: minúsculas com hífen, sem acentos (`visao-geral`); são também o caminho do URL (`/vendas/encomendas/`).

## 5. Textos

- Os textos de interface repetidos ou longos vivem em `src/dados/textos.ts`, as dicas em `src/dados/dicas.ts`, o menu em `src/dados/estrutura.ts`. Os rótulos que só aparecem num sítio podem ficar no componente.
- Português natural de empresa: títulos curtos, sem pontos de exclamação, sem «afinar por excesso». Nomes reais de produtos e de sistemas.
- Nada de legendas por baixo de títulos.
- **Os mesmos dados têm sempre a mesma representação.** Um termo que se escreve ou se lê como valor escreve-se «assim» no texto e sai como pill cinzento, sem aspas; um caminho entre ecrãs escreve-se `Definições da conta > Atalhos` e sai com chevrons SVG. Quem os desenha é `<Frase>` (`src/components/Frase.tsx`): nunca desenhe um pill à mão nem escreva o glifo «→».
- O texto é sempre preto ou branco (a cor principal do tema), nunca azul, ligações incluídas.
- Datas e números com `toLocaleString("pt-PT")`; dinheiro em euros salvo indicação em contrário.

## 6. React e Next

- Componentes de função; `"use client"` só onde há estado, efeitos ou eventos do navegador. As páginas e o layout ficam no servidor (em tempo de compilação).
- Estado partilhado vem dos hooks da casa: `useApp()` (função ativa, registos, avisos), `useConta()` (definições da conta), `useTema()`, `useSessao()`. Não se criam novos contextos sem necessidade.
- Estado que tem de sobreviver ao recarregamento: `lib/persistencia.ts` (IndexedDB, para dados grandes) ou `localStorage` com `try/catch` (para preferências pequenas). O armazenamento pode falhar (janela privada): o código tem de funcionar sem ele.
- Efeitos: sempre com limpeza (`removeEventListener`, `clearTimeout`).
- Navegação interna com `next/link` ou `router.push`; ligações externas com `<a>` e `rel="noopener noreferrer"`.
- Nada de `any`. Tipos de dados partilhados em `src/dados/tipos.ts` e `src/lib/tipos.ts`.

## 7. Estilo e CSS

- Só Tailwind e os tokens do tema (ver `docs/DESIGN-SYSTEM.md`, secção 2). **Sem cores fixas** (`#fff`, `rgb(…)`) fora dos gráficos. **Sem `style={{}}`** para cores; `style` só para medidas calculadas.
- Classes ordenadas do mais geral para o particular (disposição, medidas, tipografia, cores, estados). Uma classe repetida em vários sítios sobe para uma peça (`ui.tsx`), não para um `@apply`.
- CSS global só em `src/app/globals.css`, e só para o que o Tailwind não faz (`@property`, máscaras, esqueletos).
- Cartões de nível de página levam `pleno` (sangram no telemóvel).

## 8. HTML, base64 e injeção de texto

- **Nenhum ficheiro `.html`** no repositório. Páginas e documentos são componentes ou Markdown.
- **Nenhum dado em base64 embutido** (`data:…;base64,`): imagens e fontes em `public/` ou em componentes SVG. A leitura de anexos em base64 de e-mails (`src/lib/extract/`) é a única exceção, porque faz parte do formato.
- **Nada de `dangerouslySetInnerHTML`** nem `innerHTML`. A única exceção é o script do tema em `layout.tsx`, que tem de correr antes de pintar (com `next/script` só corre depois do JavaScript e o tema pisca).

## 9. Segurança

- Nunca se põem segredos no código nem na imagem. O servidor de autenticação lê-os do ambiente (`AUTH_SEGREDO`).
- A autenticação do painel é **simulada** até se ligar o `servidor-auth` (ver `docs/AUTENTICACAO.md`). As permissões de `src/dados/rbac.ts` escondem e desativam interface; **não protegem dados**. Num produto a sério, repetem-se no servidor.
- Entradas do utilizador nunca vão para HTML nem para URLs sem validação. O CSP em `seguranca.conf` não permite scripts de terceiros: não acrescente CDNs.
- Dados pessoais fictícios só em endereços reservados (`.example`, `exemplo`).

## 10. Commits e pull requests

- Mensagens de commit curtas, no imperativo, em português: «Acrescenta o módulo de faturas».
- Um pull request faz uma coisa. Antes de abrir: `npm run typecheck`, `npm test`, `npm run padroes` e `npm run build` têm de passar (o CI corre os mesmos).
- Quem acrescenta uma peça nova de interface acrescenta-a a `docs/DESIGN-SYSTEM.md` no mesmo pull request.

## 11. O que `npm run padroes` verifica

| Regra | O que recusa |
| --- | --- |
| `html` | ficheiros `.html` |
| `base64` | `;base64,` e `btoa`/`atob` no código da aplicação |
| `html-em-texto` | `dangerouslySetInnerHTML`, `innerHTML =` |
| `cor-fixa` | `#rrggbb`, `rgb()`, `hsl()` em código (exceto gráficos, PDF, cor da barra do navegador e logótipos) |
| `console` | `console.log` / `console.debug` |
| `controlo-nativo` | `type="time"`, `date`, `datetime-local`, `month`, `week`, `color`, `range`, `number` e `<select>`: o aspeto muda de sistema para sistema (use os seletores do painel) |
| `input-cru` | `<input>` e `<textarea>` à mão (use o `Input` do Kumo, ou `CampoDePesquisa` dentro dos cartões flutuantes; exceção: o campo de palavra-passe e os de ficheiro escondidos) |
| `seta-glifo` | o glifo «→» em código (use `A > B` com `<Frase>`; exceção: a tecla seta de `dados/atalhos.ts`) |
| `comentario-inicial` | ficheiro de código sem comentário na primeira linha |
| `nome-proibido` | palavras listadas em `scripts/padroes.json` (por exemplo, nomes de clientes que nunca devem aparecer) |

Uma linha com o texto `padroes-ignorar` é saltada; use-a raramente e explique porquê no comentário. As exceções por ficheiro estão no topo de `scripts/verificar-padroes.mjs`, cada uma com o motivo.

`npm test` verifica ainda a **coerência dos dados** (`src/dados/coerencia.test.ts`): cada módulo do menu tem a sua definição e vice-versa, as funções só falam de áreas e módulos que existem, cada estado tem a sua dica, os cartões da página inicial apontam para colunas e ligações reais.
