# Segurança

Se encontrar uma vulnerabilidade, **não abra uma _issue_ pública**. Use «Report a vulnerability» no separador _Security_ do repositório no GitHub, com os passos para a reproduzir.

Notas para quem usa o projeto:

- A autenticação e o controlo de acesso do painel são **simulados** no navegador até ligar o `servidor-auth`; não protegem dados. Ver [`docs/AUTENTICACAO.md`](docs/AUTENTICACAO.md).
- Repita no servidor todas as permissões que o painel esconde ou desativa.
- Nunca ponha segredos no código nem na imagem; o `servidor-auth` lê-os do ambiente (`AUTH_SEGREDO`).
