// Fotografia de perfil: a imagem da pessoa ou, quando não há nenhuma, um círculo com o mesmo CSS do botão primário (gradiente, anel e brilho) e as iniciais em branco.
"use client";

const PARTICULAS = new Set(["de", "do", "da", "dos", "das", "e"]);

/** Duas letras: a primeira de cada uma das duas primeiras palavras do nome, sem «de», «do», «da»… */
export function iniciaisDe(nome: string): string {
  const palavras = nome.split(/\s+/).filter((p) => p && !PARTICULAS.has(p.toLowerCase()));
  const letras = palavras.slice(0, 2).map((p) => p[0]);
  return (letras.length ? letras.join("") : nome.slice(0, 2)).toUpperCase();
}

/** As mesmas variáveis que o botão primário do Kumo define para o seu fundo, anel e gradiente. */
const MARCA = "var(--color-kumo-brand)";
const CORES_BOTAO = {
  "--kumo-button-emphasis-ring": `color-mix(in oklch, ${MARCA}, black 10%)`,
  "--kumo-button-emphasis-bg": `color-mix(in oklch, ${MARCA}, white 30%)`,
  "--kumo-button-emphasis-gradient-start": `color-mix(in oklch, ${MARCA}, white 15%)`,
  "--kumo-button-emphasis-gradient-end": MARCA,
} as React.CSSProperties;

export function Avatar({ foto, nome, tamanho = 32, className = "" }: { foto?: string; nome: string; tamanho?: number; className?: string }) {
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt={nome} width={tamanho} height={tamanho} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: tamanho, height: tamanho }} />;
  }
  return (
    <span
      role="img"
      aria-label={nome}
      className={`relative inline-grid shrink-0 select-none place-items-center overflow-hidden rounded-full bg-(--kumo-button-emphasis-bg) font-medium text-white ring ring-(--kumo-button-emphasis-ring) ${className}`}
      style={{ width: tamanho, height: tamanho, fontSize: Math.round(tamanho * 0.38), ...CORES_BOTAO }}
    >
      <span aria-hidden="true" className="absolute inset-0 rounded-[inherit] bg-linear-to-b from-(--kumo-button-emphasis-gradient-start) to-(--kumo-button-emphasis-gradient-end) shadow-[inset_0_1px_0_0_var(--kumo-button-emphasis-bg)]" />
      <span className="relative">{iniciaisDe(nome)}</span>
    </span>
  );
}
