// Página 404.
import { Empty } from "@cloudflare/kumo";
import Link from "next/link";

export default function NaoEncontrada() {
  return (
    <div className="mx-auto w-full max-w-[1220px] px-6 py-10">
      <Empty
        title="Página não encontrada"
        contents={
          <Link href="/" className="inline-flex h-9 items-center rounded-lg bg-kumo-brand px-3 text-sm font-medium text-white hover:bg-kumo-brand-hover">
            Início
          </Link>
        }
      />
    </div>
  );
}
