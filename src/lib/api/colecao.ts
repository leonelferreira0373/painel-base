// Uma coleção de itens com identificador (as contas bancárias, as regras do firewall…): em modo simulado vive no navegador; em modo ligado lê-se do servidor (GET na lista) e escreve-se com PUT e DELETE em `<lista>/{id}`, e o ecrã mostra sempre o que o servidor devolver. Os ecrãs não sabem em que modo estão.
import { chamar, useApi, useLigacao } from "./cliente";
import { useGuardado } from "../guardado";

export function useColecao<T extends { id: string }>(caminho: string, chave: string, inicial: T[]) {
  const ligacao = useLigacao();
  const [local, setLocal] = useGuardado<T[]>(chave, inicial);
  const api = useApi<{ itens: T[] }>(caminho, () => ({ itens: [] }));
  const ligado = ligacao.modo === "ligado";
  const itens = ligado ? (api.dados?.itens ?? []) : local;
  return {
    itens,
    modo: ligacao.modo,
    erro: api.erro,
    aCarregar: ligado && api.aCarregar,
    recarregar: api.recarregar,
    /** Cria ou altera um item. */
    guardar: async (item: T) => {
      if (ligado) {
        await chamar(ligacao, "PUT", `${caminho}/{id}`, item, { id: item.id });
        api.recarregar();
      } else setLocal((l) => (l.some((x) => x.id === item.id) ? l.map((x) => (x.id === item.id ? item : x)) : [...l, item]));
    },
    /** Muda vários itens de uma vez (por exemplo, trocar a conta principal). */
    guardarVarios: async (novos: T[]) => {
      if (ligado) {
        for (const item of novos) await chamar(ligacao, "PUT", `${caminho}/{id}`, item, { id: item.id });
        api.recarregar();
      } else setLocal((l) => l.map((x) => novos.find((n) => n.id === x.id) ?? x));
    },
    remover: async (id: string) => {
      if (ligado) {
        await chamar(ligacao, "DELETE", `${caminho}/{id}`, undefined, { id });
        api.recarregar();
      } else setLocal((l) => l.filter((x) => x.id !== id));
    },
  };
}
