# Publicar

## Desenvolvimento

```bash
npm ci               # instala e copia os ativos do navegador para public/vendor
npm run dev          # http://localhost:3010
```

`next dev` e `next build` não devem partilhar a pasta `.next`. Para compilar com o servidor de desenvolvimento a correr, use `NEXT_DIST_DIR=.next-build npm run build` (a exportação fica em `.next-build/`).

Para ver no telemóvel: ligue-o ao computador, ative a depuração por USB e, no Chrome do computador, abra `chrome://inspect`; com `adb reverse tcp:3010 tcp:3010` o telemóvel abre `http://localhost:3010`.

## Verificações

```bash
npm run typecheck && npm test && npm run padroes && npm run build
```

O CI (`.github/workflows/ci.yml`) corre as mesmas quatro.

## Com Docker

```bash
cp .env.example .env                       # preencha o que precisar
VERSAO=$(date +%Y%m%d-%H%M) docker compose build web
VERSAO=<a mesma> docker compose --profile local up -d      # http://127.0.0.1:3010
```

O contentor `web` é um nginx sem privilégios, de sistema de ficheiros só de leitura, sem capacidades extra e sem portas públicas. Os perfis do `docker-compose.yml`:

| Perfil | O que sobe |
| --- | --- |
| `local` | pré-visualização em `127.0.0.1:3010` |
| `publico` | `tunel`: um túnel do Cloudflare (`cloudflared`) para o `web`, com `TUNNEL_TOKEN` no `.env` |
| `auth` | o serviço de autenticação (`docs/AUTENTICACAO.md`) |

Em vez do túnel pode pôr à frente qualquer proxy inverso (Caddy, Traefik, nginx) que termine HTTPS e encaminhe para a porta 8080 do `web`.

## Atualizar e voltar atrás

Cada versão é uma imagem com o seu nome (`painel/web:<VERSAO>`). Atualizar:

```bash
VERSAO=<nova> docker compose build web
VERSAO=<nova> docker compose --profile publico up -d --no-build web tunel
```

Espere o estado `healthy` (`docker compose ps`). Se algo correr mal, volte à versão anterior, que continua na máquina:

```bash
VERSAO=<anterior> docker compose --profile publico up -d --no-build web tunel
```

Depois de publicar, confirme em produção: a página inicial, uma página de módulo, `/entrar/`, `/saude`, os ficheiros de `/vendor/` (tipos MIME certos, `.wasm` como `application/wasm`) e os cabeçalhos de segurança.

## Armadilhas já encontradas

- Um bloco `types {}` no nginx apaga todos os tipos MIME.
- `add_header` dentro de um `location` anula os do `server`: por isso cada `location` inclui `seguranca.conf`.
- `try_files … /404.html` devolve 200; use `=404`.
- Os ficheiros `.mjs` (worker do PDF) precisam de `default_type text/javascript`.
- Com a porta de entrada, o HTML das páginas de módulo não traz o conteúdo (desenha-se no navegador depois da sessão); as verificações automáticas de produção devem olhar para a página de entrada e para os ficheiros JavaScript, não para o título dos módulos.
