// Cartões que o utilizador arrasta para os pôr pela ordem que quiser (como os cartões da Cloudflare). A ordem fica guardada na conta. Funciona com o rato, com o toque (uma pressão curta na alça) e com o teclado (alça, espaço e setas).
"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Tooltip } from "@cloudflare/kumo";
import type { ReactNode } from "react";
import { useConta } from "@/lib/conta";
import { Ic } from "./Icones";

export interface ItemOrdenavel {
  id: string;
  /** Classes do lugar do item na grelha (por exemplo, ocupar duas colunas). */
  className?: string;
  /** O cartão; `false` (um cartão ocultado) tira o item da grelha. */
  conteudo: ReactNode | false;
}

function Item({ id, className = "", children }: { id: string; className?: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`group/arrasto relative min-w-0 ${isDragging ? "z-20 opacity-90 shadow-(--elevacao-popup)" : ""} ${className}`}>
      <Tooltip
        content="Arrastar para mudar de sítio. Com o teclado: espaço, setas e espaço."
        side="top"
        render={
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            type="button"
            aria-label="Arrastar para reordenar"
            className="absolute left-1/2 top-1 z-10 flex h-5 w-9 -translate-x-1/2 touch-none cursor-grab items-center justify-center rounded-md text-kumo-inactive opacity-0 transition-opacity hover:bg-kumo-tint hover:text-kumo-default focus-visible:opacity-100 group-hover/arrasto:opacity-100 active:cursor-grabbing max-sm:opacity-100"
          />
        }
      >
        <Ic nome="arrastar" tamanho={14} />
      </Tooltip>
      {children}
    </div>
  );
}

/** A grelha de cartões reordenáveis. `chave` identifica o ecrã: a ordem de cada ecrã fica guardada à parte, por conta. */
export function GrelhaOrdenavel({ chave, itens, className }: { chave: string; itens: ItemOrdenavel[]; className: string }) {
  const { conta, mudar } = useConta();
  const visiveis = itens.filter((i) => i.conteudo !== false);
  const ids = visiveis.map((i) => i.id);
  const guardada = conta.ordens?.[chave];
  const ordem = guardada ? [...guardada.filter((id) => ids.includes(id)), ...ids.filter((id) => !guardada.includes(id))] : ids;
  const porId = new Map(visiveis.map((i) => [i.id, i]));
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const aoSoltar = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const de = ordem.indexOf(String(active.id));
    const para = ordem.indexOf(String(over.id));
    if (de < 0 || para < 0) return;
    mudar({ ordens: { ...(conta.ordens ?? {}), [chave]: arrayMove(ordem, de, para) } });
  };
  const repor = () => {
    const resto = { ...(conta.ordens ?? {}) };
    delete resto[chave];
    mudar({ ordens: resto });
  };
  return (
    <div className="flex flex-col gap-2">
      {guardada && (
        <div className="flex justify-end">
          <Button variant="ghost" size="xs" icon={<Ic nome="repor" tamanho={12} />} onClick={repor}>
            Repor a ordem
          </Button>
        </div>
      )}
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
        <SortableContext items={ordem} strategy={rectSortingStrategy}>
          <div className={className}>
            {ordem.map((id) => (
              <Item key={id} id={id} className={porId.get(id)?.className}>
                {porId.get(id)?.conteudo}
              </Item>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
