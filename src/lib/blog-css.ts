// O aspeto do texto de um artigo, numa só folha de estilo: serve o editor (a classe «.blog-corpo») e o ficheiro HTML exportado (que traz o mesmo <style> e põe o artigo dentro de «<article class="blog-corpo">»). Tipografia, letra capitular (com linhas e cor), texto de destaque e legenda, colunas com filete, tipo de letra e o texto ao lado de uma imagem.

export const SERIFA = 'Georgia, Cambria, "Times New Roman", serif';

/** Os quadros da apresentação automática: cada imagem aparece durante a sua vez (1/n do ciclo) e some. */
const QUADROS_DA_APRESENTACAO = Array.from({ length: 9 }, (_, i) => {
  const n = i + 2;
  const parte = 100 / n;
  return `@keyframes bl-slide-${n} { 0% { opacity: 0; } ${(parte * 0.12).toFixed(2)}% { opacity: 1; } ${(parte * 0.88).toFixed(2)}% { opacity: 1; } ${parte.toFixed(2)}% { opacity: 0; } 100% { opacity: 0; } }`;
}).join("\n");

export const CSS_DO_ARTIGO = `
.blog-corpo { min-height: 55dvh; outline: none; font-size: 1rem; line-height: 1.75; overflow-wrap: anywhere; }
.blog-corpo > * + * { margin-top: 0.9em; }
.blog-corpo h2 { font-size: 1.75rem; line-height: 1.25; font-weight: 700; margin-top: 1.4em; }
.blog-corpo h3 { font-size: 1.4rem; line-height: 1.3; font-weight: 650; margin-top: 1.2em; }
.blog-corpo h4 { font-size: 1.15rem; line-height: 1.4; font-weight: 600; margin-top: 1.1em; }
.blog-corpo ul { list-style: disc; padding-left: 1.5rem; }
.blog-corpo ol { list-style: decimal; padding-left: 1.5rem; }
.blog-corpo li > p { margin: 0; }
.blog-corpo li + li { margin-top: 0.25em; }
.blog-corpo blockquote { border-left: 3px solid currentColor; padding-left: 1rem; opacity: 0.8; }
.blog-corpo code { font-family: ui-monospace, monospace; font-size: 0.9em; background: rgb(0 0 0 / 0.08); border-radius: 4px; padding: 0.1em 0.35em; }
.blog-corpo pre { font-family: ui-monospace, monospace; font-size: 0.875rem; background: rgb(0 0 0 / 0.08); border-radius: 8px; padding: 0.75rem 1rem; overflow: auto; }
.blog-corpo pre code { background: none; padding: 0; }
:root[data-mode="dark"] .blog-corpo code, :root[data-mode="dark"] .blog-corpo pre { background: rgb(255 255 255 / 0.1); }
.blog-corpo hr { border: 0; border-top: 1px solid rgb(127 127 127 / 0.4); margin: 1.6em 0; }
.blog-corpo a { color: inherit; text-decoration: underline; text-underline-offset: 3px; cursor: text; }
.blog-corpo mark { border-radius: 3px; padding: 0 0.1em; color: inherit; }
.blog-corpo p.capitular::first-letter { float: left; font-size: 3.6em; line-height: 0.82; font-weight: 700; padding: 0.06em 0.1em 0 0; color: var(--cap-cor, inherit); }
.blog-corpo p.capitular-2::first-letter { font-size: 2.6em; }
.blog-corpo p.capitular-4::first-letter { font-size: 4.8em; }
.blog-corpo p.destaque { font-family: ${SERIFA}; font-size: 1.55rem; line-height: 1.4; letter-spacing: -0.01em; }
.blog-corpo p.legenda { font-size: 0.8rem; line-height: 1.45; opacity: 0.7; }
.blog-corpo div[data-colunas] { column-gap: 2rem; column-rule: 1px solid rgb(127 127 127 / 0.35); }
.blog-corpo div[data-colunas="2"] { column-count: 2; }
.blog-corpo div[data-colunas="3"] { column-count: 3; }
.blog-corpo div[data-colunas] > * + * { margin-top: 0.9em; }
@media (max-width: 640px) { .blog-corpo div[data-colunas] { column-count: 1; } }
.blog-corpo .tableWrapper { margin: 1.4em 0; overflow-x: auto; }
.blog-corpo table { --t-linha: rgb(127 127 127 / 0.32); --t-fundo: rgb(127 127 127 / 0.1); --t-forte: #171717; --t-sobre-forte: #fff; border-collapse: separate; border-spacing: 0; width: 100%; table-layout: fixed; margin: 1.4em 0; border: var(--t-larg, 1px) var(--t-traco, solid) var(--t-linha); border-radius: 8px; font-size: 0.95em; line-height: 1.5; }
.blog-corpo .tableWrapper > table { margin: 0; }
:root[data-mode="dark"] .blog-corpo table { --t-forte: #f5f5f5; --t-sobre-forte: #171717; }
.blog-corpo th, .blog-corpo td { padding: 0.7rem 0.95rem; vertical-align: top; position: relative; min-width: 1em; box-sizing: border-box; text-align: left; border-right: var(--t-larg, 1px) var(--t-traco, solid) var(--t-linha); border-bottom: var(--t-larg, 1px) var(--t-traco, solid) var(--t-linha); }
.blog-corpo tr > :last-child { border-right: 0; }
.blog-corpo tr:last-child > * { border-bottom: 0; }
.blog-corpo tr:first-child > :first-child { border-top-left-radius: 7px; }
.blog-corpo tr:first-child > :last-child { border-top-right-radius: 7px; }
.blog-corpo tr:last-child > :first-child { border-bottom-left-radius: 7px; }
.blog-corpo tr:last-child > :last-child { border-bottom-right-radius: 7px; }
.blog-corpo th { background: var(--t-cab-fundo, var(--t-fundo)); color: var(--t-cab-cor, inherit); font-weight: 650; }
.blog-corpo td > p, .blog-corpo th > p { margin: 0; }
.blog-corpo th[data-fundo], .blog-corpo td[data-fundo] { color: #171717; }
.blog-corpo table[data-estilo="linhas"] { border: 0; border-radius: 0; }
.blog-corpo table[data-estilo="linhas"] :is(th, td) { border-right: 0; }
.blog-corpo table[data-estilo="linhas"] th { background: var(--t-cab-fundo, none); border-bottom: 2px solid var(--t-forte); }
.blog-corpo table[data-estilo="listrada"] :is(th, td) { border-right: 0; }
.blog-corpo table[data-estilo="listrada"] th { background: var(--t-cab-fundo, rgb(127 127 127 / 0.2)); }
.blog-corpo table[data-estilo="listrada"] tr:nth-child(even) > td { background: rgb(127 127 127 / 0.08); }
.blog-corpo table[data-estilo="destaque"] th { background: var(--t-cab-fundo, var(--t-forte)); color: var(--t-cab-cor, var(--t-sobre-forte)); border-right-color: color-mix(in srgb, var(--t-sobre-forte) 22%, transparent); border-bottom-color: transparent; }
.blog-corpo table[data-estilo="limpa"] { border: 0; border-radius: 0; }
.blog-corpo table[data-estilo="limpa"] :is(th, td) { border: 0; padding-inline: 0.6rem; }
.blog-corpo table[data-estilo="limpa"] th { background: none; font-size: 0.78em; letter-spacing: 0.07em; text-transform: uppercase; opacity: 0.65; }
.blog-corpo sup { font-size: 0.75em; line-height: 0; vertical-align: super; }
.blog-corpo sub { font-size: 0.75em; line-height: 0; vertical-align: sub; }
.blog-corpo div[data-caixa] { --c-fundo: #eff6ff; --c-borda: #93c5fd; padding: 0.9rem 1.1rem; border-radius: 8px; border-left: 4px solid var(--c-borda); background: var(--c-fundo); color: #171717; }
.blog-corpo div[data-caixa] > * + * { margin-top: 0.6em; }
.blog-corpo div[data-caixa="aviso"] { --c-fundo: #fffbeb; --c-borda: #fcd34d; }
.blog-corpo div[data-caixa="sucesso"] { --c-fundo: #f0fdf4; --c-borda: #86efac; }
.blog-corpo div[data-caixa="perigo"] { --c-fundo: #fef2f2; --c-borda: #fca5a5; }
.blog-corpo div[data-caixa="nota"] { --c-fundo: #f5f5f5; --c-borda: #d4d4d4; }
.blog-corpo div[data-quebra-de-pagina] { position: relative; height: 0; margin: 2.2em 0; border-top: 2px dashed rgb(127 127 127 / 0.45); break-after: page; page-break-after: always; }
.blog-corpo div[data-quebra-de-pagina]::after { content: "Quebra de página"; position: absolute; left: 50%; top: 0; transform: translate(-50%, -50%); padding: 0 0.7em; background: var(--color-kumo-base, #fff); color: rgb(127 127 127); font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
@media print { .blog-corpo div[data-quebra-de-pagina] { border-top: 0; margin: 0; } .blog-corpo div[data-quebra-de-pagina]::after { display: none; } }
.blog-corpo .localizar-achado { background: rgb(253 224 71 / 0.55); border-radius: 2px; }
.blog-corpo .localizar-atual { background: rgb(251 146 60 / 0.85); box-shadow: 0 0 0 2px rgb(251 146 60); }
.blog-corpo .selectedCell::after { content: ""; position: absolute; inset: 0; background: rgb(37 99 235 / 0.15); pointer-events: none; }
.blog-corpo .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: rgb(37 99 235 / 0.5); pointer-events: none; }
.blog-corpo.resize-cursor { cursor: col-resize; }
.blog-corpo ul[data-type="taskList"] { list-style: none; padding-left: 0.25rem; }
.blog-corpo ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.6rem; }
.blog-corpo ul[data-type="taskList"] li > label { margin-top: 0.35em; user-select: none; }
.blog-corpo ul[data-type="taskList"] li > div { flex: 1; }
.blog-corpo ul[data-type="taskList"] li[data-checked="true"] > div { opacity: 0.55; text-decoration: line-through; }
.blog-corpo .marca { position: absolute; z-index: 2; transform: translate(-50%, -50%); outline: none; }
.blog-corpo .marca-ponto { display: block; width: 18px; height: 18px; border-radius: 5px; background: #fff; box-shadow: 0 0 0 3px rgb(255 255 255 / 0.4), 0 2px 10px rgb(0 0 0 / 0.4); animation: marca-pulso 3.4s ease-out infinite; transition: transform 0.2s, background 0.2s; }
.blog-corpo .marca:hover .marca-ponto, .blog-corpo .marca:focus .marca-ponto, .blog-corpo .marca[data-ativa] .marca-ponto { transform: scale(1.3); animation: none; background: #171717; box-shadow: 0 0 0 4px rgb(255 255 255 / 0.9), 0 4px 14px rgb(0 0 0 / 0.45); }
@keyframes marca-pulso { 0% { box-shadow: 0 0 0 0 rgb(255 255 255 / 0.7), 0 2px 10px rgb(0 0 0 / 0.4); } 70%, 100% { box-shadow: 0 0 0 16px rgb(255 255 255 / 0), 0 2px 10px rgb(0 0 0 / 0.4); } }
.blog-corpo .marca-cartao { position: absolute; left: 50%; bottom: calc(100% + 14px); width: max-content; min-width: 150px; max-width: min(260px, 70vw); padding: 0.65rem 0.8rem; border-radius: 12px; background: rgb(255 255 255 / 0.82); color: #171717; -webkit-backdrop-filter: blur(14px) saturate(1.5); backdrop-filter: blur(14px) saturate(1.5); box-shadow: 0 10px 30px rgb(0 0 0 / 0.25), inset 0 0 0 1px rgb(255 255 255 / 0.6); font-size: 0.85rem; line-height: 1.4; text-align: left; font-weight: 400; opacity: 0; visibility: hidden; transform: translate(-50%, 6px); transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s; pointer-events: none; }
.blog-corpo .marca:hover .marca-cartao, .blog-corpo .marca:focus .marca-cartao, .blog-corpo .marca:focus-within .marca-cartao, .blog-corpo .marca[data-ativa] .marca-cartao { opacity: 1; visibility: visible; transform: translate(-50%, 0); pointer-events: auto; }
.blog-corpo .marca-baixo .marca-cartao { bottom: auto; top: calc(100% + 14px); transform: translate(-50%, -6px); }
.blog-corpo .marca-baixo:hover .marca-cartao, .blog-corpo .marca-baixo:focus .marca-cartao, .blog-corpo .marca-baixo:focus-within .marca-cartao, .blog-corpo .marca-baixo[data-ativa] .marca-cartao { transform: translate(-50%, 0); }
.blog-corpo .marca-esquerda .marca-cartao { left: -6px; transform: translate(0, 6px); }
.blog-corpo .marca-direita .marca-cartao { left: auto; right: -6px; transform: translate(0, 6px); }
.blog-corpo .marca-esquerda.marca-baixo .marca-cartao, .blog-corpo .marca-direita.marca-baixo .marca-cartao { transform: translate(0, -6px); }
.blog-corpo .marca-esquerda:hover .marca-cartao, .blog-corpo .marca-esquerda:focus .marca-cartao, .blog-corpo .marca-esquerda:focus-within .marca-cartao, .blog-corpo .marca-esquerda[data-ativa] .marca-cartao, .blog-corpo .marca-direita:hover .marca-cartao, .blog-corpo .marca-direita:focus .marca-cartao, .blog-corpo .marca-direita:focus-within .marca-cartao, .blog-corpo .marca-direita[data-ativa] .marca-cartao { transform: translate(0, 0); }
.blog-corpo .marca-cartao b { display: block; font-weight: 650; margin-bottom: 0.25rem; }
.blog-corpo .marca-cartao dl { display: grid; grid-template-columns: auto 1fr; gap: 0.15rem 0.85rem; margin: 0; }
.blog-corpo .marca-cartao dt { opacity: 0.6; }
.blog-corpo .marca-cartao dd { margin: 0; }
.blog-corpo .marca-cartao p { margin: 0.15rem 0 0; }
.blog-corpo .marca-cartao a { color: inherit; text-decoration: underline; }
:root[data-mode="dark"] .blog-corpo .marca-cartao { background: rgb(24 24 24 / 0.82); color: #fafafa; box-shadow: 0 10px 30px rgb(0 0 0 / 0.5), inset 0 0 0 1px rgb(255 255 255 / 0.12); }
@media (prefers-reduced-motion: reduce) { .blog-corpo .marca-ponto { animation: none; } .blog-corpo .marca-cartao { transition: none; } }
.blog-corpo hr.linha-tracejada { border-top-style: dashed; }
.blog-corpo hr.linha-pontilhada { border-top-style: dotted; border-top-width: 2px; }
.blog-corpo hr.linha-dupla { border-top: 5px double rgb(127 127 127 / 0.5); }
.blog-corpo hr.linha-grossa { border-top-width: 4px; border-radius: 4px; }
.blog-corpo hr.linha-ornamento { border: 0; width: 64px; height: 10px; margin: 1.8em auto; color: inherit; opacity: 0.55; background: radial-gradient(circle, currentColor 3px, transparent 3.5px) 0 0 / 22px 10px repeat-x; }
@keyframes anim-aparecer { from { opacity: 0; } to { opacity: 1; } }
@keyframes anim-subir { from { opacity: 0; transform: translateY(0.7em); } to { opacity: 1; transform: none; } }
@keyframes anim-destacar { to { background-size: 100% 100%; } }
@keyframes anim-pulsar { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes anim-brilhar { to { background-position: -200% 0; } }
@keyframes anim-balancar { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
.blog-corpo [data-anim="aparecer"] { animation: anim-aparecer 1.2s ease both; }
.blog-corpo [data-anim="subir"] { display: inline-block; animation: anim-subir 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
.blog-corpo [data-anim="destacar"] { background: linear-gradient(transparent 55%, #fde68a 55%) no-repeat 0 0 / 0% 100%; animation: anim-destacar 1.1s 0.3s ease forwards; }
.blog-corpo [data-anim="pulsar"] { display: inline-block; animation: anim-pulsar 1.8s ease-in-out infinite; }
.blog-corpo [data-anim="brilhar"] { background: linear-gradient(90deg, currentColor 35%, #f59e0b 50%, currentColor 65%) 0 0 / 300% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: anim-brilhar 3.2s linear infinite; }
.blog-corpo [data-anim="balancar"] { display: inline-block; transform-origin: 50% 80%; animation: anim-balancar 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .blog-corpo [data-anim] { animation: none !important; background-size: 100% 100%; } .blog-corpo [style*="bl-slide"] { animation: none !important; } }
${QUADROS_DA_APRESENTACAO}
.blog-corpo p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; height: 0; pointer-events: none; opacity: 0.4; }
`;

/** Os tipos de letra que o editor oferece (o primeiro é o do painel). */
export const TIPOS_DE_LETRA: { id: string; rotulo: string; familia: string | null }[] = [
  { id: "padrao", rotulo: "Padrão", familia: null },
  { id: "serifa", rotulo: "Serifa", familia: SERIFA },
  { id: "mono", rotulo: "Máquina de escrever", familia: "ui-monospace, Menlo, Consolas, monospace" },
];
