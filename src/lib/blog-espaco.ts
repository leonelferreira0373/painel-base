// No editor do blog, o espaço corta a formatação de palavra: escrever um espaço a seguir a uma palavra a negrito, itálico, sublinhado, riscado, código ou com realce põe o espaço sem essa formatação e o que se escreve a seguir começa limpo (o tamanho, a cor e o alinhamento continuam). Só vale no fim da parte formatada: um espaço no meio de uma frase a negrito não a parte. Um plugin do TipTap e a regra pura que o decide.
import { Extension } from "@tiptap/core";
import type { Mark } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/** As formatações que acabam num espaço. */
export const MARCAS_DE_PALAVRA = ["bold", "italic", "underline", "strike", "code", "highlight"];

/** As formatações que o espaço deixa de continuar: as que estão ligadas no cursor e não continuam no que vem a seguir. */
export function marcasAParar(atuais: readonly Mark[], seguintes: readonly Mark[]): Mark[] {
  return atuais.filter((m) => MARCAS_DE_PALAVRA.includes(m.type.name) && !m.isInSet(seguintes));
}

export const EspacoQuebraFormatacao = Extension.create({
  name: "espacoQuebraFormatacao",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("espacoQuebraFormatacao"),
        props: {
          handleTextInput(view, from, to, text) {
            // o texto pode vir de uma vez com o espaço lá dentro (a sugestão do teclado, uma palavra colada): o que vem antes do espaço leva a formatação, o espaço e o que se segue não
            if (from !== to || !text.includes(" ")) return false;
            const { state } = view;
            const posicao = state.doc.resolve(from);
            const atuais = state.storedMarks ?? posicao.marks();
            const parar = marcasAParar(atuais, posicao.nodeAfter?.marks ?? []);
            if (parar.length === 0) return false;
            const restantes = atuais.filter((m) => !m.isInSet(parar));
            const corte = text.indexOf(" ");
            const nos = [...(corte > 0 ? [state.schema.text(text.slice(0, corte), atuais)] : []), state.schema.text(text.slice(corte), restantes)];
            view.dispatch(state.tr.replaceWith(from, to, nos).setStoredMarks(restantes).scrollIntoView());
            return true;
          },
        },
      }),
    ];
  },
});
