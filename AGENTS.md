# Regras para assistentes de programação

Este repositório tem um sistema de design e padrões de código fixos. Antes de escrever código leia, por esta ordem:

1. `docs/DESIGN-SYSTEM.md` — as peças de interface e as regras visuais.
2. `docs/PADROES-DE-CODIGO.md` — as regras de código.
3. `docs/ADICIONAR-MODULO.md` — a receita para o que vai fazer.

## Regras que não se negociam

- **Reuse antes de criar.** Procure a peça em `src/components/` (`ui.tsx`, `Dica.tsx`, `Estados.tsx`, `Grelhas.tsx`, `Periodo.tsx`, `conta/Pecas.tsx`, `auth/Moldura.tsx`) e nos componentes do Kumo. Uma peça nova só se nenhuma serve — e documenta-se em `docs/DESIGN-SYSTEM.md`.
- **O que é do projeto vive em `src/dados/`.** Acrescentar um módulo não pode exigir alterar um componente; se exigir, acrescente a opção em `src/dados/`.
- **Tokens do tema, nunca cores fixas.** Funciona nos dois temas.
- **Nada de HTML nem de base64**: sem ficheiros `.html`, sem `dangerouslySetInnerHTML`, sem `data:…;base64`.
- **Sem texto de ajuda debaixo de títulos.** A explicação vai numa dica (`Dica`, textos em `src/dados/dicas.ts`).
- **Um só botão `primary` por zona**; botões só de ícone levam dica e `aria-label`.
- **Toda a página começa com `Pagina` + `Titulo`**, tem estado a carregar, vazio e sem permissão, e funciona a 375 px e no tema escuro.
- **Português natural de empresa** nos textos; ids e caminhos em minúsculas, sem acentos.
- **Todo o ficheiro de código começa por um comentário** a dizer para que serve.
- **Exportação estática:** nada de código de servidor do Next (rotas `route.ts`, `cookies()`, `headers()`).
- Não ponha segredos, nomes de clientes nem dados pessoais reais no repositório.

## Antes de dar por terminado

```bash
npm run padroes && npm test && npm run build && npm run typecheck
```

`npm test` verifica a coerência de `src/dados/` (cada módulo do menu tem definição, cada estado tem dica, cada cartão aponta para colunas reais): se falhar, a mensagem diz o que falta.
