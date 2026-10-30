// Localizar e substituir no texto do artigo: o que se procura fica assinalado no texto (e o escolhido destacado), anda-se de um para o outro e substitui-se um ou todos. Procura no texto de cada parágrafo inteiro, por isso encontra palavras que têm negrito, cor ou ligação a meio.
import { Extension } from "@tiptap/core";
import type { Node as NoPM } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface Achado {
  de: number;
  ate: number;
}

export interface EstadoDoLocalizar {
  termo: string;
  maiusculas: boolean;
  achados: Achado[];
  atual: number;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    localizar: {
      localizar: (termo: string, maiusculas?: boolean) => ReturnType;
      irParaAchado: (sentido: 1 | -1) => ReturnType;
      substituirAchado: (texto: string) => ReturnType;
      substituirTodos: (texto: string) => ReturnType;
    };
  }
}

/** Onde está o que se procura (posições no documento). `maiusculas` diz se se distingue «Casa» de «casa». */
export function acharOcorrencias(doc: NoPM, termo: string, maiusculas: boolean): Achado[] {
  if (!termo) return [];
  const procurado = maiusculas ? termo : termo.toLocaleLowerCase();
  const achados: Achado[] = [];
  doc.descendants((no, pos) => {
    if (!no.isTextblock) return true;
    let texto = "";
    const mapa: number[] = [];
    no.forEach((filho, desvio) => {
      const base = pos + 1 + desvio;
      if (filho.isText && filho.text) {
        for (let i = 0; i < filho.text.length; i += 1) {
          texto += filho.text[i];
          mapa.push(base + i);
        }
      } else {
        // uma imagem ou uma quebra de linha no meio: ocupa um lugar que nunca coincide com o que se procura
        texto += "￼";
        mapa.push(base);
      }
    });
    const alvo = maiusculas ? texto : texto.toLocaleLowerCase();
    if (alvo.length !== texto.length) return false;
    let i = alvo.indexOf(procurado);
    while (i !== -1) {
      achados.push({ de: mapa[i], ate: mapa[i + procurado.length - 1] + 1 });
      i = alvo.indexOf(procurado, i + Math.max(1, procurado.length));
    }
    return false;
  });
  return achados;
}

export const chaveDoLocalizar = new PluginKey<EstadoDoLocalizar>("localizar");

export const Localizar = Extension.create({
  name: "localizar",

  addProseMirrorPlugins() {
    return [
      new Plugin<EstadoDoLocalizar>({
        key: chaveDoLocalizar,
        state: {
          init: () => ({ termo: "", maiusculas: false, achados: [], atual: 0 }),
          apply(tr, velho, _antes, novo) {
            const meta = tr.getMeta(chaveDoLocalizar) as Partial<EstadoDoLocalizar> | undefined;
            if (!meta && !tr.docChanged) return velho;
            const termo = meta?.termo ?? velho.termo;
            const maiusculas = meta?.maiusculas ?? velho.maiusculas;
            const achados = acharOcorrencias(novo.doc, termo, maiusculas);
            const atual = meta?.atual ?? velho.atual;
            return { termo, maiusculas, achados, atual: atual >= achados.length ? 0 : atual };
          },
        },
        props: {
          decorations(estado) {
            const s = chaveDoLocalizar.getState(estado);
            if (!s || s.achados.length === 0) return DecorationSet.empty;
            return DecorationSet.create(
              estado.doc,
              s.achados.map((a, i) => Decoration.inline(a.de, a.ate, { class: i === s.atual ? "localizar-achado localizar-atual" : "localizar-achado" })),
            );
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      localizar:
        (termo, maiusculas = false) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(chaveDoLocalizar, { termo, maiusculas, atual: 0 });
          return true;
        },
      irParaAchado:
        (sentido) =>
        ({ state, tr, dispatch }) => {
          const s = chaveDoLocalizar.getState(state);
          if (!s || s.achados.length === 0) return false;
          if (dispatch) tr.setMeta(chaveDoLocalizar, { atual: (s.atual + sentido + s.achados.length) % s.achados.length });
          return true;
        },
      substituirAchado:
        (texto) =>
        ({ state, tr, dispatch }) => {
          const s = chaveDoLocalizar.getState(state);
          const a = s?.achados[s.atual];
          if (!s || !a) return false;
          if (dispatch) tr.insertText(texto, a.de, a.ate).setMeta(chaveDoLocalizar, { atual: s.atual });
          return true;
        },
      substituirTodos:
        (texto) =>
        ({ state, tr, dispatch }) => {
          const s = chaveDoLocalizar.getState(state);
          if (!s || s.achados.length === 0) return false;
          // do fim para o princípio, para as posições de trás não mudarem
          if (dispatch) for (const a of [...s.achados].reverse()) tr.insertText(texto, a.de, a.ate);
          return true;
        },
    };
  },
});
