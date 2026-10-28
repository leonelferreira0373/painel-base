// robots.txt estático.
import type { MetadataRoute } from "next";
import { PROJETO } from "@/dados/projeto";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: `${PROJETO.urlSite}/sitemap.xml` };
}
