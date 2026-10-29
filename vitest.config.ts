import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // O teste de leitura de Word demora cerca de 5 s numa máquina lenta: o limite de 5 s do Vitest fazia-o falhar à toa.
  test: { environment: "node", include: ["src/**/*.test.ts"], testTimeout: 30_000 },
});
