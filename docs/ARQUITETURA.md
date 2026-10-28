# Arquitetura

## Visão geral

```
navegador
 └─ Next.js (exportação estática) servido por nginx
     ├─ src/dados/*          ← o que é do projeto (menu, módulos, funções, textos, dicas, página inicial)
     ├─ src/components/*     ← interface (Shell, peças, módulos, gráficos, conta, entrada)
     ├─ src/lib/*            ← estado, tema, autenticação, extração e análise de ficheiros
     └─ estado no navegador  ← memória + localStorage + IndexedDB (nada sai do dispositivo)
servidor-auth (opcional)     ← autenticação real, atrás de /api/auth/
```

Não há base de dados nem servidor de aplicação. Os registos dos módulos são fictícios (`semente()`), vivem em memória e a interface é otimista: as ações mudam o estado de imediato e mostram um aviso.

## Endereços

Como na Cloudflare, todos os endereços levam o identificador da conta no meio: `/<contaId>/<área>/<módulo>/`. O identificador está em `src/dados/projeto.ts` e `caminho(área, módulo)` (`dados/estrutura.ts`) constrói sempre o endereço certo: **nunca escreva um endereço à mão**. A página inicial é `/`; as definições da conta são `/conta/<secção>/`. A rota é `src/app/[area]/[modulo]/[pagina]/page.tsx` (os nomes dos segmentos têm de coincidir com os da rota antiga `/<área>/<módulo>/`, que continua a abrir).

## Fluxo de dados de um módulo de registos

1. `src/dados/estrutura.ts` diz que o módulo existe → o Next gera `/<área>/<módulo>/` (`app/[area]/[modulo]/page.tsx`).
2. `Modulo.tsx` verifica `podeVer(funcao, área, módulo)` e escolhe o ecrã: `VisaoGeral`, análise, painel à medida (`PAINEIS`) ou `Registos`.
3. `Registos.tsx` lê a definição em `REGISTOS[moduloId]` (`src/dados/modulos.ts`) e as linhas em `useApp().registos`.
4. As colunas, o formulário, as transições e os gráficos saem todos da definição. `GrelhaRegistos` desenha a tabela.
5. Uma transição chama `transitar()` (`src/lib/estado.tsx`): atualiza a linha, aplica `aplicar`, e se `notifica` cria uma linha no módulo de notificações (`dados/notificacoes.ts`).

## Estado

| Onde | O quê | Como se lê |
| --- | --- | --- |
| `lib/estado.tsx` (`Provider`) | função ativa, registos dos módulos, avisos, ficheiros analisados | `useApp()` |
| `lib/conta.tsx` (`ContaProvider`) | definições da conta (perfil, notificações, lembretes, aparência, chaves) | `useConta()` |
| `lib/tema.ts` | tema claro/escuro/sistema | `useTema()` |
| `lib/auth.ts` | sessão | `useSessao()` |
| `lib/persistencia.ts` | ficheiros analisados (IndexedDB) | `guardar()` / `ler()` |
| `lib/recentes.ts` | páginas recentes e fixadas | `lerRecentes()`, `alternarFixado()` |

Chaves de `localStorage`: `painel.tema`, `painel.sessao`, `painel.registados`, `painel.conta.<função>`, `painel.funcao`, `painel.recentes`, `painel.fixados`, `painel.inicio.ocultos`. Eventos de janela para falar entre componentes: `painel:menu`, `painel:pesquisa`, `painel:sessao`, `painel:tema`.

## Análise de dados no navegador

Um analista arrasta ficheiros para a página «Ficheiros e dados» e nada sai do dispositivo:

- `lib/extract/` lê CSV, TSV, JSON, NDJSON, XML, HTML, XLSX/XLS/ODS, DOCX/ODT, PDF (com OCR em português e inglês), ZIP, e-mails (EML) e imagens, e devolve tabelas e texto.
- `lib/analysis/` calcula o perfil de cada coluna, a qualidade, as anomalias, as correlações e sugere gráficos.
- `lib/export/` gera CSV, Excel e um relatório PDF com gráficos.
- O motor de OCR, o worker do PDF e os idiomas são copiados por `scripts/copiar-ativos.mjs` (corre no `postinstall`) para `public/vendor/`, para que **nada seja pedido a terceiros**. Essa pasta não vai para o Git.

## Tema e CSS

O Kumo fornece os tokens e o tema claro/escuro (`data-mode` no `<html>`). `src/lib/tema-script.ts` corre em linha no `<head>` para aplicar o tema antes de pintar. `globals.css` guarda o que o Tailwind não faz: fonte, cartões a sangrar no telemóvel (`pleno`), desvanecimento nas pontas (`esbatido`), esqueletos (`esq`), preferências da conta (`data-movimento`, `data-dicas`).

## Compilação e distribuição

`next build` com `output: "export"` gera a pasta `out/`. O `Dockerfile` tem três fases (dependências → compilação → nginx sem privilégios) e o `nginx.conf` serve os ficheiros com os cabeçalhos de `seguranca.conf` (CSP sem terceiros, `X-Frame-Options: DENY`, …). Ver `docs/PUBLICAR.md`.
