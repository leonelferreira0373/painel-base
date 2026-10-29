// Os comprovativos de demonstração: desenha, num canvas, uma imagem que parece o comprovativo de uma transferência (para o ecrã de comprovativos ter o que ver e validar na primeira visita). Só corre no navegador. As cores são as de um papel, não as do tema.

export interface DadosDoComprovativo {
  ficheiro: string;
  banco: string;
  valor: string;
  referencia: string;
  de: string;
  iban: string;
  data: string;
}

export function desenharComprovativo(d: DadosDoComprovativo): Promise<Blob | null> {
  const tela = document.createElement("canvas");
  tela.width = 640;
  tela.height = 380;
  const ctx = tela.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 640, 380);
  ctx.fillStyle = "#1c4fd8";
  ctx.fillRect(0, 0, 640, 64);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 24px sans-serif";
  ctx.fillText(d.banco, 28, 42);
  ctx.font = "500 14px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Comprovativo de transferência", 612, 40);
  ctx.textAlign = "left";
  ctx.fillStyle = "#111111";
  ctx.font = "700 34px sans-serif";
  ctx.fillText(d.valor, 28, 128);
  ctx.font = "500 15px sans-serif";
  ctx.fillStyle = "#555555";
  const linhas: [string, string][] = [["Ordenante", d.de], ["Referência", d.referencia], ["Conta de destino", d.iban], ["Data da operação", d.data], ["Estado", "Executada"]];
  linhas.forEach(([k, v], i) => {
    const y = 176 + i * 36;
    ctx.fillStyle = "#777777";
    ctx.fillText(k, 28, y);
    ctx.fillStyle = "#111111";
    ctx.fillText(v, 220, y);
    ctx.fillStyle = "#e5e5e5";
    ctx.fillRect(28, y + 12, 584, 1);
  });
  return new Promise((resolver) => tela.toBlob(resolver, "image/png"));
}
