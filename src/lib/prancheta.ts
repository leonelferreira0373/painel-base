// Escrever na área de transferência, em qualquer navegador e em qualquer endereço. A API moderna (`navigator.clipboard`) só existe em https e em localhost: numa página aberta por http na rede local (o servidor de testes no telemóvel, por exemplo) não está lá e todos os botões de copiar davam erro. Nesse caso usa-se o método clássico (selecionar e copiar), que funciona em todo o lado.

/** Copia pelo método clássico: um campo fora do ecrã com o texto selecionado e o evento de copiar a levar o texto (e a tabela, se há). Repõe a seleção e o foco de antes. */
function copiarPeloMetodoClassico(texto: string, html?: string): boolean {
  const ativo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const selecao = document.getSelection();
  const antes = selecao && selecao.rangeCount > 0 ? selecao.getRangeAt(0) : null;
  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "");
  campo.setAttribute("aria-hidden", "true");
  campo.style.cssText = "position:fixed;top:0;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;";
  const aoCopiar = (e: ClipboardEvent) => {
    e.clipboardData?.setData("text/plain", texto);
    if (html) e.clipboardData?.setData("text/html", html);
    e.preventDefault();
  };
  let ok = false;
  document.body.appendChild(campo);
  document.addEventListener("copy", aoCopiar, true);
  try {
    campo.focus({ preventScroll: true });
    campo.select();
    campo.setSelectionRange(0, texto.length);
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    document.removeEventListener("copy", aoCopiar, true);
    campo.remove();
    if (selecao) {
      selecao.removeAllRanges();
      if (antes) selecao.addRange(antes);
    }
    ativo?.focus({ preventScroll: true });
  }
  return ok;
}

/** Copia o texto (e, se vier, a tabela em HTML). `false` só se nenhum método deixou. */
export async function escreverNaPrancheta(texto: string, html?: string): Promise<boolean> {
  try {
    const pr = typeof navigator !== "undefined" ? navigator.clipboard : undefined;
    if (pr) {
      if (html && typeof ClipboardItem !== "undefined" && pr.write) {
        await pr.write([new ClipboardItem({ "text/plain": new Blob([texto], { type: "text/plain" }), "text/html": new Blob([html], { type: "text/html" }) })]);
        return true;
      }
      if (pr.writeText) {
        await pr.writeText(texto);
        return true;
      }
    }
  } catch {
    /* o navegador recusou a API moderna: tenta-se o método clássico */
  }
  return typeof document !== "undefined" ? copiarPeloMetodoClassico(texto, html) : false;
}
