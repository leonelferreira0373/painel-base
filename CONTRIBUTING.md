# Contribuir

Obrigado por querer ajudar. As regras estão em três documentos; leia-os antes de abrir um pull request:

- [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md): as peças de interface e as regras visuais.
- [`docs/PADROES-DE-CODIGO.md`](docs/PADROES-DE-CODIGO.md): as regras de código.
- [`docs/ADICIONAR-MODULO.md`](docs/ADICIONAR-MODULO.md): as receitas para acrescentar páginas e funcionalidades.

## Fluxo

1. Abra uma _issue_ para mudanças grandes, para combinarmos a direção.
2. Faça um ramo a partir de `main` e uma só coisa por pull request.
3. Antes de abrir: `npm run padroes && npm test && npm run build && npm run typecheck`.
4. Preencha a lista de verificação do pull request. Se criou uma peça de interface, documente-a em `docs/DESIGN-SYSTEM.md`.

## O que não entra

Ficheiros HTML, dados em base64, cores fixas fora dos gráficos, dependências com pedidos a terceiros em execução (o CSP não os permite), segredos ou dados reais de pessoas ou empresas.
