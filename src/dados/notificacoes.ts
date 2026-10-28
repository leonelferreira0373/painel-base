// Notificações geradas pelas transições de estado com `notifica: true`: para onde vão e como se monta a linha.
import type { DefRegistos, DefTransicao, Linha } from "./tipos";

/** O módulo de registos onde cada notificação cai (tem de existir em `REGISTOS`). */
export const MODULO_NOTIFICACOES = "notificacoes";

const identificador = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

/** Monta a linha da notificação de uma transição. `n` torna o identificador único; `hoje` é a data («AAAA-MM-DD»). */
export function criarNotificacao(def: DefRegistos, linha: Linha, t: DefTransicao, n: number, hoje: string): Linha {
  const cliente = String(linha.cliente ?? "cliente");
  return {
    id: `no-n${n}`,
    assunto: `${def.titulo}: ${String(linha.processo ?? "registo")} · ${t.para}`,
    destinatario: `compras@${identificador(cliente)}.example`,
    data: hoje,
    estado: "Enviado",
  };
}
