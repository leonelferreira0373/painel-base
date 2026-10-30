// Gravar áudio no momento, com o microfone do aparelho: «Gravar» começa (com o tempo a contar), «Parar» acaba e o ficheiro vai para a biblioteca. O navegador só deixa usar o microfone numa ligação segura (https ou localhost): noutra, diz-se.
"use client";

import { Button } from "@cloudflare/kumo";
import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/estado";

const tempo = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function GravadorDeAudio({ aoGravar }: { aoGravar: (ficheiro: File) => void }) {
  const { avisar } = useApp();
  const [aGravar, setAGravar] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const gravador = useRef<MediaRecorder | null>(null);
  const relogio = useRef<number>(0);
  const pedacos = useRef<Blob[]>([]);

  useEffect(
    () => () => {
      window.clearInterval(relogio.current);
      if (gravador.current?.state === "recording") gravador.current.stop();
    },
    [],
  );

  const comecar = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return avisar("Este navegador só grava áudio numa ligação segura (https).");
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
      const g = new MediaRecorder(fluxo);
      pedacos.current = [];
      g.ondataavailable = (e) => e.data.size > 0 && pedacos.current.push(e.data);
      g.onstop = () => {
        fluxo.getTracks().forEach((t) => t.stop());
        const tipo = g.mimeType || "audio/webm";
        const agora = new Date();
        const nome = `gravacao-${agora.toISOString().slice(0, 10)}-${String(agora.getHours()).padStart(2, "0")}${String(agora.getMinutes()).padStart(2, "0")}${String(agora.getSeconds()).padStart(2, "0")}.${tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm"}`;
        if (pedacos.current.length > 0) aoGravar(new File(pedacos.current, nome, { type: tipo }));
      };
      g.start();
      gravador.current = g;
      setSegundos(0);
      setAGravar(true);
      relogio.current = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    } catch {
      avisar("Não foi possível usar o microfone: permita o acesso no navegador.");
    }
  };
  const parar = () => {
    window.clearInterval(relogio.current);
    setAGravar(false);
    gravador.current?.stop();
  };

  return aGravar ? (
    <Button variant="primary" size="sm" icon={<Square className="size-4 fill-current" />} onClick={parar}>
      {`Parar ${tempo(segundos)}`}
    </Button>
  ) : (
    <Button variant="secondary" size="sm" icon={<Mic className="size-4" />} onClick={() => void comecar()}>
      Gravar
    </Button>
  );
}
