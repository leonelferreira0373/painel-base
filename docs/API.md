# As APIs do painel (pagamentos, marketing e developer tools)

O painel traz três áreas prontas — **Pagamentos**, **Marketing** (com os e-mails) e **Developer tools** (com as implementações e o GitHub) — e a configuração dos módulos, que falam com um servidor através de um contrato fixo. Por omissão correm em **dados de demonstração** (nada sai do navegador); para os usar a sério, põe-se o endereço de um servidor que cumpra o contrato em Developer tools, «API e ligações». Nenhum ecrã muda: os mesmos ecrãs leem e escrevem no servidor.

- O contrato está em `src/lib/api/contrato.ts` (cada endereço, o método, o que faz e um exemplo). A lista e o comando `curl` de cada um estão no próprio painel, em «API e ligações», e o botão «Descarregar OpenAPI» dá o contrato em OpenAPI 3.1.
- `src/lib/api/cliente.ts` guarda a ligação (`simulado` ou `ligado`, o endereço e o token), faz os pedidos (`chamar`) e dá aos ecrãs o hook `useApi`. `src/lib/api/colecao.ts` faz o mesmo para listas com identificador (`useColecao`: contas bancárias, regras do firewall, e-mails, cópias de segurança).
- Os módulos de registos (`pagamentos`, `erros`, `origens`, `quentes`, `cliques`) declaram `api` na sua definição (`src/dados/modulos-super.ts`): quando o painel está ligado leem a lista do servidor, e mudar um estado ou criar um registo chama o servidor.

## Experimentar já: o servidor de exemplo

```bash
node scripts/servidor-de-exemplo.mjs
```

Sobe um servidor sem dependências em `http://localhost:4000` e imprime o token. Depois, no painel: Developer tools → API e ligações → origem «Ligado a um servidor», endereço `http://localhost:4000` e o token. Responde a todos os endereços do contrato com dados em memória, e algumas coisas são a sério:

- **Saúde do servidor**: CPU, memória, disco e tempo ligado do próprio sistema.
- **Pedidos em tempo real**: os pedidos que o servidor recebeu, com estado e tempo; um erro 5xx entra no registo de erros.
- **Firewall**: bloqueia de verdade (regras por IP ou gama e o limite de pedidos por minuto) e regista os bloqueios.
- **Marketing**: as visitas e os cliques vêm do script `public/rastreio.js` (ver abaixo). Os **e-mails** (`/v1/marketing/emails` e `/v1/marketing/campanhas-email`) ficam em memória: o que se envia fica «Entregue», o que está agendado sai à hora marcada (a fila anda de 20 em 20 segundos) e uma campanha enviada recebe números simulados. **Este servidor não envia e-mails**; um servidor a sério envia e conta as aberturas e os cliques.
- **Implementações, GitHub e conectores**: o teste A/B, a promoção e o rollback seguem as regras do painel (a versão B recebe de 1 a 99 % do tráfego). Os commits do GitHub são de exemplo: este servidor não fala com o GitHub.
- **Tokens da API** (`/v1/painel/tokens`): guarda a impressão (SHA-256) de cada token e confere-a, mais o estado, a validade, o filtro de IP e as permissões, em cada pedido (ver «Tokens da API e IAs»). `TOKEN` continua a ser o token mestre, que pode tudo.
- **Registos do servidor** (`/v1/dev/logs`): as linhas do próprio servidor (a consola e cada pedido) e das fontes que ligar por variáveis de ambiente (ver «Registos do servidor»).
- **Configuração do painel** (`/v1/painel/configuracao`): guarda o pacote, as exceções ligadas ou desligadas e a predefinição. Num servidor a sério só o Master Admin a pode escrever.

Variáveis: `PORTA` (4000), `TOKEN` (gera um) e `ORIGEM` (o endereço do painel para o CORS; por omissão `*`).

## Tokens da API e IAs

Em «Definições da conta → Tokens da API» cria-se um token como na Cloudflare: um nome, permissões (uma **área** ou um **módulo**, para **ler** ou para **editar**), filtros de IP (só estes endereços, ou todos menos estes) e uma validade. O painel gera o segredo no navegador (`bpt_` e 40 letras e números), mostra-o **uma só vez** e envia ao servidor só a impressão SHA-256 (`PUT /v1/painel/tokens/{id}`): o servidor nunca vê o token em claro. Em cada pedido, o servidor faz o SHA-256 do `Authorization: Bearer …`, procura a impressão, vê se o token está ativo (não revogado, dentro da validade), se o IP é permitido e se as permissões cobrem o pedido (`GET` pede «ler»; os outros métodos pedem «editar»; o módulo vem do caminho, como em `src/lib/tokens.ts`). `401` diz que o token não existe, expirou ou foi revogado; `403`, que não tem permissão ou que o IP não é permitido.

Uma IA com um token controla o painel por inteiro só pelas APIs: `GET /v1/painel/tokens/ferramentas` devolve as ferramentas que esse token permite, no formato das ferramentas da Anthropic (`name`, `description`, `input_schema`), com o método e o caminho em `x-painel`. A IA escolhe a ferramenta e faz o pedido HTTP a que ela corresponde. `POST /v1/painel/tokens/verificar` diz o que o token pode fazer (para testar um token novo). O painel descarrega também o contrato OpenAPI completo.

## Registos do servidor

«Developer tools → Registos do servidor» mostra as linhas que o servidor escreve, em direto, como os registos do Render: pesquisa, níveis (depuração, informação, aviso, erro), fonte, pausa, hora local ou UTC, exportar em qualquer formato e investigar com a IA. O painel lê `GET /v1/dev/logs?desde=<id>&limite=500` de 1,5 em 1,5 segundos (`desde` é o `id` da última linha que já tem, e o `cursor` da resposta é o que se passa a pedir) e as fontes em `GET /v1/dev/logs/fontes`.

O servidor de exemplo escreve nos registos a sua consola e cada pedido, e liga-se a mais fontes por variáveis de ambiente (todas opcionais):

| Variável | Fonte |
|---|---|
| `LOGS_DOCKER=web,db` | `docker logs -f` de cada contentor |
| `LOGS_FICHEIROS=/var/log/nginx/error.log,/var/log/app.log` | cada ficheiro, como `tail -f` (volta a ler se for rodado) |
| `LOGS_JOURNALD=nginx.service,ssh.service` (ou `todos`) | `journalctl -f` de cada unidade do VPS |
| `LOGS_CLOUDFLARE=nome-do-worker` | `npx wrangler tail` do Worker (precisa de `wrangler` com sessão aberta) |

Cada linha tem `id` (cresce sempre, com zeros à esquerda), `quando` (ISO), `nivel`, `fonte` e `texto`; o nível adivinha-se do texto (`error`, `warn`, o estado HTTP de um pedido…). Num servidor a sério ponha um limite de linhas em memória ou leia diretamente do Loki, Vector ou Fluent Bit; o painel só precisa deste contrato.

## Ligar o painel ao servidor de um projeto

1. Implemente no seu servidor os endereços de `contrato.ts` de que precisa (não precisa de todos: um ecrã sem o seu endereço mostra o erro e o botão «Tentar de novo»). Devolva JSON com os campos do exemplo de cada endereço.
2. Proteja-os com um token (`Authorization: Bearer <token>`); `401` ou `403` fazem o painel dizer «O servidor recusou o token». Só `POST /v1/eventos` fica aberto, porque é o site que o chama.
3. Ative o CORS para o endereço do painel (`Access-Control-Allow-Origin`, `Authorization` e `Content-Type` nos cabeçalhos, e os métodos `GET, POST, PUT, PATCH, DELETE, OPTIONS`).
4. Em produção o endereço tem de ser `https://` (o painel só aceita `http://` em `localhost`) e a política de segurança do painel (`connect-src` em `seguranca.conf`) tem de o permitir; o ficheiro traz `https:`.
5. Em Developer tools, «API e ligações», ponha o endereço e o token, use «Testar a ligação» e guarde.

O token fica guardado no navegador de quem o escreveu (`localStorage`, chave `painel.api`). Para um painel partilhado, o ideal é o servidor emitir tokens por pessoa e curtos, em vez de um token fixo.

## O rastreio de visitas e cliques (Marketing)

Para saber de onde vem cada visitante, que páginas estão quentes e que botões se clicam, ponha uma linha no site, antes de fechar o `</body>`:

```html
<script defer src="https://painel.exemplo.pt/rastreio.js" data-endpoint="https://api.exemplo.pt/v1/eventos"></script>
```

O script (`public/rastreio.js`) regista cada visita (com o endereço de origem e os parâmetros `utm_source`, `utm_medium`, `utm_campaign`, `utm_term` e `utm_content`) e cada clique em botões e ligações, e envia-os a `POST /v1/eventos`. Não usa cookies de terceiros: o identificador do visitante fica no `localStorage` e o da sessão no `sessionStorage`. Para dar um nome a um botão, `data-rastreio="Pedir proposta"`. Em Marketing, «Campanhas e UTM» monta as ligações com os parâmetros e «Rastreio no site» tem o script, o contrato do evento e um teste.

## Acrescentar um endereço ao contrato

1. Acrescente-o a `ENDPOINTS` em `src/lib/api/contrato.ts` (identificador único, caminho começado por `/v1/`, descrição e exemplo). Os testes (`contrato.test.ts`) garantem que o contrato fica coerente e que o OpenAPI tem todas as operações.
2. No ecrã, leia com `useApi(caminho, () => dadosDeDemonstracao)` ou, para listas com identificador, `useColecao(caminho, chave, inicial)`. Em modo simulado devolvem o que o gerador local der; em modo ligado pedem ao servidor.
3. Se for um módulo de registos, ponha `api: { lista, estado, criar }` na sua definição.
