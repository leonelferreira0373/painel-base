# Autenticação

O painel tem **dois modos**. Por omissão corre o simulado, que serve para demonstrar e desenhar; para produção liga-se o servidor real.

## 1. Modo simulado (por omissão)

Implementado em `src/lib/auth.ts`, tudo no navegador:

- Qualquer e-mail com formato válido e qualquer palavra-passe entram. O e-mail decide a conta de demonstração (`emailDe(funcao)` em `src/dados/rbac.ts`); um e-mail desconhecido entra como a primeira função (administrador).
- A sessão fica em `localStorage` (se o utilizador marcar «Guardar o e-mail e o método…») ou em `sessionStorage`.
- A verificação em dois passos usa um código calculado localmente (`codigoTemporal`).
- A `Shell` redireciona para `/entrar/?seguinte=<página>` quando não há sessão; as páginas públicas estão em `ROTAS_PUBLICAS`.

> **Isto não protege nada.** Quem abrir as ferramentas do navegador pode criar uma sessão. Nunca ponha dados reais atrás do modo simulado.

## 2. Servidor real (`servidor-auth/auth.mjs`)

Serviço de autenticação sem dependências (`node:http`, `node:crypto`, um ficheiro JSON):

| Pedido | Corpo | Resposta |
| --- | --- | --- |
| `POST /api/auth/registar` | `{ email, senha, nome? }` | cria a conta e abre a sessão |
| `POST /api/auth/entrar` | `{ email, senha, lembrar }` | abre a sessão, ou `{ codigo: true, bilhete }` se a conta tem dois passos |
| `POST /api/auth/mfa` | `{ bilhete, codigo }` | conclui a entrada com o código da aplicação autenticadora (TOTP, RFC 6238) |
| `POST /api/auth/mfa/preparar` | (sessão) | segredo para a aplicação autenticadora |
| `POST /api/auth/mfa/ativar` | (sessão) `{ codigo }` | liga os dois passos |
| `POST /api/auth/terminar` | (sessão) | termina a sessão |
| `GET /api/auth/sessao` | (sessão) | quem está com a sessão aberta |
| `POST /api/auth/recuperar` | `{ email }` | responde sempre o mesmo; envia a ligação se a conta existir |
| `POST /api/auth/repor` | `{ token, senha }` | define a nova palavra-passe e termina todas as sessões |
| `POST /api/auth/recuperar-email` | `{ nome }` | devolve uma pista do e-mail, sem o mostrar inteiro |
| `GET /api/auth/saude` | | estado do serviço |

O que o servidor garante:

- Palavras-passe com `scrypt` e sal próprio; comparações em tempo constante.
- Sessão num cookie `HttpOnly`, `SameSite=Strict`, assinado com HMAC (`AUTH_SEGREDO`, no mínimo 32 caracteres aleatórios; obrigatório em produção).
- Limite de tentativas (resposta 429 com `Retry-After`); respostas que não revelam se uma conta existe.
- Só aceita pedidos JSON com `Origin` na lista `AUTH_ORIGENS`.

Como se liga:

```bash
AUTH_SEGREDO="$(openssl rand -hex 32)" docker compose --profile auth up -d --build
```

O nginx do painel encaminha `/api/auth/` para o serviço; sem ele, responde 503 com uma mensagem clara.

## 3. Passar o painel do modo simulado para o servidor

O servidor está pronto e testado, mas **o painel ainda não o usa**. A mudança é pequena e localizada:

1. Em `src/lib/auth.ts`, o objeto `auth` é síncrono. Torne cada método assíncrono (`fetch("/api/auth/…", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body })`) mantendo os mesmos nomes e as mesmas respostas (`RespostaAuth`).
2. Ajuste as chamadas em `src/components/auth/Paginas.tsx` e `src/components/conta/` (palavra-passe, dois passos, terminar sessão) para `await`.
3. `useSessao()` passa a ler `GET /api/auth/sessao` em vez do armazenamento.
4. Mapeie `funcaoId` da sessão a `FUNCOES` (`rbac.ts`); o servidor atribui a função «cliente» às contas novas: adapte conforme o seu produto.
5. **Repita as permissões no servidor** de tudo o que o painel esconde ou desativa.

## 4. Páginas de entrada

`/entrar/`, `/registar/`, `/recuperar-palavra-passe/`, `/recuperar-email/`, `/repor-palavra-passe/`, `/verificar/`, `/privacidade/`, `/termos/`, `/cookies/`. Seguem as medidas descritas em `docs/DESIGN-SYSTEM.md` (secção 15) e estão em `src/components/auth/`. Os documentos legais (`Documentos.tsx`) são texto de demonstração: substitua-os antes de publicar.
