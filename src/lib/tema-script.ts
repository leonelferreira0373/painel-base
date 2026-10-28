// Corre antes de a página pintar, para não piscar o tema errado ao abrir. Fica fora do módulo de cliente para o layout (servidor) o poder usar.
export const CHAVE_TEMA = "painel.tema";

export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem("${CHAVE_TEMA}");var e=t==="escuro"||(t==="sistema"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.dataset.mode=e?"dark":"light";r.style.colorScheme=e?"dark":"light"}catch(x){}})()`;
