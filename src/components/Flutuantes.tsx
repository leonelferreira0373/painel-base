// Os cartões flutuantes do painel (popups, menus e submenus): um só sítio para o espaço à volta, a distância ao gatilho e a margem ao bordo do ecrã. A sombra, o anel e os cantos vêm de uma só regra em globals.css (--elevacao-popup), por isso todos ficam iguais ao seletor de contas. Nunca use Popover.Positioner ou DropdownMenu.Content à mão.
"use client";

import { DropdownMenu, Popover } from "@cloudflare/kumo";
import type { ComponentProps, ReactNode } from "react";

/** Quanto um cartão flutuante se afasta do bordo do ecrã. */
export const MARGEM_AO_BORDO = 12;
/** Quanto um submenu se afasta do item de onde sai: 12 px, dos quais 6 são o enchimento do menu, por isso entre os dois cartões ficam 6 px à vista (os da Cloudflare). */
export const DISTANCIA_DO_SUBMENU = 12;
/** Quanto um popup se afasta do gatilho. */
export const DISTANCIA_AO_GATILHO = 8;

/** A superfície de TODOS os cartões flutuantes (popups, menus, submenus): o mesmo fundo e os mesmos cantos. A sombra e o anel vêm da regra única de globals.css. Um cartão novo usa esta constante (ou um destes três componentes), nunca as suas próprias classes. */
export const SUPERFICIE_FLUTUANTE = "rounded-lg bg-kumo-base text-kumo-default";

/** Um cartão flutuante com conteúdo livre (o seletor de contas, o do período, o dos filtros): abre junto do gatilho e vira para o lado onde houver espaço. */
export function PopupCartao({ children, className = "", lado = "bottom", alinhar = "start", modalNoTelemovel = false, aoFechar }: { children: ReactNode; className?: string; lado?: "bottom" | "top" | "left" | "right"; alinhar?: "start" | "center" | "end"; /** No telemóvel abre como janela no meio do ecrã, com o fundo escurecido, em vez de colado ao botão. */ modalNoTelemovel?: boolean; /** Fecha o popup: com `modalNoTelemovel`, tocar no fundo escurecido (fora do cartão) chama-o, porque o fundo é o próprio contentor do popup e o Base UI não o conta como «fora». */ aoFechar?: () => void }) {
  return (
    <Popover.Portal>
      <Popover.Positioner collisionPadding={MARGEM_AO_BORDO} side={lado} align={alinhar} sideOffset={DISTANCIA_AO_GATILHO} data-modal-telemovel={modalNoTelemovel ? "" : undefined} onClick={modalNoTelemovel && aoFechar ? (e) => e.target === e.currentTarget && aoFechar() : undefined}>
        {/* aberto com o rato ou o dedo, o foco não salta para o primeiro botão (ficava com o anel azul); com o teclado vai para lá */}
        <Popover.Popup initialFocus={(tipo) => tipo === "keyboard"} className={`${SUPERFICIE_FLUTUANTE} overflow-hidden p-0 ${className}`}>{children}</Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  );
}

/** Um menu de itens (DropdownMenu): o mesmo cartão, com a margem ao bordo do ecrã. */
export function MenuCartao(props: ComponentProps<typeof DropdownMenu.Content>) {
  return <DropdownMenu.Content collisionPadding={MARGEM_AO_BORDO} {...props} className={`${SUPERFICIE_FLUTUANTE} ${props.className ?? ""}`} />;
}

/** Os menus dos três pontinhos não levam linhas divisórias: as opções agrupam-se pela ordem e pelos ícones. Fica por compatibilidade e não desenha nada. */
export function SeparadorDeMenu() {
  return null;
}

/** A linha divisória do menu da conta (o único menu que a leva, como o da Cloudflare): de ponta a ponta do cartão (o do Kumo deixa 2 px de cada lado). */
export function SeparadorDoMenuDaConta() {
  return <DropdownMenu.Separator className="-mx-1.5" />;
}

/** Um submenu: afastado do menu como na Cloudflare (6 px à vista entre os dois cartões) e com o primeiro item alinhado ao que o abriu. */
export function SubMenuCartao(props: ComponentProps<typeof DropdownMenu.SubContent>) {
  return <DropdownMenu.SubContent sideOffset={DISTANCIA_DO_SUBMENU} collisionPadding={MARGEM_AO_BORDO} {...props} className={`${SUPERFICIE_FLUTUANTE} ${props.className ?? ""}`} />;
}
