# Sistema de design

Este documento é a fonte de verdade da interface. Tudo o que se acrescenta ao painel (uma página, um cartão, um formulário, um aviso) tem de usar as peças e as regras descritas aqui, para que um painel novo fique igual ao existente sem decisões de desenho.

O desenho segue o painel da Cloudflare e usa a biblioteca [`@cloudflare/kumo`](https://github.com/cloudflare/kumo) (MIT) com Tailwind v4. Este projeto não é afiliado à Cloudflare.

> Regra de ouro: **procure primeiro uma peça que já exista.** Só se cria uma peça nova quando nenhuma serve, e depois de a criar acrescenta-se aqui.

## 1. Princípios

1. **Um componente por padrão.** Cada situação (formulário, tabela, aviso, estado vazio, janela de confirmação) tem uma única peça. Duas versões da mesma coisa são um defeito.
2. **Tokens, nunca cores.** Cores, fundos e linhas vêm dos tokens do tema (`text-kumo-*`, `bg-kumo-*`, `ring-kumo-*`). Uma cor fixa estraga o tema escuro. A verificação de padrões recusa cores fixas fora dos gráficos.
3. **Telemóvel primeiro.** Tudo funciona a 375 px de largura, sem scroll horizontal da página, e os cartões sangram até aos bordos do ecrã (secção 7).
4. **Nada de HTML nem de base64.** As páginas são componentes React; não há ficheiros `.html`, nem imagens, fontes ou dados em base64 no código. Os ficheiros estáticos vão em `public/`.
5. **Sem texto de ajuda debaixo dos títulos.** Um título não leva legenda nem subtítulo explicativo. A explicação vai numa dica (secção 9) ou, se for indispensável, no próprio campo.
6. **Um só botão principal por zona.** Numa barra de ações há no máximo um botão `primary`; os outros são `secondary` ou `ghost`.
7. **Os mesmos estados em todo o lado.** Carregar, sem dados, erro e sem permissão têm sempre o mesmo aspeto (secção 8).
8. **Os textos são português natural**, em linguagem de empresa: títulos curtos e normais, nomes reais de produtos e sistemas, sem exageros.

## 2. Tokens e tipografia

| Uso | Token |
| --- | --- |
| Fundo da página | `bg-kumo-canvas` |
| Fundo de cartões e campos | `bg-kumo-base` |
| Fundo suave (selecionado, passar o rato) | `bg-kumo-tint` |
| Texto principal | `text-kumo-default` |
| Texto secundário | `text-kumo-subtle` |
| Texto apagado / ícones inativos | `text-kumo-inactive` |
| Texto de campo vazio | `text-kumo-placeholder` |
| Ligações | `text-kumo-link` |
| Positivo / negativo | `text-kumo-success` / `text-kumo-danger` |
| Linha fina | `border-kumo-hairline`, `ring-kumo-line` |
| Realce ao passar o rato num campo | `ring-kumo-interact` |
| Cor da marca (botão principal, avatar, barras) | `bg-kumo-brand` |

- **Fonte:** Inter Variable (`@fontsource-variable/inter`), `letter-spacing: -0.01em`, texto base de 14 px.
- **Escala:** título de página `text-2xl font-semibold`; título de secção `text-base font-semibold`; título de painel `text-sm font-semibold`; texto `text-sm` (13 px no tema do Kumo); legendas e rótulos de cartão `text-xs font-medium text-kumo-subtle`; números grandes `text-2xl font-semibold tabular-nums`.
- **Números** em tabelas e cartões levam sempre `tabular-nums`.
- **Cantos:** cartões `rounded-xl`; campos e botões usam os do Kumo.
- O tema escuro troca os tokens sozinho (`data-mode="dark"` no `<html>`); ver `src/lib/tema.ts`.

## 3. Estrutura da página

```
┌ barra lateral ┬ cabeçalho (58 px: caminho da página, pesquisa, perfil) ┐
│ (ícones que   ├────────────────────────────────────────────────────────┤
│  se expandem  │  <Pagina>                                              │
│  ao passar o  │    <Titulo>  título + ações                            │
│  rato)        │    <Secao> / <Painel> / <CartaoMetrica> …              │
│               │  rodapé                                                │
└───────────────┴────────────────────────────────────────────────────────┘
```

- `Shell` (`src/components/Shell.tsx`) desenha a barra lateral, o cabeçalho, a pesquisa (Ctrl+K), o rodapé e a porta de entrada. **Não se mexe nele para acrescentar páginas**: o menu sai de `src/dados/estrutura.ts`.
- A barra lateral é uma coluna de ícones que se expande ao passar o rato; há um botão «sempre aberta». No telemóvel abre como gaveta e mostra sempre os nomes.
- **O botão da barra** (`AlternarBarra`) é o `Sidebar.Trigger` do Kumo com o ícone animado do próprio Kumo: a barra vertical **desliza** de um lado para o outro (`translate-x-px` aberta, `translate-x-[10.5px]` fechada). Não se muda o ícone nem se pinta o botão de escuro quando está ativo. No telemóvel o ícone segue o estado da gaveta.
- O perfil fica no canto superior esquerdo da barra (avatar, trocar de conta, definições da conta, tema, terminar sessão).
- As páginas de entrada (`/entrar/`, `/registar/`, …) não têm o `Shell`: usam as molduras de `src/components/auth/Moldura.tsx`.

## 4. Peças de página (`src/components/ui.tsx`)

| Peça | Para quê | Regras |
| --- | --- | --- |
| `Pagina` | Contentor centrado de toda a página. `largo` passa de 1220 px para 1440 px. | Toda a página começa com ela. |
| `Titulo` | `<h1>` e, à direita, as ações da página. | Só um por página; no máximo um botão `primary` nas ações. |
| `Secao` | Título de secção (`<h2>`) com ações à direita. | Agrupa cartões relacionados. |
| `Painel` | Cartão com título (`<h3>`) e corpo. | Para listas, formulários curtos e informação. |
| `CartaoMetrica` | Cartão de métrica: título pequeno com menu «…», número grande, variação e gráfico. | O menu ganha «Ver detalhes», «Atualizar», período, «Visualizar como» e «Remover» conforme as funções que lhe passar. |
| `BotaoIcone` | Botão só de ícone com dica. | Sempre com dica (é também o `aria-label`). |

Exemplo mínimo de uma página nova:

```tsx
export function MinhaPagina() {
  return (
    <Pagina>
      <Titulo titulo="Os meus dados">
        <Button variant="primary" icon={ICONES.mais}>Novo</Button>
      </Titulo>
      <Painel titulo="Resumo">…</Painel>
    </Pagina>
  );
}
```

## 5. Componentes do Kumo e como se usam

Usa-se sempre o componente do Kumo; **nunca** um `<button>`, `<input>` ou `<select>` simples onde o Kumo tem equivalente.

| Situação | Componente | Notas |
| --- | --- | --- |
| Ação | `Button` | `variant`: `primary` (uma por zona), `secondary`, `ghost`, `destructive`. Só ícone: `shape="square"` + `aria-label`. Ícones em `ICONES`. |
| Ligação com aspeto de botão | `LinkButton` | Dentro de `Ambiente` (`auth/Moldura.tsx`) para navegar sem recarregar. |
| Texto, data, hora, número | `Input` | `label` sempre; a explicação do campo vai em `labelTooltip`. |
| Escolha de uma opção | `Select` | `items` como objeto `{valor: rótulo}`. |
| Sim/não | `Checkbox`, `Switch` | `Interruptor` (`conta/Pecas.tsx`) quando é uma preferência com rótulo. |
| Janela | `Dialog` | Título em `Dialog.Title`, fechar em `Dialog.Close`. Confirmações usam `Confirmar` (`conta/Pecas.tsx`). |
| Menu de ações | `DropdownMenu` | Grupos com `DropdownMenu.Group` + `DropdownMenu.Label`. Ação perigosa: `variant="danger"`, depois de um separador. |
| Etiqueta de estado | `Estado` (`components/Estado.tsx`) | Põe a cor certa (verde, vermelho, amarelo, neutro) e a dica com o significado e o passo seguinte. |
| Aviso de página | `Banner` | `variant="alert"` para avisos; uma faixa por assunto. |
| Barra de progresso | `Meter` | Com `label`. |
| Tabela de registos | `GrelhaRegistos` (`Grelhas.tsx`) | Pesquisa, ordenação e paginação incluídas. Nunca uma `<table>` à mão. |
| Tabela de dados importados | `GrelhaDados` | Para tabelas vindas de ficheiros. |
| Tabela simples | `Table` (Kumo) | Dentro de `LayerCard`. |
| Seletor de período | `SeletorPeriodo` (`Periodo.tsx`) | Mesma lista e calendário da Cloudflare; não crie outro. |
| Estado vazio de página | `Empty` (Kumo) | Ícone, título, descrição e, no máximo, um botão. |
| Avisos passageiros | `toasts.add({ title })` ou `avisar()` | `avisar` está em `useApp()`. |
| Pesquisa rápida | `CommandPalette` | Já está no `Shell`. |

## 5a. Popups, janelas e sombras

- **Uma só elevação** (ver 5f). Janelas (`Dialog`, `Confirmar`), menus (`DropdownMenu`), listas (`Select`), popovers e a pesquisa rápida têm a mesma sombra: o tamanho `shadow-lg` do Kumo mais o anel fino do tema. Vem de `--elevacao-popup` em `globals.css` (aplicada a `role="dialog"`, `menu` e `listbox`); **no tema escuro é mais escura**, porque uma sombra clara não se vê sobre fundo escuro. Nunca ponha sombras à mão num popup.
- Popups de contas e menus têm 288 px de largura (`w-[288px]`, no máximo `100vw - 16px`) e cantos `rounded-lg`. As linhas dos popups usam a constante `LINHA_POPUP` do `Shell` (altura 36 px, `rounded-md`, realce `bg-kumo-tint`).
- A pesquisa rápida e as janelas ficam **centradas na horizontal**; a pesquisa fica a 10 % do topo. No telemóvel, a pesquisa ocupa o ecrã inteiro.
- **Seletor de contas** (`PerfilLateral`, no canto superior esquerdo da barra), igual ao da Cloudflare: campo «Pesquisar contas…» com a lupa de 14 px e linha por baixo; lista de contas com avatar, nome, função e e-mail e um visto na atual; separador; «Criar conta»; e nada mais: as definições, o tema, o idioma, o fuso e «Terminar sessão» estão no menu do utilizador (secção 5d). Abre por baixo do seletor, alinhado à esquerda.

## 5b. Barras de scroll

- Todas as barras de scroll são **finas**, sem fundo nem setas, com o polegar na cor de linha do tema (`scrollbar-width: thin; scrollbar-color: var(--color-kumo-line) transparent`, em `@layer base` de `globals.css`). Não se estilizam barras à mão.
- A barra lateral usa a barra do próprio Kumo (`ScrollArea`): 6 px, polegar `bg-kumo-line` que só aparece ao passar o rato ou ao rolar, com desvanecimento em cima e em baixo.
- Para esconder a barra mantendo o scroll (a página principal, filas deslizantes), use `sem-barra`.

## 5c. Etiquetas de estado, ordenar e copiar

- **Etiqueta de estado** (`Estado`): pílula branca (escura no tema escuro) com anel fino, sombra `shadow-xs` e um **ponto colorido**: verde (concluído, ativo), vermelho (recusado, bloqueado), âmbar (atenção) ou cinzento (neutro). Nunca uma etiqueta plana. Os estados que se atualizam sozinhos (por exemplo, o do cliente no cabeçalho) usam a mesma etiqueta.
- **Colunas ordenáveis**: o duplo «⌃⌄» (`IconeOrdem`). Ao ordenar, o lado escolhido fica a **negrito e escuro** e o outro apagado; sem ordenação, ambos apagados.
- **Copiar**: `BotaoCopiar` (`conta/Pecas.tsx`). **Sem avisos flutuantes**: o próprio botão passa a visto (copiou) ou a triângulo de aviso (não conseguiu), e a dica diz o que aconteceu («Copiado», «Não foi possível copiar para a área de transferência»).

## 5d. Menu do utilizador, pesquisa e atalhos

- **Menu do utilizador** (`MenuUtilizador`, canto superior direito do cabeçalho, como o da Cloudflare): e-mail, Definições da conta, Aparência ▸ (claro, escuro, sistema), Idioma ▸, Fuso horário ▸ e Terminar sessão. Os submenus abrem para o lado onde houver espaço (a colisão é do Base UI: não a reimplemente).
- **Pesquisa rápida** (`Pesquisa`): «Recentes» (até 5, com a área ao lado), os módulos por área, as definições da conta, «Dicas de pesquisa» quando o campo está vazio e um rodapé «↑ ↓ para navegar · ↵ para escolher».
- **Atalhos de teclado configuráveis**: `dados/atalhos.ts` define as ações e as combinações de origem; o utilizador muda-as em Definições da conta → Atalhos (`SecaoAtalhos`) e `AtalhosGlobais` (no `Shell`) executa-os. Tem de incluir Ctrl ou Alt (ou ser uma tecla F), não pode ser uma do navegador nem repetir outra. Para um atalho novo, ver `docs/ADICIONAR-MODULO.md`, receita 11.

## 5e. Assistente de IA

- O botão **«Perguntar à IA»** (ícone de faíscas e texto; só o ícone abaixo de 768 px) fica no cabeçalho, ao lado da pesquisa. Abre o assistente `ai-chat` (github.com/ferreirakorp/ai-chat): painel em baixo, à direita, com respostas em fluxo, raciocínio visível, avaliação de cada resposta e histórico neste dispositivo.
- **Autorização**: a conversa só é guardada para a equipa depois de a pessoa carregar em «Autorizo» (ou recusar com o botão vermelho); pode parar e apagar quando quiser. Esta lógica é do módulo; não se duplica.
- O botão redondo do módulo fica escondido (`styles/assistente.css`); as cores vêm das variáveis `--aia-*` ligadas aos tokens do tema. Conteúdo e perguntas prontas em `dados/assistente.ts`. Ver `docs/ASSISTENTE.md`.

## 5f. Cartões flutuantes: um só componente

- **Todos** os cartões que flutuam (menus, submenus, popups e janelas) saem de `src/components/Flutuantes.tsx`: `PopupCartao` (conteúdo livre), `MenuCartao` (menu de itens) e `SubMenuCartao` (submenu). **Nunca** use `Popover.Positioner` nem `DropdownMenu.Content` à mão: é assim que o espaço e a sombra ficam iguais em todo o lado, sem repetir CSS.
- O espaço está nas constantes do ficheiro: 12 px ao bordo do ecrã e 8 px ao gatilho; entre um menu e o seu submenu vale a distância do Kumo (a da Cloudflare, cerca de 6 px à vista, com o primeiro item alinhado ao que o abriu): não a mude. Os cartões viram para o lado onde houver espaço.
- A sombra e o anel vêm de **uma só regra** em `globals.css` (`--elevacao-popup`), aplicada a `dialog`, a `menu` e ao elemento que contém uma `listbox` (o cartão do `Select`; a lista em si só rola e não leva sombra). O seletor de contas é a referência. Uma lista **dentro** de um cartão (as contas, os clientes, os resultados da pesquisa) não é um cartão: leva `data-incorporado`, ou está dentro de um `dialog`, e não tem sombra (senão ficava «um modal dentro de um modal»).
- A pesquisa rápida não leva o anel azul de foco por baixo do campo.

## 5g. O contexto aberto (o cliente)

- Como o domínio da Cloudflare, ao entrar num cliente: o **cabeçalho** mostra a estrela de favorito, o nome e o **estado em tempo real** (a mesma etiqueta de estado, que muda quando o estado muda) com um seletor (`SeletorCliente`): pesquisa, lista com visto e etiqueta, rodapé «6 clientes · Ir para todos os clientes →». A **barra lateral** ganha «Voltar a Clientes» por cima das páginas do cliente, e os «Recentes» guardam até 5 itens (incluem as páginas dos clientes).
- Endereços: `/<conta>/<cliente>/<página>/`. Tudo se configura em `src/dados/contexto.ts` (módulo das entidades, colunas de nome e de estado, páginas) e as páginas filtradas reutilizam `Registos` com `filtro`.

## 5h. A análise de uma entidade

- Barra de ferramentas como a da Cloudflare: **separadores** (`Separadores`: fundo rebaixado e o escolhido em branco com anel e sombra), **«Adicionar filtro»** (campo e valor; os filtros ativos são etiquetas que se tiram), **período** (`SeletorPeriodo`) e «…» (atualizar, descarregar, repor filtros).
- `CartaoEstatistica`: título pequeno, número grande, **variação face ao período anterior sem abrir nada** (verde se for bom, vermelho se for mau: `pior` marca as estatísticas em que subir é mau) e o gráfico de área de ponta a ponta. Os gráficos usam `empilhadas` (com `LegendaValores`, que mostra o valor de cada série) e `linhas` (percentis).
- **Mapa por país** (`GraficoMapa`, contornos do `world-atlas`, sem a Antártida): passar o rato por um país mostra um painel com os números dele (e destaca-o na lista); **clicar** (no mapa, no painel ou na lista) abre as **especificações completas** numa janela: totais, estados, os valores que mais se repetem e a lista de linhas. Tudo configurado em `src/dados/analise.ts`.

## 5i. Cartões arrastáveis

`GrelhaOrdenavel` (`@dnd-kit`): o utilizador arrasta os cartões pela **alça no centro do topo** (aparece ao passar o rato; no telemóvel está sempre visível) com o rato, com o toque (pressão curta) ou com o teclado (alça, espaço, setas, espaço). A ordem fica guardada **por conta e por ecrã** (`conta.ordens`), e há «Repor a ordem». Para um ecrã novo, ver `docs/ADICIONAR-MODULO.md`, receita 14.

## 5j. Aparência personalizável

- Em Definições da conta → Aparência cada utilizador escolhe, **por tema** (claro e escuro), as cores — Fundo, Superfícies, Texto, Texto secundário, Linhas, Acento, Sucesso, Pendente, Erro — e as **letras** do texto, dos títulos e dos números (só letras que já vêm no aparelho). Edita-se um rascunho com **pré-visualização** ao lado e só «Guardar alterações» o aplica; «Descartar» e «Repor o original» desfazem. Avisa quando o contraste do texto é fraco.
- Aplica-se às variáveis do Kumo (`lib/aparencia.ts`): só mudam as que dependem das cores escolhidas, e as nuances (tons suaves, realces, fundos de estado) derivam delas. `AparenciaPessoal` põe as variáveis no `<html>` e o script do tema volta a pô-las antes de pintar, sem piscar.
- Por isso **nunca use cores fixas**: tudo o que não for um token do tema não muda com a escolha do utilizador.

## 5k. Texto, termos, caminhos, destaques e paginação

- **Texto preto ou branco.** Todo o texto usa a cor principal do tema (preto no claro, branco no escuro) ou o tom secundário, **nunca azul**. As ligações também: só se distinguem por serem sublinhadas (`--text-color-kumo-link` é a cor do texto e não segue o acento). O acento (`--color-kumo-brand`) pinta fundos, anéis e ícones, nunca texto. O assistente de IA (`src/styles/assistente.css`) segue a mesma regra: `--aia-azul` é a cor do texto, por isso o assistente fica a preto e branco, e o realce ao passar o rato (`--aia-amarelo`) é o cinzento suave do tema.
- **Os mesmos dados, a mesma representação (`Frase`).** Um termo que se escreve ou se lê como valor sai como **pill cinzento de informação** (`Pilula`), sem aspas; um caminho entre ecrãs sai com **chevrons SVG**. No texto escreve-se «conta» e `Definições da conta > Atalhos`, e `<Frase>` desenha. `Dica`, `CorpoDica`, `DicaInfo`, as dicas da pesquisa, os diálogos de confirmação e os documentos já passam por ela. Um sítio novo usa `<Frase>` (ou `<Pilula>` quando o termo vem de uma variável); para `aria-label` e títulos, `semMarcas()`. `npm run padroes` recusa o glifo «→».
- **Os separadores dos menus** são o componente `SeparadorDeMenu` (de ponta a ponta do cartão, como na Cloudflare); o cabeçalho de um menu de conta é um item desativado com o texto pequeno (`text-xs`), como o da Cloudflare. Nunca `DropdownMenu.Separator` à mão.
- **Uma só superfície.** `SUPERFICIE_FLUTUANTE` (em `Flutuantes.tsx`) dá o mesmo fundo e os mesmos cantos a `PopupCartao`, `MenuCartao` e `SubMenuCartao`, e a regra única de `globals.css` dá a sombra (a `shadow-lg` do Kumo, lida do DOM da Cloudflare: não a aumente) e o anel. O esbatido de scroll (`Estados.tsx`) nunca cobre o cartão de um menu ou de uma janela: a máscara cortava-lhe a sombra. Nenhum cartão novo tem classes próprias de fundo, canto ou sombra.
- **Um menu é um só cartão.** A sombra e o anel são do cartão (5f), **nunca** de uma linha dentro dele: a linha destacada de menus, submenus, listas e da pesquisa (com o rato ou com o teclado) é só o fundo suave, como no seletor de contas, sem anel, sem sombra e sem o anel de foco colorido do Kumo. A regra está em `globals.css`.
- **Paginação** (`ControlosDePaginacao`): primeira, anterior, número da página, seguinte e última. Cada botão tem a sua dica a dizer o que faz, também quando está desativado; os textos estão em `T.paginacao`. Não use `Pagination.Controls` do Kumo (não tem dicas).
- **O tema escuro é o do painel, não o do sistema.** `globals.css` declara `@custom-variant dark` sobre `data-mode="dark"`; sem isso as classes `dark:` do Kumo (as etiquetas de estado, por exemplo) só mudam com o sistema escuro. Teste sempre um ecrã novo nos dois temas.
- **Copiar um dado** (`BotaoCopiar`, em `Copiar.tsx`, o único): sem avisos flutuantes, o próprio botão passa a **visto** (copiou) ou a **triângulo de aviso** (o navegador não deixou) durante dois segundos, e a dica explica. A mudança é uma transição (os ícones esbatem-se, escalam e desfocam-se uns para os outros), nunca um corte: **nada no painel muda de repente**, todo o estado que troca de aspeto anima. Nas listas ordenadas a linha é `LinhaOrdenada` (nome, barra de proporção e valor, como a `RankedListRow` da Cloudflare): ao passar o rato ou focar a linha aparece o botão compacto (`tamanho="xs"`) que copia o dado dela (por omissão o nome; `copiar` muda o texto); no telemóvel está sempre visível. Nenhuma lista desenha a sua própria linha nem o seu próprio botão de copiar.
- **Opções fixas com «Personalizado…».** Todo o seletor de opções fixas em que faz sentido um valor livre (minutos de inatividade, dias de validade, repetições, fuso horário, formato da data, letra) usa `SeletorPersonalizavel`: as opções fixas mais a última, «Personalizado…», que abre a janela modal do painel (`Confirmar`, a mesma de todas as ações) com o campo, a unidade e os limites, «Aplicar» e «Cancelar»; o valor escolhido passa a aparecer no seletor. Os valores personalizados **ficam guardados na conta** (`conta.personalizados`, por `chave` do seletor), aparecem como opções e gerem-se na mesma janela («Gerir personalizados…»): **Usar** e **Remover** (se o que se remove estava em uso, o seletor volta à `omissao` da especificação). Tudo o que se pode acrescentar tem de se poder remover. O formato da data (`tipo: "formatoData"`) não se escreve: escolhe-se a ordem, o separador e o ano em listas e o código monta o padrão; e as datas escritas à mão levam máscara (`lib/mascaras.ts`): a pessoa escreve só os números e o código põe os separadores. Nunca um campo inline: parte a linha. As opções e a especificação de cada seletor vivem em `src/dados/personalizados.ts`; um seletor novo acrescenta aí a sua e não desenha o seu próprio campo «outro». Os seletores que escolhem entidades reais (uma tabela, um cliente, um campo) ou um enunciado fechado (o dia em que a semana começa) não levam «Personalizado…».
- **Nada de controlos nativos.** Hora, data, cor e número têm seletores próprios, com os cartões flutuantes do painel: `SeletorDeHora` (colunas de horas e minutos), `SeletorDeData` (o calendário do Kumo), `SeletorDeDataHora` (os dois juntos) e `EscolhaDeCor` (área de saturação e luminosidade e barra de matiz, com rato, toque e teclado; o campo do código fica ao lado). Valores como «HH:mm», «AAAA-MM-DD» e «AAAA-MM-DDTHH:mm». Um campo numérico é texto com `inputMode="numeric"`. `npm run padroes` recusa `type="time"`, `date`, `color`, `number` e `<select>`.
- **Exportar** (`MenuDeDados.tsx`): o submenu «Exportar» da Cloudflare, com «Descarregar como CSV», «Descarregar como JSON» e «Copiar como imagem» (`ItensDeExportar`). Um cartão com dados passa `exportar={{ nome, titulo, colunas, linhas }}` ao `CartaoMetrica` (o menu «…» ganha o item); uma lista usa `<MenuDeDados dados=… />` nas ações do `Painel`. O resultado de copiar a imagem aparece no próprio botão «…» (visto ou aviso, com transição). As conversões vivem em `lib/exportar-dados.ts` (com testes).
- **Cartões de duas cores: `LayerCard`.** Os cartões com título (`Cartao` das definições, `Painel`) usam o `LayerCard` do Kumo, como os da Cloudflare: a faixa do título é `LayerCard.Secondary` (fundo cinzento, texto secundário, ações à direita) e o corpo é `LayerCard.Primary` (branco, com anel) por cima. Nunca um `Surface` de uma cor com um título dentro. Os cartões de estatística e de métrica são de uma cor, como na Cloudflare.
- **Letras carregadas** (`conta/Letras.tsx`, `lib/fontes.ts`): em Aparência → Letra, «Adicionar letra» abre a janela modal com duas vias, **Ficheiro** (TTF, OTF, WOFF ou WOFF2, até 5 MB, validado ao escolher) e **Ligação** (https: um ficheiro de letra ou uma folha de estilos como a do Google Fonts, que dá o nome da família sozinha). Os ficheiros ficam no navegador (IndexedDB), a conta só guarda a descrição (`conta.fontes`); `AparenciaPessoal` regista-as ao abrir o painel e aparecem como «(carregada)» nos seletores. Cada uma tem «Remover» (tira-a do painel, apaga o ficheiro e deixa de a usar nas escolhas).
- **O painel flutuante da IA** (`#aia-painel`) leva o mesmo anel e a mesma elevação dos outros cartões flutuantes (5f).

## 6. Gráficos

- Os gráficos são do ECharts, desenhados por `Grafico` (`components/graficos/Graficos.tsx`) a partir de um `GraficoSpec` (`linha`, `colunas`, `barras`, `rosca`, `histograma`, `dispersao`, `matriz`).
- **Nunca** se escreve uma opção de ECharts na página: cria-se um `GraficoSpec`. Se faltar um tipo, acrescenta-se ao `GraficoSpec` e a `opcoesDe`.
- As cores dos gráficos vêm da paleta do Kumo (`ChartPalette`); no tema escuro, `paraEscuro` troca as cores de texto e de grelha. É a única zona onde são permitidas cores literais.
- Séries no tempo mostram a hora, a data e o valor na dica; rosca e barras mostram nome e valor.
- Pequenos gráficos: `Anel`, `Tendencia`, `Contador` (`graficos/Pequenos.tsx`).
- Um gráfico sem pontos mostra `SemDadosGrafico`, nunca um eixo vazio.
- Os cartões de métrica deixam o utilizador escolher «Série temporal», «Colunas» ou «Rosca» (`TIPOS_CARTAO`).

## 7. Telemóvel

- Largura mínima suportada: 375 px. A página nunca tem scroll horizontal; só tabelas e filas de separadores deslizam, dentro do seu bloco.
- **Cartões a sangrar:** a classe `pleno` (em `globals.css`) faz o cartão ocupar a largura toda do ecrã abaixo de 640 px (margem negativa de 16 px, sem cantos redondos, só linha fina em cima e em baixo). Todo o cartão de nível de página (`Surface`, `LayerCard`, `CartaoMetrica`, `Painel`, `Banner`) leva `pleno`. As peças do Kumo que já trazem `w-full` (como o `Banner`) precisam também de `max-sm:w-[calc(100%+2rem)]`, senão ficam 32 px mais curtas. Os títulos mantêm a margem de 16 px.
- A barra lateral abre como gaveta; o botão de menu está no cabeçalho.
- Alvos de toque: botões e linhas de lista com pelo menos 36 px de altura (44 px nas linhas de lista).
- A pesquisa rápida ocupa o ecrã inteiro e acompanha o teclado.
- O texto estende-se em vez de quebrar cedo: use `min-w-0` + `truncate` nas linhas, e `text-balance` nos parágrafos curtos.
- Verifique sempre no telemóvel de verdade ou no modo de dispositivo do navegador (375 × 812) antes de dar uma página por terminada.

## 8. Estados: carregar, vazio, erro, sem permissão

| Estado | Peça |
| --- | --- |
| A carregar um cartão | `EsqueletoCartao` (`carregando` do `CartaoMetrica` já o usa) |
| A carregar uma tabela | `EsqueletoTabela` (a `GrelhaRegistos` já o usa enquanto `pronto` é falso) |
| Gráfico sem pontos | `SemDadosGrafico` («Sem dados») |
| Tabela sem linhas | A própria grelha mostra «Sem dados» |
| Página sem conteúdo | `Empty` do Kumo |
| Sem permissão | `SemAcesso` (em `Modulo.tsx`); um botão desativado por falta de permissão explica o motivo na sua dica |
| Erro de uma ação | `toasts.add({ title: "Não foi possível …" })` com a causa em português |

Os esqueletos têm brilho que passa (`.esq`) e respeitam «reduzir movimento».

## 9. Dicas (tooltips)

- Todo o controlo que não se explica sozinho tem dica: botões de ícone, estados, cabeçalhos de colunas, campos de formulário, métricas.
- **Componente único:** `Dica` (`Dica.tsx`) envolve qualquer elemento; `CorpoDica` formata título, texto e linhas «rótulo: valor»; `DicaInfo` é o «i» ao lado de um título. Nunca o atributo `title`.
- **Sem «bico»** (seta) na dica: está escondido em `globals.css`.
- **Os textos vivem em `src/dados/dicas.ts`**, não nos componentes: significado de cada estado (`SIGNIFICADO_ESTADO`), de cada campo (`DICA_CAMPO`), de cada cartão (`DICA_CARTAO`), das estatísticas e dos gráficos.
- Uma dica diz o que a coisa **é** ou o que **acontece** quando se usa; não repete o rótulo.
- O utilizador pode desligar as dicas em Definições da conta → Aparência (`html[data-dicas="off"]`).

## 10. Desvanecimento nas pontas

Sempre que uma área rola e há mais conteúdo para lá da borda, a ponta **desvanece** em vez de cortar, em cima, em baixo e dos lados.

- Em geral é automático: o `EsbatidoGlobal` (montado no `Shell`) marca todos os elementos com classes `overflow-x-auto`, `overflow-y-auto` ou `overflow-auto`.
- Para uma área à medida, use `<Esbatido className="…">` (`Estados.tsx`).
- Para esconder a barra de scroll mantendo o desvanecimento, junte `sem-barra`.
- O mecanismo é CSS puro (`mask-image` com variáveis `--fe/--fd/--fc/--fb`) ativado por `data-ini/fim/cima/baixo`. Não o reimplemente.

## 11. Ícones

- Ícones do Phosphor, expostos por `Icones.tsx`: `ICONES` (para a propriedade `icon` do Kumo) e `<Ic nome="…" tamanho={16} />` (em linha).
- Para acrescentar um ícone, importe-o em `Icones.tsx` e dê-lhe um nome em português; nunca importe ícones diretamente numa página.
- **Sempre com o traço grosso (`bold`); nunca `duotone`**, que pinta um retângulo cinzento por trás do desenho. `peso="fill"` só para estados ativos.
- O tamanho normal é 16 px (14 em menus pequenos, 18 em avisos, 40 em estados vazios). `peso` fino/cheio só para estados ativos.
- Logótipos de marcas externas (por exemplo o «G» do Google) são SVG em componente, nunca imagens em base64.

## 12. Avatar e perfil

- O avatar sem fotografia é um círculo com o mesmo CSS do botão principal e as **iniciais em branco** (`Avatar`, `iniciaisDe`). Com fotografia, mostra a imagem.
- O seletor de contas (`PerfilLateral` no `Shell`, secção 5a) troca de conta e cria contas; o menu do utilizador (`MenuUtilizador`, secção 5d) tem as definições da conta, a aparência, o idioma, o fuso e terminar sessão.

## 13. Formulários

- Um só padrão de formulário: `Input`/`Select` do Kumo, rótulo sempre visível, `labelTooltip` com a explicação, `required` nos obrigatórios.
- O formulário de «Novo registo» é gerado pelos `campos` do módulo (`Registos.tsx`); não se escreve à mão.
- Validar ao enviar, não ao escrever. Mensagem de erro curta, junto ao campo (`error`).
- Palavra-passe: `CampoSenha` (só o botão mostrar/ocultar).
- Ações que apagam ou terminam algo pedem confirmação (`Confirmar`).

## 14. Definições da conta

Páginas em `/conta/<secção>/` com menu de secções à esquerda (fila deslizante no telemóvel). Cada secção é composta com as peças de `conta/Pecas.tsx`: `Cartao`, `Linha`, `LinhaCampo`, `Interruptor`, `Confirmar`, `CodigoDialog`. Para acrescentar uma secção ver `docs/ADICIONAR-MODULO.md`, receita 5.

## 15. Páginas de entrada

Entrar, registar, recuperar palavra-passe/e-mail e os documentos legais seguem as medidas do painel de início de sessão da Cloudflare: coluna de 448 px, cartão com `px-4 pt-8 sm:px-12 sm:py-6`, título centrado `text-2xl font-semibold`, botões de 40 px, ligações `text-kumo-link`, texto legal pequeno e ligação «Preferências de cookies» no canto. Usam `TelaEntrada`, `TelaRegisto` ou `TelaPainel` (`auth/Moldura.tsx`); nunca desenhe uma moldura nova.

## 16. Movimento e acessibilidade

- Transições curtas (≤ 200 ms). Respeita `prefers-reduced-motion` e a preferência «Reduzir movimento» da conta.
- Todo o botão só de ícone tem `aria-label`. Contraste mínimo AA: use os tokens e não mude opacidades à mão.
- Tudo se faz só com o teclado: Tab, Enter, Esc, setas nos menus, Ctrl+K na pesquisa.

## 17. Lista de verificação antes de dar uma página por pronta

- [ ] Usa `Pagina` + `Titulo` e só peças deste documento.
- [ ] Sem cores fixas, sem HTML solto, sem base64 (`npm run padroes`).
- [ ] Tem estado a carregar, vazio e sem permissão.
- [ ] Os controlos têm dica e os botões de ícone têm `aria-label`.
- [ ] Os textos estão em `src/dados/` (menu, dicas, textos) e em português natural.
- [ ] Funciona a 375 px sem scroll horizontal e no tema escuro.
- [ ] `npm run typecheck`, `npm test` e `npm run build` passam.
