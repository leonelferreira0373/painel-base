// Definição dos módulos de registos: colunas, formulário de novo registo, fluxo de estados, gráficos e dados fictícios de partida.
// Para acrescentar um módulo, copie um destes blocos, mude o `id` e acrescente-o a `REGISTOS` no fim do ficheiro (ver docs/ADICIONAR-MODULO.md).
import { REGISTOS_NEGOCIOS } from "./modulos-negocios";
import { REGISTOS_SUPER } from "./modulos-super";
import { FUNCOES } from "./rbac";
import { CATEGORIAS, CLIENTES, PRODUTOS, SETORES, Sorteio } from "./semente";
import type { DefRegistos, Linha } from "./tipos";

const GESTAO = ["gestor", "administrador"];
const APOIO = ["apoio", "gestor", "administrador"];
const ADMIN = ["administrador"];

const TRANSPORTADORAS = ["Rota Azul", "Expresso Norte", "Via Rápida"] as const;
const FUNCOES_ROTULOS = FUNCOES.map((f) => f.rotulo);

function gerar(n: number, fn: (i: number) => Omit<Linha, "id">, prefixo: string): Linha[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefixo}-${i + 1}`, ...fn(i) }) as Linha);
}

const identificador = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

/** Registo com fluxo de estados, atribuição automática de campos e notificação ao cliente. */
const encomendas: DefRegistos = {
  id: "encomendas",
  titulo: "Encomendas",
  estadoChave: "estado",
  estadoInicial: "Recebida",
  colunas: [
    { chave: "processo", rotulo: "Processo" },
    { chave: "cliente", rotulo: "Cliente" },
    { chave: "produto", rotulo: "Produto" },
    { chave: "quantidade", rotulo: "Quantidade", tipo: "numero" },
    { chave: "data", rotulo: "Data", tipo: "data" },
    { chave: "transportadora", rotulo: "Transportadora" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Recebida"], para: "Em preparação", rotulo: "Aceitar e preparar", icone: "certo", funcoes: GESTAO },
    { de: ["Em preparação"], para: "Enviada", rotulo: "Marcar como enviada", icone: "camiao", funcoes: GESTAO, aplicar: (_l, n) => ({ transportadora: TRANSPORTADORAS[n % TRANSPORTADORAS.length] }) },
    { de: ["Enviada"], para: "Entregue", rotulo: "Confirmar a entrega e notificar o cliente", icone: "correio", funcoes: APOIO, notifica: true },
    { de: ["Recebida", "Em preparação"], para: "Cancelada", rotulo: "Cancelar encomenda", icone: "fechar", funcoes: GESTAO },
  ],
  campos: [
    { chave: "cliente", rotulo: "Cliente", tipo: "opcoes", opcoes: [...CLIENTES], obrigatorio: true },
    { chave: "produto", rotulo: "Produto", tipo: "opcoes", opcoes: PRODUTOS.map((p) => p.nome), obrigatorio: true },
    { chave: "quantidade", rotulo: "Quantidade", tipo: "numero", obrigatorio: true },
    { chave: "data", rotulo: "Data", tipo: "data", obrigatorio: true },
  ],
  graficos: [
    { tipo: "linha", data: "data", titulo: "Encomendas por dia" },
    { tipo: "rosca", por: "estado", titulo: "Encomendas por estado" },
    { tipo: "barras", por: "cliente", titulo: "Encomendas por cliente" },
  ],
  semente: () => {
    const s = new Sorteio(11);
    return gerar(46, (i) => {
      const estado = s.pesada(["Recebida", "Em preparação", "Enviada", "Entregue", "Cancelada"] as const, [3, 3, 3, 8, 1]);
      const expedida = estado === "Enviada" || estado === "Entregue";
      return {
        processo: s.processo("EN", i),
        cliente: s.de(CLIENTES),
        produto: s.de(PRODUTOS).nome,
        quantidade: s.entre(1, 40),
        data: s.dia(s.entre(-18, 10)),
        transportadora: expedida ? TRANSPORTADORAS[i % TRANSPORTADORAS.length] : "",
        estado,
      };
    }, "en");
  },
};

/** Registo com um fluxo curto e sem campos atribuídos. */
const devolucoes: DefRegistos = {
  id: "devolucoes",
  titulo: "Devoluções",
  estadoChave: "estado",
  estadoInicial: "Pedida",
  colunas: [
    { chave: "processo", rotulo: "Processo" },
    { chave: "cliente", rotulo: "Cliente" },
    { chave: "produto", rotulo: "Produto" },
    { chave: "motivo", rotulo: "Motivo" },
    { chave: "data", rotulo: "Data", tipo: "data" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Pedida"], para: "Aprovada", rotulo: "Aprovar e notificar o cliente", icone: "correio", funcoes: APOIO, notifica: true },
    { de: ["Aprovada"], para: "Concluída", rotulo: "Marcar como recebida", icone: "certo", funcoes: APOIO },
    { de: ["Pedida"], para: "Recusada", rotulo: "Recusar devolução", icone: "fechar", funcoes: GESTAO },
  ],
  campos: [
    { chave: "cliente", rotulo: "Cliente", tipo: "opcoes", opcoes: [...CLIENTES], obrigatorio: true },
    { chave: "produto", rotulo: "Produto", tipo: "opcoes", opcoes: PRODUTOS.map((p) => p.nome), obrigatorio: true },
    { chave: "motivo", rotulo: "Motivo", tipo: "opcoes", opcoes: ["Defeito", "Tamanho errado", "Não correspondia à descrição", "Chegou tarde"], obrigatorio: true },
    { chave: "data", rotulo: "Data", tipo: "data", obrigatorio: true },
  ],
  graficos: [
    { tipo: "linha", data: "data", titulo: "Devoluções por dia" },
    { tipo: "rosca", por: "motivo", titulo: "Motivos de devolução" },
  ],
  semente: () => {
    const s = new Sorteio(21);
    return gerar(24, (i) => ({
      processo: s.processo("DV", i),
      cliente: s.de(CLIENTES),
      produto: s.de(PRODUTOS).nome,
      motivo: s.de(["Defeito", "Tamanho errado", "Não correspondia à descrição", "Chegou tarde"]),
      data: s.dia(s.entre(-14, 6)),
      estado: s.pesada(["Pedida", "Aprovada", "Concluída", "Recusada"] as const, [3, 3, 8, 1]),
    }), "dv");
  },
};

/** Registo com colunas numéricas e uma transição que reescreve um campo. */
const produtos: DefRegistos = {
  id: "produtos",
  titulo: "Catálogo de produtos",
  estadoChave: "estado",
  estadoInicial: "Em stock",
  colunas: [
    { chave: "produto", rotulo: "Produto" },
    { chave: "categoria", rotulo: "Categoria" },
    { chave: "preco", rotulo: "Preço (€)", tipo: "numero" },
    { chave: "stock", rotulo: "Stock", tipo: "numero" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [{ de: ["Stock baixo", "Esgotado"], para: "Em stock", rotulo: "Repor stock", icone: "atualizar", funcoes: GESTAO, aplicar: () => ({ stock: 60 }) }],
  campos: [
    { chave: "produto", rotulo: "Nome do produto", tipo: "texto", obrigatorio: true },
    { chave: "categoria", rotulo: "Categoria", tipo: "opcoes", opcoes: [...CATEGORIAS], obrigatorio: true },
    { chave: "preco", rotulo: "Preço (€)", tipo: "numero", obrigatorio: true },
    { chave: "stock", rotulo: "Stock", tipo: "numero", obrigatorio: true },
  ],
  graficos: [
    { tipo: "barras", por: "categoria", medida: "stock", titulo: "Stock por categoria" },
    { tipo: "rosca", por: "estado", titulo: "Estado do stock" },
  ],
  semente: () => {
    const stocks = [42, 8, 0, 55, 23, 0, 12, 31];
    return PRODUTOS.map((p, i) => ({ id: `pr-${i + 1}`, produto: p.nome, categoria: p.categoria, preco: p.preco, stock: stocks[i], estado: stocks[i] === 0 ? "Esgotado" : stocks[i] < 15 ? "Stock baixo" : "Em stock" }));
  },
};

const carteira: DefRegistos = {
  id: "carteira",
  titulo: "Carteira de clientes",
  estadoChave: "estado",
  estadoInicial: "Em negociação",
  colunas: [
    { chave: "cliente", rotulo: "Cliente" },
    { chave: "contacto", rotulo: "Contacto" },
    { chave: "email", rotulo: "E-mail" },
    { chave: "setor", rotulo: "Setor" },
    { chave: "encomendas", rotulo: "Encomendas no ano", tipo: "numero" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Em negociação"], para: "Ativo", rotulo: "Ativar cliente", icone: "certo", funcoes: GESTAO },
    { de: ["Ativo"], para: "Suspenso", rotulo: "Suspender cliente", icone: "cadeado", funcoes: GESTAO },
    { de: ["Suspenso"], para: "Ativo", rotulo: "Reativar cliente", icone: "certo", funcoes: GESTAO },
  ],
  campos: [
    { chave: "cliente", rotulo: "Nome do cliente", tipo: "texto", obrigatorio: true },
    { chave: "contacto", rotulo: "Pessoa de contacto", tipo: "texto", obrigatorio: true },
    { chave: "setor", rotulo: "Setor", tipo: "opcoes", opcoes: [...SETORES], obrigatorio: true },
  ],
  graficos: [
    { tipo: "barras", por: "cliente", medida: "encomendas", titulo: "Encomendas por cliente" },
    { tipo: "rosca", por: "estado", titulo: "Carteira de clientes" },
  ],
  semente: () => {
    const s = new Sorteio(131);
    return CLIENTES.map((cliente, i) => {
      const contacto = s.nome();
      return { id: `ca-${i + 1}`, cliente, contacto, email: `${identificador(contacto.split(" ")[0])}@${identificador(cliente)}.example`, setor: s.de(SETORES), encomendas: s.entre(20, 260), estado: i === 5 ? "Em negociação" : i === 4 ? "Suspenso" : "Ativo" };
    });
  },
};

/** O módulo para onde vão as notificações criadas pelas transições com `notifica: true` (ver `dados/notificacoes.ts`). */
const notificacoes: DefRegistos = {
  id: "notificacoes",
  titulo: "Notificações por e-mail",
  estadoChave: "estado",
  estadoInicial: "Em fila",
  colunas: [
    { chave: "assunto", rotulo: "Assunto" },
    { chave: "destinatario", rotulo: "Destinatário" },
    { chave: "data", rotulo: "Data", tipo: "data" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [{ de: ["Falhou"], para: "Enviado", rotulo: "Reenviar", icone: "atualizar", funcoes: APOIO }],
  campos: [],
  graficos: [
    { tipo: "linha", data: "data", titulo: "E-mails por dia" },
    { tipo: "rosca", por: "estado", titulo: "Estado dos envios" },
  ],
  semente: () => {
    const s = new Sorteio(151);
    return gerar(30, () => ({ assunto: `Encomenda ${s.processo("EN", s.entre(0, 40))} entregue`, destinatario: `compras@${identificador(s.de(CLIENTES))}.example`, data: s.dia(s.entre(-12, 0)), estado: s.pesada(["Enviado", "Em fila", "Falhou"] as const, [18, 1, 1]) }), "no");
  },
};

const utilizadores: DefRegistos = {
  id: "utilizadores",
  titulo: "Utilizadores e funções",
  estadoChave: "estado",
  estadoInicial: "Ativo",
  colunas: [
    { chave: "nome", rotulo: "Nome" },
    { chave: "funcao", rotulo: "Função" },
    { chave: "equipa", rotulo: "Equipa" },
    { chave: "data", rotulo: "Último acesso", tipo: "data" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Ativo"], para: "Bloqueado", rotulo: "Bloquear acesso", icone: "cadeado", funcoes: ADMIN },
    { de: ["Bloqueado"], para: "Ativo", rotulo: "Desbloquear acesso", icone: "certo", funcoes: ADMIN },
  ],
  campos: [
    { chave: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
    { chave: "funcao", rotulo: "Função", tipo: "opcoes", opcoes: FUNCOES_ROTULOS, obrigatorio: true },
  ],
  graficos: [{ tipo: "barras", por: "funcao", titulo: "Utilizadores por função" }],
  semente: () => {
    const s = new Sorteio(161);
    const equipas = ["Vendas", "Vendas", "Apoio ao cliente", "Armazém", "Administração"];
    return gerar(22, (i) => ({ nome: s.nome(), funcao: FUNCOES_ROTULOS[i % FUNCOES_ROTULOS.length], equipa: equipas[i % equipas.length], data: s.dia(s.entre(-9, 0)), estado: s.pesada(["Ativo", "Bloqueado"] as const, [12, 1]) }), "ut");
  },
};

/** Registo só de leitura: sem estado, sem transições e sem formulário. */
const equipas: DefRegistos = {
  id: "equipas",
  titulo: "Equipas",
  colunas: [
    { chave: "equipa", rotulo: "Equipa" },
    { chave: "responsavel", rotulo: "Responsável" },
    { chave: "membros", rotulo: "Membros", tipo: "numero" },
    { chave: "emCurso", rotulo: "Encomendas em curso", tipo: "numero" },
  ],
  campos: [],
  graficos: [{ tipo: "barras", por: "equipa", medida: "emCurso", titulo: "Encomendas em curso por equipa" }],
  semente: () => {
    const s = new Sorteio(171);
    return ["Vendas", "Apoio ao cliente", "Armazém", "Administração"].map((equipa, i) => ({ id: `eq-${i + 1}`, equipa, responsavel: s.nome(), membros: s.entre(4, 22), emCurso: s.entre(3, 38) }));
  },
};

export const REGISTOS: Record<string, DefRegistos> = Object.fromEntries([encomendas, devolucoes, produtos, carteira, notificacoes, utilizadores, equipas, ...REGISTOS_SUPER, ...REGISTOS_NEGOCIOS].map((d) => [d.id, d]));
