// A pontuação de SEO de um artigo, ao vivo, como a do WordPress (Yoast): uma lista de verificações (o título, a descrição, o tamanho do texto, o tema do artigo no título e no início, os subtítulos, as imagens com texto alternativo, as ligações, as frases e os parágrafos curtos), cada uma «boa», «a melhorar» ou «fraca», com uma frase simples a dizer o que fazer, e uma nota de 0 a 100. Funções puras, sem DOM. O motor é nosso (o do Yoast é GPL e só pensa em inglês); as regras são as que os motores de pesquisa e o Yoast usam: título com 30 a 60 letras, descrição com 120 a 155, mais de 300 palavras, o tema entre 0,5 % e 3 % do texto.
import { textoDoHtml } from "./blog-html";

export type EstadoDaVerificacao = "bom" | "melhorar" | "fraco";
export type NivelDoSeo = "bom" | "melhorar" | "fraco";

export interface Verificacao {
  id: string;
  estado: EstadoDaVerificacao;
  /** O que se vê e o que fazer, numa frase. */
  mensagem: string;
}

export interface EntradaDoSeo {
  /** O título da página na pesquisa. */
  titulo: string;
  descricao: string;
  /** O artigo em HTML (o do editor visual). */
  html: string;
  /** O tema do artigo (a palavra ou expressão que as pessoas vão procurar). */
  tema: string;
  /** O artigo tem imagem de capa. */
  capa: boolean;
  indexar: boolean;
}

export interface ResultadoDoSeo {
  /** De 0 a 100. */
  pontos: number;
  nivel: NivelDoSeo;
  verificacoes: Verificacao[];
}

const semAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const palavrasDe = (t: string) => t.split(/\s+/).filter(Boolean);

/** Quantas vezes o tema aparece no texto (sem distinguir maiúsculas nem acentos). */
export function contarTema(texto: string, tema: string): number {
  const t = semAcentos(tema).trim();
  if (!t) return 0;
  const escapado = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (semAcentos(texto).match(new RegExp(`(?<![a-z0-9])${escapado}`, "g")) ?? []).length;
}

const frasesDe = (texto: string) => texto.split(/(?<=[.!?…])\s+/).map((f) => f.trim()).filter(Boolean);

/** O texto do primeiro parágrafo com texto. */
const primeiroParagrafo = (html: string): string => {
  for (const m of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = textoDoHtml(m[1]);
    if (t) return t;
  }
  return "";
};

const IMAGEM = /<img\b[^>]*>/gi;

const verificacao = (id: string, estado: EstadoDaVerificacao, mensagem: string): Verificacao => ({ id, estado, mensagem });

/** Corre todas as verificações e dá a nota. */
export function analisarSeo(e: EntradaDoSeo): ResultadoDoSeo {
  const texto = textoDoHtml(e.html);
  const palavras = palavrasDe(texto).length;
  const v: Verificacao[] = [];

  // o título
  const t = e.titulo.trim().length;
  v.push(
    t === 0
      ? verificacao("titulo", "fraco", "Falta o título. Escreva-o no início do artigo.")
      : t < 30
        ? verificacao("titulo", "melhorar", "O título é curto. Use entre 30 e 60 letras para dizer mais sobre o artigo.")
        : t <= 60
          ? verificacao("titulo", "bom", "O título tem um bom tamanho.")
          : t <= 70
            ? verificacao("titulo", "melhorar", "O título é um pouco comprido e pode ser cortado na pesquisa. Use até 60 letras.")
            : verificacao("titulo", "fraco", "O título é muito comprido e vai ser cortado na pesquisa. Use até 60 letras."),
  );

  // a descrição
  const d = e.descricao.trim().length;
  v.push(
    d === 0
      ? verificacao("descricao", "fraco", "Falta a descrição que aparece por baixo do título na pesquisa.")
      : d < 70
        ? verificacao("descricao", "fraco", "A descrição é muito curta. Use entre 120 e 155 letras.")
        : d < 120
          ? verificacao("descricao", "melhorar", "A descrição é curta. Use entre 120 e 155 letras.")
          : d <= 155
            ? verificacao("descricao", "bom", "A descrição tem um bom tamanho.")
            : d <= 170
              ? verificacao("descricao", "melhorar", "A descrição é um pouco comprida e pode ser cortada na pesquisa. Use até 155 letras.")
              : verificacao("descricao", "fraco", "A descrição é muito comprida e vai ser cortada na pesquisa. Use até 155 letras."),
  );

  // o texto
  v.push(
    palavras >= 300
      ? verificacao("texto", "bom", `O artigo tem ${palavras} palavras: é um bom tamanho.`)
      : palavras >= 150
        ? verificacao("texto", "melhorar", `O artigo tem ${palavras} palavras. Com mais de 300 aparece melhor na pesquisa.`)
        : verificacao("texto", "fraco", `O artigo tem ${palavras} ${palavras === 1 ? "palavra" : "palavras"}. Escreva pelo menos 300.`),
  );

  // o tema
  const tema = e.tema.trim();
  if (!tema) {
    v.push(verificacao("tema", "melhorar", "Escolha o tema do artigo: a palavra que as pessoas vão procurar."));
  } else {
    v.push(contarTema(e.titulo, tema) > 0 ? verificacao("tema-titulo", "bom", "O tema está no título.") : verificacao("tema-titulo", "fraco", `Ponha «${tema}» no título.`));
    v.push(contarTema(primeiroParagrafo(e.html), tema) > 0 ? verificacao("tema-inicio", "bom", "O tema aparece logo no primeiro parágrafo.") : verificacao("tema-inicio", "melhorar", `Fale de «${tema}» já no primeiro parágrafo.`));
    v.push(contarTema(e.descricao, tema) > 0 ? verificacao("tema-descricao", "bom", "O tema está na descrição.") : verificacao("tema-descricao", "melhorar", `Ponha «${tema}» na descrição.`));
    const vezes = contarTema(texto, tema);
    const densidade = palavras > 0 ? (vezes * palavrasDe(tema).length * 100) / palavras : 0;
    v.push(
      vezes === 0
        ? verificacao("tema-texto", "fraco", `O tema «${tema}» não aparece no texto.`)
        : densidade < 0.5
          ? verificacao("tema-texto", "melhorar", `O tema «${tema}» aparece pouco no texto (${vezes} ${vezes === 1 ? "vez" : "vezes"}). Use-o mais algumas vezes, de forma natural.`)
          : densidade <= 3
            ? verificacao("tema-texto", "bom", `O tema aparece ${vezes} ${vezes === 1 ? "vez" : "vezes"} no texto, o que é certo.`)
            : verificacao("tema-texto", "melhorar", `O tema «${tema}» aparece demasiadas vezes (${vezes}). Varie as palavras.`),
    );
  }

  // a estrutura
  const subtitulos = (e.html.match(/<h[2-4]\b/gi) ?? []).length;
  v.push(subtitulos > 0 ? verificacao("subtitulos", "bom", "O artigo tem subtítulos, que ajudam a ler.") : palavras >= 200 ? verificacao("subtitulos", "melhorar", "Divida o texto com subtítulos (botão de estilo do texto).") : verificacao("subtitulos", "bom", "O texto é curto e não precisa de subtítulos."));

  // as imagens
  const imagens = e.html.match(IMAGEM) ?? [];
  const semAlt = imagens.filter((i) => !/\balt="[^"]+"/i.test(i)).length;
  v.push(e.capa || imagens.length > 0 ? verificacao("imagens", "bom", "O artigo tem imagens.") : verificacao("imagens", "melhorar", "Acrescente uma imagem de capa ou uma imagem no texto."));
  if (imagens.length > 0) v.push(semAlt === 0 ? verificacao("alt", "bom", "Todas as imagens do texto têm descrição.") : verificacao("alt", "melhorar", `${semAlt} ${semAlt === 1 ? "imagem não tem" : "imagens não têm"} descrição. Escolha a imagem e escreva o texto alternativo.`));

  // as ligações
  v.push(/<a\b[^>]*\bhref=/i.test(e.html) ? verificacao("ligacoes", "bom", "O artigo tem ligações para outras páginas.") : verificacao("ligacoes", "melhorar", "Acrescente uma ligação para outra página ou para uma fonte."));

  // a leitura
  const frases = frasesDe(texto);
  if (frases.length > 0) {
    const compridas = frases.filter((f) => palavrasDe(f).length > 25).length;
    const parte = compridas / frases.length;
    v.push(parte <= 0.25 ? verificacao("frases", "bom", "As frases são curtas e fáceis de ler.") : parte <= 0.4 ? verificacao("frases", "melhorar", "Há frases compridas. Parta algumas em duas.") : verificacao("frases", "fraco", "Muitas frases são compridas. Parta-as para se ler melhor."));
  }
  const paragrafos = [...e.html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => palavrasDe(textoDoHtml(m[1])).length).filter((n) => n > 0);
  if (paragrafos.length > 0) {
    const longos = paragrafos.filter((n) => n > 120).length;
    v.push(longos === 0 ? verificacao("paragrafos", "bom", "Os parágrafos têm um bom tamanho.") : verificacao("paragrafos", "melhorar", `${longos} ${longos === 1 ? "parágrafo é comprido" : "parágrafos são compridos"}. Divida-${longos === 1 ? "o" : "os"} em partes mais pequenas.`));
  }

  // a visibilidade
  if (!e.indexar) v.push(verificacao("indexar", "melhorar", "O artigo está escondido dos motores de pesquisa."));

  const soma = v.reduce((s, x) => s + (x.estado === "bom" ? 1 : x.estado === "melhorar" ? 0.5 : 0), 0);
  const pontos = Math.round((soma / v.length) * 100);
  return { pontos, nivel: pontos >= 80 ? "bom" : pontos >= 50 ? "melhorar" : "fraco", verificacoes: v };
}

export const ROTULO_DO_NIVEL: Record<NivelDoSeo, string> = { bom: "Bom", melhorar: "A melhorar", fraco: "Fraco" };

// ---------- sugestões ----------

const PARADAS = new Set(
  "a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sobre entre até ao aos à às e ou mas que se como quando onde mais menos muito muita muitos muitas também já não sim é são foi ser está estão tem têm há isso isto esse essa este esta aquele aquela seu sua seus suas meu minha nosso nossa você vocês ele ela eles elas nós depois antes ainda só pelo pela pelos pelas num numa cada qual quais tudo todo toda todos todas outro outra outros outras mesmo mesma pode podem deve devem fazer faz fazem vai vão ter tinha pois porque então assim aqui ali lá".split(/\s+/),
);

/** Palavras do texto, em minúsculas e com os acentos, sem as palavras de ligação. */
function palavrasUteis(texto: string): string[] {
  return (texto.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((p) => p.length >= 3 && !PARADAS.has(p) && !/^\d+$/.test(p));
}

/** Os temas que se propõem para o artigo: primeiro expressões de 2 ou 3 palavras tiradas do próprio título (por isso o tema fica mesmo no título) e depois as palavras que mais contam (as do título pesam mais). */
export function sugerirTemas(titulo: string, texto: string, maximo = 5): string[] {
  const todas = titulo.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const util = (p: string) => p.length >= 2 && !PARADAS.has(p) && !/^\d+$/.test(p);
  const frases: { frase: string; pontos: number }[] = [];
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= todas.length; i++) {
      const janela = todas.slice(i, i + n);
      if (!util(janela[0]) || !util(janela[n - 1])) continue;
      const frase = janela.join(" ");
      if (!frases.some((f) => f.frase === frase)) frases.push({ frase, pontos: contarTema(texto, frase) * 2 + (n === 3 ? 0.4 : 0.5) - i * 0.01 });
    }
  }
  const doTitulo = palavrasUteis(titulo);
  const pontos = new Map<string, number>();
  for (const p of doTitulo) pontos.set(p, (pontos.get(p) ?? 0) + 3);
  for (const p of palavrasUteis(texto)) pontos.set(p, (pontos.get(p) ?? 0) + 1);
  const palavras = [...pontos.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([p]) => p);
  const saida = frases.sort((a, b) => b.pontos - a.pontos).slice(0, 2).map((f) => f.frase);
  for (const p of palavras) if (!saida.includes(p)) saida.push(p);
  return saida.slice(0, maximo);
}

/** A descrição que se faz sozinha: o início do texto, cortado numa palavra inteira, até 155 letras. */
export function descricaoAutomatica(texto: string): string {
  const t = texto.replace(/\s+/g, " ").trim();
  if (t.length <= 155) return t;
  const corte = t.slice(0, 154);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(" "), 77)).trimEnd()}…`;
}
