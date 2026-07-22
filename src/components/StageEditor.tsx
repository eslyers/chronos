"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─────────────────────────────────────────────────────────────
// StageEditor — editor inline de etapas do projeto
// Permite: adicionar, renomear, mudar cor, reordenar (drag) e remover
// ─────────────────────────────────────────────────────────────

export interface StageDraft {
  /** id local (não é UUID do banco, é chave temporária pra drag) */
  localId: string;
  name: string;
  color: string;
  wip_limit?: number | null;
  is_done?: boolean;
}

const PRESET_COLORS = [
  "#94a3b8", // slate (Backlog)
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#a855f7", // purple
  "#10b981", // emerald (Concluído)
  "#ec4899", // pink
  "#ef4444", // red
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#84cc16", // lime
];

let __localCounter = 0;
function nextLocalId(): string {
  __localCounter += 1;
  return `local-${Date.now()}-${__localCounter}`;
}

function SortableStageRow({
  stage,
  onChange,
  onRemove,
  canRemove,
}: {
  stage: StageDraft;
  onChange: (next: StageDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.localId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-2 bg-card border border-border rounded-md p-2"
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1"
          aria-label="Reordenar"
          title="Arraste pra reordenar"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Color picker trigger (swatch que abre paleta) */}
        <button
          type="button"
          onClick={() => setPaletteOpen((v) => !v)}
          className="h-7 w-7 rounded-md border-2 border-border hover:scale-110 transition-transform"
          style={{ backgroundColor: stage.color }}
          title="Escolher cor da etapa"
          aria-label="Abrir paleta de cores"
          aria-expanded={paletteOpen}
        />

        {/* Name input */}
        <Input
          value={stage.name}
          onChange={(e) => onChange({ ...stage, name: e.target.value })}
          placeholder="Nome da etapa"
          className="flex-1"
          maxLength={50}
        />

        {/* Mark as done (optional) */}
        <button
          type="button"
          onClick={() => onChange({ ...stage, is_done: !stage.is_done })}
          className={`p-1.5 rounded-md transition-colors ${
            stage.is_done
              ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25"
              : "text-muted-foreground hover:bg-muted"
          }`}
          title={stage.is_done ? "Marcar como não concluída" : "Marcar como concluída"}
          aria-label="Concluída"
        >
          <Check className="h-4 w-4" />
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Remover etapa"
          aria-label="Remover etapa"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Paleta inline (abre/fecha) */}
      {paletteOpen && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/50 rounded-md">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange({ ...stage, color: c });
                setPaletteOpen(false);
              }}
              className={`h-6 w-6 rounded-md transition-all ${
                stage.color === c
                  ? "ring-2 ring-offset-2 ring-foreground scale-110"
                  : "hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
              title={c}
              aria-label={`Cor ${c}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface StageEditorProps {
  stages: StageDraft[];
  onChange: (next: StageDraft[]) => void;
}

export function StageEditor({ stages, onChange }: StageEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = stages.findIndex((s) => s.localId === active.id);
    const newIndex = stages.findIndex((s) => s.localId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(stages, oldIndex, newIndex).map((s, idx) => ({
      ...s,
      // não persistimos sort_order aqui — só na hora do submit
      _sortIdx: idx,
    }));
    onChange(reordered);
  }

  function addStage() {
    const lastColor = PRESET_COLORS[stages.length % PRESET_COLORS.length];
    onChange([
      ...stages,
      {
        localId: nextLocalId(),
        name: `Nova etapa ${stages.length + 1}`,
        color: lastColor,
        is_done: false,
      },
    ]);
  }

  function updateStage(localId: string, next: StageDraft) {
    onChange(stages.map((s) => (s.localId === localId ? next : s)));
  }

  function removeStage(localId: string) {
    onChange(stages.filter((s) => s.localId !== localId));
  }

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={stages.map((s) => s.localId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {stages.map((stage) => (
              <SortableStageRow
                key={stage.localId}
                stage={stage}
                onChange={(next) => updateStage(stage.localId, next)}
                onRemove={() => removeStage(stage.localId)}
                canRemove={stages.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addStage}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Adicionar etapa
      </Button>

      <p className="text-xs text-muted-foreground">
        💡 Arraste o <GripVertical className="inline h-3 w-3" /> pra reordenar. Você poderá editar/adicionar/remover etapas depois na página do projeto.
      </p>
    </div>
  );
}

/** Converte StageDraft → payload pronto pro data-provider */
export function stageDraftsToPayload(
  drafts: StageDraft[]
): Array<{ name: string; color: string; sort_order: number; wip_limit: number | null; is_done: boolean }> {
  return drafts.map((d, idx) => ({
    name: d.name.trim() || `Etapa ${idx + 1}`,
    color: d.color,
    sort_order: idx,
    wip_limit: d.wip_limit ?? null,
    is_done: d.is_done ?? false,
  }));
}

/** Helpers pra inicializar com presets */
export function defaultStagesAsDrafts(): StageDraft[] {
  return [
    { localId: nextLocalId(), name: "Backlog", color: "#94a3b8", is_done: false },
    { localId: nextLocalId(), name: "A Fazer", color: "#3b82f6", is_done: false },
    { localId: nextLocalId(), name: "Em Progresso", color: "#f59e0b", is_done: false },
    { localId: nextLocalId(), name: "Em Revisão", color: "#a855f7", is_done: false },
    { localId: nextLocalId(), name: "Concluído", color: "#10b981", is_done: true },
  ];
}

export function emptyStagesDraft(): StageDraft[] {
  return [
    { localId: nextLocalId(), name: "Etapa 1", color: "#3b82f6", is_done: false },
  ];
}