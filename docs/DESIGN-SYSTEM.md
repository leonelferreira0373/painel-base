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
- O tamanho normal é 16 px (14 em menus pequenos, 18 em avisos, 40 em estados vazios). `peso` fino/cheio só para estados ativos.
- Logótipos de marcas externas (por exemplo o «G» do Google) são SVG em componente, nunca imagens em base64.

## 12. Avatar e perfil

- O avatar sem fotografia é um círculo com o mesmo CSS do botão principal e as **iniciais em branco** (`Avatar`, `iniciaisDe`). Com fotografia, mostra a imagem.
- O menu do perfil (`PerfilLateral` no `Shell`) tem: cabeçalho com nome e e-mail, definições da conta, tema (claro, escuro, sistema), trocar de conta e terminar sessão.

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
