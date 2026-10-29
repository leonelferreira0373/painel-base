# Assistente de IA

O painel traz o assistente [`ai-chat`](https://github.com/ferreirakorp/ai-chat) (MIT): um chat com respostas em fluxo, raciocínio visível, avaliação de cada resposta, formulários, histórico neste dispositivo e **autorização expressa para guardar as conversas** («Autorizo» ou recusar; pode parar e apagar quando quiser).

## Como está ligado

| Peça | Onde |
| --- | --- |
| Dependência | `package.json`, apontada a um commit do GitHub (sem precisar de `git` na construção). Para atualizar: `npm i https://codeload.github.com/ferreirakorp/ai-chat/tar.gz/<commit>` |
| Compilação | `transpilePackages: ["ai-chat"]` em `next.config.ts` (o módulo vem em TypeScript) |
| Componente | `src/components/AssistentePainel.tsx`, montado no `Shell` |
| Botão | «Perguntar à IA» no cabeçalho; envia o evento `painel:assistente` |
| Conteúdo | `src/dados/assistente.ts` (nome, convites, perguntas e respostas prontas, instruções da IA) e, por cima, as **perguntas frequentes** do editor de FAQ (Conteúdo → Editor de FAQ): as publicadas entram primeiro e valem como respostas oficiais |
| Cores | `src/styles/assistente.css`: as variáveis `--aia-*` apontadas aos tokens do tema; o botão redondo do módulo fica escondido |

## Sem servidor

Sem servidor da IA em `/api/assistente`, o assistente continua a funcionar: responde com as **perguntas e respostas prontas** de `dados/assistente.ts` (escolhe a mais próxima) e o raciocínio indica «A IA não estava disponível». A autorização e o histórico funcionam na mesma. É o modo do painel estático.

## Com servidor

O módulo fala com um pequeno protocolo HTTP (`POST /api/assistente` em NDJSON, mais `/estado`, `/titulo`, `/conversa`, `/avaliacao` e `/formulario`), só do mesmo domínio. A parte do servidor está em `ai-chat/servidor` (`criarAssistente`, `configuracaoDaIa`, `limitadorEmMemoria`, `repositorioMemoria`); o README do `ai-chat` tem o exemplo da rota, que exporta `{ GET, POST, DELETE }`.

Precisa das variáveis `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_AI_TOKEN` (um token só com a permissão de Workers AI; nunca no código). Como o painel é uma exportação estática, o servidor corre à parte (um serviço Node, ou outra aplicação Next) e o nginx encaminha `/api/assistente/` para ele, como já se faz com `/api/auth/`.

## Privacidade

As conversas só vão para a equipa depois de a pessoa autorizar, podem ser apagadas por ela e os endereços IP não se guardam. O histórico fica no `localStorage` do dispositivo.
