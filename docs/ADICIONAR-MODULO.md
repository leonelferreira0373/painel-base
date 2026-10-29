# Receitas: acrescentar páginas e funcionalidades

Cada receita lista **todos** os ficheiros a tocar, pela ordem. Depois de qualquer uma, corra:

```bash
npm test            # coerência dos dados: diz-lhe o que falta
npm run padroes     # regras de código
npm run typecheck
npm run build
```

Se uma receita lhe obrigar a mexer em mais ficheiros do que os listados, falta uma opção de configuração em `src/dados/`: acrescente-a em vez de alterar o componente, e atualize esta receita.

---

## 1. Uma página de registos (tabela com estados, formulário e gráficos)

É o caso mais comum: encomendas, tickets, faturas, equipamentos.

1. **Menu — `src/dados/estrutura.ts`.** Acrescente o módulo à área certa:

   ```ts
   { id: "faturas", rotulo: "Faturas", icone: "moeda", tipo: "registos", grupo: "Pedidos", descricao: "Faturas emitidas e o estado de cada uma." }
   ```

   `id` em minúsculas com hífen; passa a ser o URL (`/vendas/faturas/`). `grupo` (opcional) cria um submenu. `descricao` aparece como dica no menu. A rota estática e o mapa do site saem sozinhos do menu.

2. **Definição — `src/dados/modulos.ts`.** Copie um dos blocos (`encomendas` tem fluxo de estados completo; `equipas` é só de leitura), mude o `id` e acrescente-o a `REGISTOS` no fim do ficheiro:

   ```ts
   const faturas: DefRegistos = {
     id: "faturas",
     titulo: "Faturas",
     estadoChave: "estado",
     estadoInicial: "Emitida",
     colunas: [
       { chave: "numero", rotulo: "Número" },
       { chave: "cliente", rotulo: "Cliente" },
       { chave: "valor", rotulo: "Valor (€)", tipo: "numero" },
       { chave: "data", rotulo: "Data", tipo: "data" },
       { chave: "estado", rotulo: "Estado", tipo: "estado" },
     ],
     transicoes: [{ de: ["Emitida"], para: "Paga", rotulo: "Marcar como paga", icone: "certo", funcoes: GESTAO }],
     campos: [/* o formulário «Novo registo» */],
     graficos: [{ tipo: "linha", data: "data", titulo: "Faturas por dia" }],
     semente: () => { /* dados fictícios de partida, com `Sorteio` */ },
   };
   ```

   - Uma coluna `tipo: "estado"` desenha o `Estado` com cor e dica; `tipo: "numero"` alinha e formata; `tipo: "data"` formata a data.
   - Cada **transição** vira um botão no menu da linha, só ativo para as `funcoes` indicadas. `aplicar` preenche campos ao transitar; `notifica: true` cria uma linha no módulo de notificações (`dados/notificacoes.ts`).
   - `campos` gera o formulário de «Novo registo» (tipos `texto`, `data`, `hora`, `numero`, `opcoes`). Sem campos, não há botão «Novo registo».
   - Os `graficos` (`linha`, `rosca`, `barras`) aparecem por cima da tabela; `por`, `data` e `medida` têm de ser colunas desta definição.
   - A `semente` tem de devolver linhas com `id` único e todas as colunas.

3. **Dicas — `src/dados/dicas.ts`.** Em `SIGNIFICADO_ESTADO["faturas"]` escreva o significado de **cada** estado; em `DICA_CAMPO`, uma frase para cada `chave` de campo nova.

4. **Acesso — `src/dados/rbac.ts`.** Se a área já é visível para uma função, o módulo também. Para esconder o módulo a uma função, acrescente o `id` a `fechados` dessa função.

5. **Página inicial (opcional) — `src/dados/visao.ts`.** Para mostrar um cartão ou uma lista, ver a receita 4.

`npm test` falha se faltar a definição, se um estado não tiver dica, se um gráfico apontar para uma coluna inexistente ou se uma função não existir.

---


### Ligar um módulo de registos a um servidor

Ponha `api` na definição (`DefRegistos.api`) e o módulo passa a ler do servidor quando o painel está ligado (Developer tools, «API e ligações»), como os de `src/dados/modulos-super.ts`:

```ts
api: { lista: "/v1/faturas", estado: "/v1/faturas/{id}", criar: "/v1/faturas", mapear: (f) => ({ ...f, data: String(f.data).slice(0, 10) }) },
```

`lista` devolve `{ itens }`; `estado` recebe `PATCH { estado }`; `criar` recebe `POST` com os valores do formulário; `mapear` completa cada linha que vem do servidor. Ver `docs/API.md`.

## 2. Uma página à medida (painel, formulário especial, mapa…)

Para o que não é uma tabela de registos.

1. **Menu — `src/dados/estrutura.ts`.** Módulo com `tipo: "painel"`.
2. **Componente — `src/components/Paineis.tsx`** (ou um ficheiro novo, importado aí). Comece sempre por `Pagina` e `Titulo` e use só peças de `docs/DESIGN-SYSTEM.md`:

   ```tsx
   export function ResumoFinanceiro() {
     const { funcao } = useApp();
     return (
       <Pagina>
         <Titulo titulo="Resumo financeiro" />
         <Painel titulo="Este mês">…</Painel>
       </Pagina>
     );
   }
   ```

3. **Registo — `PAINEIS`, no fim de `Paineis.tsx`**, numa linha com este formato (o teste de coerência lê-o):

   ```tsx
   export const PAINEIS: Record<string, ComponentType> = {
     "resumo-financeiro": () => <ResumoFinanceiro />,
   };
   ```

4. **Dados fictícios — `src/dados/paineis.ts`** (nunca no componente). **Dicas — `src/dados/dicas.ts`.**
5. A página tem de ter estado a carregar (`pronto` do `useApp()`), estado vazio e, se houver ações, a verificação de `podeEditar(funcao, área, módulo)`.

---

## 3. Uma área nova no menu

> Uma área nova também tem de entrar nos **pacotes** (`dados/pacotes.ts`) que a querem; o Master Admin liga e desliga áreas e módulos em «Painel» (ver DESIGN-SYSTEM, 5n).

1. **`src/dados/estrutura.ts`:** novo objeto em `AREAS` com `id`, `rotulo`, `icone`, `secao` e `modulos`. `secao` é o título do grupo da barra lateral («Dados», «Operação», «Plataforma»…); áreas com o mesmo valor ficam juntas, pela ordem do ficheiro.
2. **`src/dados/rbac.ts`:** acrescente o `id` da área em `areas` de cada função que a deve ver (`VER` ou `TUDO`). Sem isso ninguém a vê.
3. Os módulos da área seguem a receita 1 ou 2. O ícone tem de existir em `Icones.tsx` (receita 7).

---

## 4. Um cartão ou uma lista na página inicial

Tudo em `src/dados/visao.ts`:

- **Cartão com série no tempo:** nova entrada em `CARTOES_SERIE` (`registos` = módulo de onde saem as linhas, `campo` = coluna de datas, `href` = módulo de detalhe, `linha` 1 ou 2). Escreva a dica do cartão em `DICA_CARTAO` (`src/dados/dicas.ts`) com o mesmo `id`.
- **Lista curta:** nova entrada em `LISTAS_VISAO` (`texto` recebe a linha e devolve a frase).
- **Cartão do anel** (percentagem + dois indicadores), **faixa de aviso**: editam-se `CARTAO_ANEL` e `AVISO_VISAO`.

Os cartões ganham sozinhos: esqueleto de carregamento, período próprio, «Visualizar como», atualizar e remover.

---

## 5. Uma secção nas definições da conta

1. **`src/dados/conta.ts`:** nova entrada em `SECOES_CONTA` (`id`, `rotulo`, `icone`, `descricao`).
2. **Componente** em `src/components/conta/` (`SecaoXxx`), composto só com as peças de `conta/Pecas.tsx`: `Cartao`, `Linha`, `LinhaCampo`, `Interruptor`, `Confirmar`, e `CodigoDialog` para confirmações por código.
3. **Registo** no objeto `SECOES` de `src/components/conta/Conta.tsx`.
4. Se a secção guarda preferências novas: acrescente-as ao tipo `Conta` e a `contaInicial` em `src/lib/conta.tsx`; leia e escreva sempre por `useConta()`.

A rota `/conta/<secção>/` e o item de menu do perfil saem de `SECOES_CONTA`.

---

## 6. Uma função (perfil de acesso) nova

1. **`src/dados/rbac.ts`:** novo objeto em `FUNCOES` (`id`, `rotulo`, `pessoa` de demonstração, `areas`, `fechados`).
2. Se a função executa transições, acrescente o `id` ao array `funcoes` das transições em `src/dados/modulos.ts`.
3. O rótulo aparece sozinho na lista de funções do formulário de utilizadores e no trocador de contas.

Lembre-se: o controlo de acesso do painel é interface. Aplique as mesmas regras no servidor.

---

## 7. Um ícone novo

Em `src/components/Icones.tsx`: importe o ícone do Phosphor e acrescente-o ao mapa com um nome em português. Use-o por `ICONES.nome` (propriedade `icon` do Kumo) ou `<Ic nome="nome" />`. Nunca importe ícones diretamente numa página.

---

## 8. Um tipo de gráfico novo

1. Acrescente a variante a `GraficoSpec` e o ramo correspondente em `opcoesDe` (`src/components/graficos/Graficos.tsx`), usando `COR`/`ChartPalette`, nunca cores à mão em páginas.
2. Confirme o tema escuro (`paraEscuro`) e o estado sem dados (`semDados`).
3. Se o tipo é escolhível nos cartões, acrescente-o a `TIPOS_CARTAO` (`ui.tsx`) e ao `especificacao` de `VisaoGeral.tsx`.

---

## 9. Uma peça de interface nova

Só se nenhuma peça existente serve:

1. Escreva-a em `src/components/` com comentário inicial, usando o Kumo e os tokens do tema.
2. Dê-lhe as variantes de estado (a carregar, vazio, desativado, tema escuro, telemóvel).
3. **Documente-a em `docs/DESIGN-SYSTEM.md`** no mesmo pull request, na secção que lhe cabe.

---

## 11. Um atalho de teclado novo

1. **`src/dados/atalhos.ts`:** nova entrada em `ATALHOS` (`id`, `rotulo`, `descricao`, `padrao` como «Ctrl+K»).
2. **`AtalhosGlobais`, em `src/components/Shell.tsx`:** um ramo novo `else if (id === "…")` com o que o atalho faz.
3. A secção Atalhos das definições da conta mostra-o sozinha, com «Alterar» e «Repor».

---

## 12. O assistente de IA

- **Conteúdo** (nome, convites, perguntas e respostas prontas, instruções da IA): `src/dados/assistente.ts`. As perguntas prontas servem de sugestões e de resposta quando a IA não está disponível.
- **Cores**: `src/styles/assistente.css` liga as variáveis `--aia-*` aos tokens do tema.
- **Servidor da IA** (opcional): ver `docs/ASSISTENTE.md`.

---

## 13. O contexto aberto (cliente) e a sua análise

1. **`src/dados/contexto.ts`:** o módulo das entidades (`registos`), as colunas de nome e de estado, «Voltar a…» e as páginas (a primeira é a análise; as outras mostram um módulo de registos filtrado por uma coluna).
2. **`src/dados/analise.ts`:** a fonte das linhas, as colunas de data, estado e entidade, as estatísticas (`estados` e `pior`), os filtros, as etapas, o que o painel de um país mostra e os países do mapa.
3. Os endereços, o seletor do cabeçalho, a barra lateral, os recentes e a página saem sozinhos. `npm test` valida as colunas e os módulos referidos.

---

## 14. Cartões arrastáveis num ecrã novo

Monte os cartões com `GrelhaOrdenavel`, com uma `chave` própria para o ecrã (a ordem fica guardada por conta):

```tsx
<GrelhaOrdenavel chave="vendas" className="grid gap-4 sm:grid-cols-2" itens={[{ id: "a", conteudo: <MeuCartao /> }, { id: "b", className: "sm:col-span-2", conteudo: <Outro /> }]} />
```

Um cartão ocultado passa `conteudo: false`. Não escreva arrastar-e-largar à mão.

---

## 15. Uma cor ou uma letra personalizável nova

- **Cor:** acrescente-a a `CORES` em `src/dados/aparencia.ts` (rótulo, descrição, grupo e a cor de origem em cada tema), o seu id ao tipo `CorId` e, em `src/lib/aparencia.ts`, as variáveis do Kumo que ela altera (com as cores de que depende). O ecrã de aparência e a pré-visualização mostram-na sozinhos.
- **Letra:** acrescente-a a `LETRAS` e a `LetraId`; em `variaveisDeLetras` dê-lhe a variável CSS e use-a no CSS. Novas famílias vão em `TIPOS_DE_LETRA` (só letras que já vêm no aparelho).

---

## 10. Mudar de produto (identidade)

Ao criar um painel novo a partir deste:

1. `package.json`: `name` e `description`. `src/dados/projeto.ts`: `contaId`, o identificador (de demonstração) que vai no meio de todos os endereços; use um novo, aleatório, de 32 caracteres hexadecimais.
2. `src/dados/textos.ts`: `meta.titulo` e `meta.descricao`. `src/dados/projeto.ts`: o endereço público (ou a variável `NEXT_PUBLIC_URL_SITE`).
3. `src/app/icon.svg`: o ícone do site.
4. A cor da marca: defina `--color-kumo-brand` (e, se quiser, as variações do botão principal) em `:root` no `src/app/globals.css`; confira os dois temas.
5. Prefixo das chaves de armazenamento (`painel.`) e dos eventos (`painel:`): localizar e substituir em `src/` se vários painéis partilharem o mesmo endereço.
6. `src/dados/`: troque menu, módulos, funções, dicas e textos pelos do projeto, seguindo as receitas acima. Apague `semente.ts`/`paineis.ts` do exemplo quando já não servirem.
7. Documentos legais (`src/components/auth/Documentos.tsx`): são texto de demonstração; substitua-os pelos reais.
8. `scripts/padroes.json`: acrescente em `proibidas` os nomes que nunca devem aparecer no código (por exemplo, nomes de clientes).
