"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import type { Task } from "@/lib/context/DataContext";
import { formatDateOnly, toDateOnly } from "@/lib/date-only";
import { BOARD_ACCESSIBILITY } from "@/components/kanban/dnd-a11y";
import { WorkdayColumn } from "./WorkdayColumn";

/** Visão Matriz do Fast Close: colunas por dia útil com drag-and-drop de prazo. */
export function FastCloseBoard({
  tasks,
  workdayOffsets,
  offsetDatesMap,
  tasksByOffset,
  lastDayOfMonth,
  useD0,
  getWorkspaceId,
  updateTask,
  onAddTask,
  onOpenEditTask,
}: {
  tasks: Task[];
  workdayOffsets: number[];
  offsetDatesMap: Map<number, Date>;
  tasksByOffset: Map<number, Task[]>;
  lastDayOfMonth: Date;
  useD0: boolean;
  getWorkspaceId: (projectId: string) => string | undefined;
  updateTask: (id: string, patch: Partial<Task>) => Promise<unknown>;
  onAddTask: (date: Date) => void;
  onOpenEditTask: (task: Task) => void;
}) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const taskId = String(active.id);
    const overId = String(over.id);

    if (overId.startsWith("offset-")) {
      const targetOffset = parseInt(overId.replace("offset-", ""), 10);
      const newTargetDate = offsetDatesMap.get(targetOffset);
      const task = tasks.find((t) => t.id === taskId);
      if (newTargetDate && task) {
        const dateOnly = formatDateOnly(newTargetDate);
        // Soltar na mesma coluna/data não grava nada
        if (toDateOnly(task.due_date) === dateOnly) return;
        try {
          await updateTask(taskId, { due_date: dateOnly });
        } catch {
          // Toast já exibido pelo DataContext; o card permanece na coluna original
        }
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
      accessibility={BOARD_ACCESSIBILITY}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
        {workdayOffsets.map((offset) => {
          const columnDate = offsetDatesMap.get(offset) || lastDayOfMonth;
          const columnTasks = tasksByOffset.get(offset) || [];

          return (
            <WorkdayColumn
              key={offset}
              offset={offset}
              columnDate={columnDate}
              useD0={useD0}
              tasks={columnTasks}
              getWorkspaceId={getWorkspaceId}
              onAddTask={() => onAddTask(columnDate)}
              onOpenEditTask={onOpenEditTask}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72 bg-card border-2 border-blue-500 rounded-xl p-3 shadow-2xl opacity-90">
            <h4 className="text-xs font-bold text-foreground">{activeTask.title}</h4>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
