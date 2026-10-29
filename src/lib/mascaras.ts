// Máscaras de escrita: a pessoa escreve só números e o código põe os separadores. Funções puras, sem DOM.

/** Escreve só os números e a máscara põe os traços, o espaço e os dois pontos: «202610281430» → «2026-10-28 14:30». */
export function mascaraDataHora(escrito: string): string {
  const d = escrito.replace(/\D/g, "").slice(0, 12);
  const dia = [d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join("-");
  const hora = [d.slice(8, 10), d.slice(10, 12)].filter(Boolean).join(":");
  return hora ? `${dia} ${hora}` : dia;
}
