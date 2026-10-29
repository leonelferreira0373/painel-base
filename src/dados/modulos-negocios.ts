// Os módulos de registos próprios de cada tipo de negócio: o hotel (reservas e quartos), o táxi (corridas e motoristas) e a loja (encomendas e stock). Só aparecem no painel quando o pacote do Master Admin liga a área (dados/pacotes.ts). Juntam-se aos de modulos.ts em REGISTOS.
import { Sorteio } from "./semente";
import type { DefRegistos, Linha } from "./tipos";

const GESTAO = ["administrador", "master"];

// ---------- hotel ----------

export interface QuartoDoHotel {
  numero: string;
  tipo: "Standard" | "Superior" | "Suite";
  andar: number;
  tarifa: number;
}

export const TIPOS_DE_QUARTO = ["Standard", "Superior", "Suite"] as const;
const TARIFAS: Record<(typeof TIPOS_DE_QUARTO)[number], number> = { Standard: 38_000, Superior: 52_000, Suite: 95_000 };

/** Vinte quartos: dez no 1.º andar e dez no 2.º, a maior parte Standard e as últimas duas de cada andar Suite. */
export const QUARTOS_DO_HOTEL: QuartoDoHotel[] = Array.from({ length: 20 }, (_, i) => {
  const andar = Math.floor(i / 10) + 1;
  const n = i % 10;
  const tipo = n < 5 ? "Standard" : n < 8 ? "Superior" : "Suite";
  return { numero: String(andar * 100 + n + 1), tipo, andar, tarifa: TARIFAS[tipo] };
});

/** As reservas: umas já feitas, uma em curso para cada quarto ocupado e outras por vir. */
export function gerarReservas(n = 40): Linha[] {
  const s = new Sorteio(611);
  return Array.from({ length: n }, (_, i) => {
    const q = s.de(QUARTOS_DO_HOTEL);
    const deslocamento = s.entre(-24, 14);
    const noites = s.entre(1, 6);
    const terminou = deslocamento + noites < 0;
    const emCurso = deslocamento <= 0 && !terminou;
    const estado = s.entre(1, 100) <= 8 ? "Cancelada" : terminou ? "Concluída" : emCurso ? "Check-in" : s.entre(1, 100) <= 30 ? "Pendente" : "Confirmada";
    return { id: `reservas-${i + 1}`, referencia: s.processo("RS", i), hospede: s.nome(), quarto: q.numero, tipo: q.tipo, entrada: s.dia(deslocamento), saida: s.dia(deslocamento + noites), noites, valor: q.tarifa * noites, estado };
  });
}

export function gerarQuartos(): Linha[] {
  const ocupados = new Set(gerarReservas().filter((r) => r.estado === "Check-in").map((r) => String(r.quarto)));
  const s = new Sorteio(612);
  return QUARTOS_DO_HOTEL.map((q, i) => ({
    id: `quartos-${i + 1}`,
    numero: q.numero,
    tipo: q.tipo,
    andar: q.andar,
    tarifa: q.tarifa,
    estado: ocupados.has(q.numero) ? "Ocupado" : s.entre(1, 100) <= 12 ? "Limpeza" : s.entre(1, 100) <= 6 ? "Manutenção" : "Livre",
  }));
}

const reservas: DefRegistos = {
  id: "reservas",
  titulo: "Reservas",
  estadoChave: "estado",
  estadoInicial: "Pendente",
  colunas: [
    { chave: "referencia", rotulo: "Reserva" },
    { chave: "hospede", rotulo: "Hóspede" },
    { chave: "quarto", rotulo: "Quarto" },
    { chave: "tipo", rotulo: "Tipo" },
    { chave: "entrada", rotulo: "Entrada", tipo: "data" },
    { chave: "saida", rotulo: "Saída", tipo: "data" },
    { chave: "noites", rotulo: "Noites", tipo: "numero" },
    { chave: "valor", rotulo: "Valor (AOA)", tipo: "numero" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Pendente"], para: "Confirmada", rotulo: "Confirmar a reserva", icone: "certo", funcoes: GESTAO, notifica: true },
    { de: ["Confirmada"], para: "Check-in", rotulo: "Fazer o check-in", icone: "chave", funcoes: GESTAO },
    { de: ["Check-in"], para: "Concluída", rotulo: "Fazer o check-out", icone: "certo", funcoes: GESTAO },
    { de: ["Pendente", "Confirmada"], para: "Cancelada", rotulo: "Cancelar a reserva", icone: "fechar", funcoes: GESTAO },
  ],
  campos: [
    { chave: "hospede", rotulo: "Hóspede", tipo: "texto", obrigatorio: true },
    { chave: "quarto", rotulo: "Quarto", tipo: "opcoes", opcoes: QUARTOS_DO_HOTEL.map((q) => q.numero), obrigatorio: true },
    { chave: "entrada", rotulo: "Entrada", tipo: "data", obrigatorio: true },
    { chave: "saida", rotulo: "Saída", tipo: "data", obrigatorio: true },
    { chave: "valor", rotulo: "Valor (AOA)", tipo: "numero", obrigatorio: true },
  ],
  graficos: [
    { tipo: "linha", data: "entrada", medida: "valor", titulo: "Receita por entrada" },
    { tipo: "rosca", por: "estado", titulo: "Reservas por estado" },
    { tipo: "barras", por: "tipo", medida: "valor", titulo: "Receita por tipo de quarto" },
  ],
  semente: () => gerarReservas(),
};

const quartos: DefRegistos = {
  id: "quartos",
  titulo: "Quartos",
  estadoChave: "estado",
  estadoInicial: "Livre",
  colunas: [
    { chave: "numero", rotulo: "Quarto" },
    { chave: "tipo", rotulo: "Tipo" },
    { chave: "andar", rotulo: "Andar", tipo: "numero" },
    { chave: "tarifa", rotulo: "Tarifa por noite (AOA)", tipo: "numero" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Livre"], para: "Ocupado", rotulo: "Ocupar o quarto", icone: "chave", funcoes: GESTAO },
    { de: ["Ocupado"], para: "Limpeza", rotulo: "Fazer o check-out", icone: "repor", funcoes: GESTAO },
    { de: ["Limpeza"], para: "Livre", rotulo: "Marcar como limpo", icone: "certo", funcoes: GESTAO },
    { de: ["Livre", "Limpeza"], para: "Manutenção", rotulo: "Pôr em manutenção", icone: "engrenagem", funcoes: GESTAO },
    { de: ["Manutenção"], para: "Livre", rotulo: "Terminar a manutenção", icone: "certo", funcoes: GESTAO },
  ],
  campos: [
    { chave: "numero", rotulo: "Número", tipo: "texto", obrigatorio: true },
    { chave: "tipo", rotulo: "Tipo", tipo: "opcoes", opcoes: [...TIPOS_DE_QUARTO], obrigatorio: true },
    { chave: "andar", rotulo: "Andar", tipo: "numero", obrigatorio: true },
    { chave: "tarifa", rotulo: "Tarifa por noite (AOA)", tipo: "numero", obrigatorio: true },
  ],
  graficos: [
    { tipo: "rosca", por: "estado", titulo: "Quartos por estado" },
    { tipo: "barras", por: "tipo", titulo: "Quartos por tipo" },
  ],
  semente: () => gerarQuartos(),
};

// ---------- táxi ----------

export const ZONAS_DO_TAXI = ["Talatona", "Maianga", "Viana", "Kilamba", "Cacuaco", "Ingombota"] as const;

export function gerarMotoristas(n = 12): Linha[] {
  const s = new Sorteio(621);
  return Array.from({ length: n }, (_, i) => ({
    id: `motoristas-${i + 1}`,
    nome: s.nome(),
    viatura: s.matricula(),
    zona: s.de(ZONAS_DO_TAXI),
    corridas: s.entre(40, 620),
    avaliacao: Math.round((4.1 + s.entre(0, 8) / 10) * 10) / 10,
    estado: s.pesada(["Disponível", "Em corrida", "Pausa", "Offline"], [5, 5, 1, 1]),
  }));
}

export function gerarCorridas(n = 40): Linha[] {
  const s = new Sorteio(622);
  const motoristas = gerarMotoristas().map((m) => String(m.nome));
  return Array.from({ length: n }, (_, i) => {
    const distancia = s.entre(2, 28);
    const origem = s.de(ZONAS_DO_TAXI);
    let destino = s.de(ZONAS_DO_TAXI);
    if (destino === origem) destino = ZONAS_DO_TAXI[(ZONAS_DO_TAXI.indexOf(origem) + 1) % ZONAS_DO_TAXI.length];
    return { id: `corridas-${i + 1}`, referencia: s.processo("CR", i), passageiro: s.nome(), origem, destino, motorista: s.de(motoristas), distancia, valor: Math.round((1500 + distancia * 420) / 50) * 50, data: s.dia(-s.entre(0, 12)), estado: i < 3 ? "Pedida" : s.pesada(["Concluída", "Cancelada", "Em curso", "A caminho"], [30, 3, 1, 1]) };
  });
}

const corridas: DefRegistos = {
  id: "corridas",
  titulo: "Corridas",
  estadoChave: "estado",
  estadoInicial: "Pedida",
  colunas: [
    { chave: "referencia", rotulo: "Corrida" },
    { chave: "passageiro", rotulo: "Passageiro" },
    { chave: "origem", rotulo: "Origem" },
    { chave: "destino", rotulo: "Destino" },
    { chave: "motorista", rotulo: "Motorista" },
    { chave: "distancia", rotulo: "Distância (km)", tipo: "numero" },
    { chave: "valor", rotulo: "Valor (AOA)", tipo: "numero" },
    { chave: "data", rotulo: "Data", tipo: "data" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Pedida"], para: "A caminho", rotulo: "Atribuir um motorista", icone: "carro", funcoes: GESTAO },
    { de: ["A caminho"], para: "Em curso", rotulo: "Começar a corrida", icone: "pino", funcoes: GESTAO },
    { de: ["Em curso"], para: "Concluída", rotulo: "Terminar a corrida", icone: "certo", funcoes: GESTAO },
    { de: ["Pedida", "A caminho"], para: "Cancelada", rotulo: "Cancelar a corrida", icone: "fechar", funcoes: GESTAO },
  ],
  campos: [
    { chave: "passageiro", rotulo: "Passageiro", tipo: "texto", obrigatorio: true },
    { chave: "origem", rotulo: "Origem", tipo: "opcoes", opcoes: [...ZONAS_DO_TAXI], obrigatorio: true },
    { chave: "destino", rotulo: "Destino", tipo: "opcoes", opcoes: [...ZONAS_DO_TAXI], obrigatorio: true },
    { chave: "distancia", rotulo: "Distância (km)", tipo: "numero", obrigatorio: true },
    { chave: "valor", rotulo: "Valor (AOA)", tipo: "numero", obrigatorio: true },
    { chave: "data", rotulo: "Data", tipo: "data", obrigatorio: true },
  ],
  graficos: [
    { tipo: "linha", data: "data", medida: "valor", titulo: "Receita por dia" },
    { tipo: "rosca", por: "estado", titulo: "Corridas por estado" },
    { tipo: "barras", por: "origem", titulo: "Corridas por zona de origem" },
  ],
  semente: () => gerarCorridas(),
};

const motoristas: DefRegistos = {
  id: "motoristas",
  titulo: "Motoristas",
  estadoChave: "estado",
  estadoInicial: "Disponível",
  colunas: [
    { chave: "nome", rotulo: "Motorista" },
    { chave: "viatura", rotulo: "Viatura" },
    { chave: "zona", rotulo: "Zona" },
    { chave: "corridas", rotulo: "Corridas", tipo: "numero" },
    { chave: "avaliacao", rotulo: "Avaliação", tipo: "numero" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Disponível"], para: "Pausa", rotulo: "Pôr em pausa", icone: "temporizador", funcoes: GESTAO },
    { de: ["Pausa", "Offline"], para: "Disponível", rotulo: "Pôr disponível", icone: "certo", funcoes: GESTAO },
    { de: ["Disponível", "Pausa"], para: "Offline", rotulo: "Pôr offline", icone: "fechar", funcoes: GESTAO },
  ],
  campos: [
    { chave: "nome", rotulo: "Nome", tipo: "texto", obrigatorio: true },
    { chave: "viatura", rotulo: "Matrícula", tipo: "texto", obrigatorio: true },
    { chave: "zona", rotulo: "Zona", tipo: "opcoes", opcoes: [...ZONAS_DO_TAXI], obrigatorio: true },
  ],
  graficos: [
    { tipo: "rosca", por: "estado", titulo: "Motoristas por estado" },
    { tipo: "barras", por: "zona", titulo: "Motoristas por zona" },
  ],
  semente: () => gerarMotoristas(),
};

// ---------- loja ----------

export const PRODUTOS_DA_LOJA = ["Capacete de segurança", "Luvas técnicas", "Colete refletor", "Botas de proteção", "Cabo de aço 10 mm", "Válvula de esfera", "Lanterna LED", "Extintor 6 kg", "Rádio VHF", "Kit de primeiros socorros", "Corda de amarração", "Óculos de proteção", "Máscara respiratória", "Tampões de ouvidos"] as const;
const PRECOS = [45_900, 6_500, 8_200, 38_000, 21_000, 54_000, 9_800, 27_500, 112_000, 18_400, 12_900, 4_700, 15_600, 1_900];

export function gerarStock(): Linha[] {
  const s = new Sorteio(631);
  return PRODUTOS_DA_LOJA.map((produto, i) => {
    const quantidade = s.pesada([s.entre(0, 6), s.entre(20, 90), s.entre(100, 400)], [2, 5, 4]);
    const minimo = s.entre(10, 30);
    return { id: `stock-${i + 1}`, sku: `SK-${String(100 + i)}`, produto, quantidade, minimo, preco: PRECOS[i], estado: quantidade === 0 ? "Esgotado" : quantidade <= minimo ? "Stock baixo" : "Em stock" };
  });
}

export function gerarEncomendas(n = 30): Linha[] {
  const s = new Sorteio(632);
  return Array.from({ length: n }, (_, i) => {
    const k = s.entre(0, PRODUTOS_DA_LOJA.length - 1);
    const quantidade = s.entre(1, 12);
    return { id: `encomendas-${i + 1}`, referencia: s.processo("EN", i), cliente: s.nome(), produto: PRODUTOS_DA_LOJA[k], quantidade, valor: PRECOS[k] * quantidade, data: s.dia(-s.entre(0, 20)), estado: s.pesada(["Entregue", "Enviada", "Em preparação", "Pendente", "Cancelada"], [14, 5, 4, 3, 2]) };
  });
}

const encomendas: DefRegistos = {
  id: "encomendas-loja",
  titulo: "Encomendas",
  estadoChave: "estado",
  estadoInicial: "Pendente",
  colunas: [
    { chave: "referencia", rotulo: "Encomenda" },
    { chave: "cliente", rotulo: "Cliente" },
    { chave: "produto", rotulo: "Produto" },
    { chave: "quantidade", rotulo: "Quantidade", tipo: "numero" },
    { chave: "valor", rotulo: "Valor (AOA)", tipo: "numero" },
    { chave: "data", rotulo: "Data", tipo: "data" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  transicoes: [
    { de: ["Pendente"], para: "Em preparação", rotulo: "Preparar a encomenda", icone: "produto", funcoes: GESTAO },
    { de: ["Em preparação"], para: "Enviada", rotulo: "Enviar a encomenda", icone: "camiao", funcoes: GESTAO, notifica: true },
    { de: ["Enviada"], para: "Entregue", rotulo: "Marcar como entregue", icone: "certo", funcoes: GESTAO },
    { de: ["Pendente", "Em preparação"], para: "Cancelada", rotulo: "Cancelar a encomenda", icone: "fechar", funcoes: GESTAO },
  ],
  campos: [
    { chave: "cliente", rotulo: "Cliente", tipo: "texto", obrigatorio: true },
    { chave: "produto", rotulo: "Produto", tipo: "opcoes", opcoes: [...PRODUTOS_DA_LOJA], obrigatorio: true },
    { chave: "quantidade", rotulo: "Quantidade", tipo: "numero", obrigatorio: true },
    { chave: "valor", rotulo: "Valor (AOA)", tipo: "numero", obrigatorio: true },
    { chave: "data", rotulo: "Data", tipo: "data", obrigatorio: true },
  ],
  graficos: [
    { tipo: "linha", data: "data", medida: "valor", titulo: "Vendas por dia" },
    { tipo: "rosca", por: "estado", titulo: "Encomendas por estado" },
    { tipo: "barras", por: "produto", medida: "valor", titulo: "Vendas por produto" },
  ],
  semente: () => gerarEncomendas(),
};

const stock: DefRegistos = {
  id: "stock",
  titulo: "Stock",
  estadoChave: "estado",
  estadoInicial: "Em stock",
  colunas: [
    { chave: "sku", rotulo: "Código" },
    { chave: "produto", rotulo: "Produto" },
    { chave: "quantidade", rotulo: "Quantidade", tipo: "numero" },
    { chave: "minimo", rotulo: "Mínimo", tipo: "numero" },
    { chave: "preco", rotulo: "Preço (AOA)", tipo: "numero" },
    { chave: "estado", rotulo: "Estado", tipo: "estado" },
  ],
  campos: [
    { chave: "produto", rotulo: "Produto", tipo: "texto", obrigatorio: true },
    { chave: "quantidade", rotulo: "Quantidade", tipo: "numero", obrigatorio: true },
    { chave: "minimo", rotulo: "Mínimo", tipo: "numero", obrigatorio: true },
    { chave: "preco", rotulo: "Preço (AOA)", tipo: "numero", obrigatorio: true },
  ],
  graficos: [
    { tipo: "rosca", por: "estado", titulo: "Produtos por estado" },
    { tipo: "barras", por: "produto", medida: "quantidade", titulo: "Quantidade por produto" },
  ],
  semente: () => gerarStock(),
};

export const REGISTOS_NEGOCIOS: DefRegistos[] = [reservas, quartos, corridas, motoristas, encomendas, stock];

/** O que cada estado quer dizer (a dica da etiqueta). */
export const SIGNIFICADO_NEGOCIOS: Record<string, Record<string, string>> = {
  reservas: {
    Pendente: "Pedida e ainda sem confirmação do hotel.",
    Confirmada: "O hotel confirmou o quarto e as datas; o hóspede é avisado por e-mail.",
    "Check-in": "O hóspede já chegou e está no quarto.",
    Concluída: "O hóspede já saiu e a estadia está fechada.",
    Cancelada: "Cancelada antes da chegada; não conta na receita.",
  },
  quartos: {
    Livre: "Pronto para receber um hóspede.",
    Ocupado: "Tem um hóspede neste momento.",
    Limpeza: "Já saiu o hóspede e falta limpar.",
    Manutenção: "Fora de serviço até a manutenção terminar.",
  },
  corridas: {
    Pedida: "O passageiro pediu e ainda não há motorista.",
    "A caminho": "Já tem motorista, que vai buscar o passageiro.",
    "Em curso": "O passageiro já entrou e a viagem está a decorrer.",
    Concluída: "A viagem terminou e foi cobrada.",
    Cancelada: "Cancelada antes de terminar; não é cobrada.",
  },
  motoristas: {
    Disponível: "Pode receber uma corrida.",
    "Em corrida": "Está com um passageiro.",
    Pausa: "Parou um pouco e não recebe corridas.",
    Offline: "Não está a trabalhar.",
  },
  "encomendas-loja": {
    Pendente: "Chegou e ainda ninguém a preparou.",
    "Em preparação": "A separar os produtos e a embalar.",
    Enviada: "Saiu da loja; o cliente é avisado por e-mail.",
    Entregue: "O cliente recebeu; já não tem mais passos.",
    Cancelada: "Cancelada antes de sair; o stock volta.",
  },
  stock: {
    "Em stock": "Há quantidade acima do mínimo.",
    "Stock baixo": "A quantidade chegou ao mínimo: convém repor.",
    Esgotado: "Não há nenhuma unidade.",
  },
};
