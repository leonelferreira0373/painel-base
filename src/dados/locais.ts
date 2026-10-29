// Os locais onde uma imagem da galeria pode aparecer. Cada campo do painel que aceita imagens (a capa de um artigo, as imagens de um produto…) é um local, e a galeria mostra um botão por local para dizer onde cada imagem aparece. Um campo novo com imagens acrescenta aqui o seu local e usa <BlocoDeImagem local="…"> (components/conteudo/BlocoDeImagem.tsx).

export interface LocalDeImagem {
  id: string;
  /** Agrupa os botões da galeria («Blog», «Produtos»). */
  grupo: string;
  rotulo: string;
}

export const LOCAIS_DE_IMAGEM = [
  { id: "blog-capa", grupo: "Blog", rotulo: "Capa dos artigos" },
  { id: "blog-corpo", grupo: "Blog", rotulo: "Imagens dentro dos artigos" },
  { id: "produtos", grupo: "Produtos", rotulo: "Imagens dos produtos" },
] as const satisfies readonly LocalDeImagem[];

export type IdDeLocal = (typeof LOCAIS_DE_IMAGEM)[number]["id"];
