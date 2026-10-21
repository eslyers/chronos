// ─────────────────────────────────────────────────────────────
// CHRONOS — Acessibilidade do drag-and-drop (@dnd-kit) em pt-BR
// Os itens arrastáveis e as áreas de soltura informam um `label` legível em
// `data`, usado nos anúncios do leitor de tela.
// ─────────────────────────────────────────────────────────────
import type {
  Announcements,
  DraggableSyntheticListeners,
  ScreenReaderInstructions,
  UniqueIdentifier,
} from "@dnd-kit/core";

type Labeled = { id: UniqueIdentifier; data: { current?: Record<string, unknown> | null } };

function labelOf(item: Labeled | null | undefined): string {
  const label = item?.data.current?.label;
  return typeof label === "string" && label ? label : String(item?.id ?? "");
}

export const BOARD_SCREEN_READER_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    "Para pegar uma tarefa, pressione Espaço ou Enter. Use as setas para movê-la entre as colunas. " +
    "Pressione Espaço ou Enter novamente para soltar, ou Esc para cancelar.",
};

export const BOARD_ANNOUNCEMENTS: Announcements = {
  onDragStart({ active }) {
    return `Tarefa "${labelOf(active)}" selecionada.`;
  },
  onDragOver({ active, over }) {
    return over
      ? `Tarefa "${labelOf(active)}" está sobre ${labelOf(over)}.`
      : `Tarefa "${labelOf(active)}" não está sobre uma área válida.`;
  },
  onDragEnd({ active, over }) {
    return over
      ? `Tarefa "${labelOf(active)}" solta em ${labelOf(over)}.`
      : `Tarefa "${labelOf(active)}" solta fora de uma área válida.`;
  },
  onDragCancel({ active }) {
    return `Movimento cancelado. A tarefa "${labelOf(active)}" voltou à posição original.`;
  },
};

export const BOARD_ACCESSIBILITY = {
  announcements: BOARD_ANNOUNCEMENTS,
  screenReaderInstructions: BOARD_SCREEN_READER_INSTRUCTIONS,
};

/**
 * Listeners só de ponteiro/toque: aplicados ao card inteiro para que o mouse
 * continue arrastando de qualquer ponto. O teclado (onKeyDown) fica apenas
 * no botão de arrastar, liberando Enter/Espaço no card para abrir a tarefa.
 */
export function pointerOnlyListeners(listeners: DraggableSyntheticListeners): DraggableSyntheticListeners {
  if (!listeners) return listeners;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { onKeyDown, ...rest } = listeners;
  return rest;
}
