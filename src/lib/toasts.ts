// Gestor de avisos (toasts) partilhado por toda a aplicação.
import { createKumoToastManager } from "@cloudflare/kumo";

/** Gestor de notificações do painel, usado também fora da árvore React. */
export const toasts = createKumoToastManager();
