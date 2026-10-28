// sitemap.xml estático, gerado a partir do menu (dados/estrutura.ts).
import type { MetadataRoute } from "next";
import { AREAS, caminho } from "@/dados/estrutura";
import { PROJETO } from "@/dados/projeto";

export const dynamic = "force-static";

const BASE = PROJETO.urlSite;

export default function sitemap(): MetadataRoute.Sitemap {
  return AREAS.flatMap((a) => a.modulos.map((m) => ({ url: `${BASE}${caminho(a.id, m.id)}`, changeFrequency: "weekly" as const, priority: a.id === "inicio" ? 1 : 0.6 })));
}
