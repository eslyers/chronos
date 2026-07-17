// Página de TESTE isolada pra validar visualmente o Gantt em dark mode.
// Não precisa de auth. Use pra confirmar se as cores estão certas.

"use client";

import { useEffect, useState } from "react";
import { Gantt, ViewMode, type Task as GanttTask } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { GanttTaskListHeaderPT } from "@/components/GanttTaskListHeader";
import { GanttTaskListTablePT } from "@/components/GanttTaskListTablePT";
import { GanttTooltipPT } from "@/components/GanttTooltipPT";
import { X, Calendar, User, AlertTriangle } from "lucide-react";

// Forca DARK MODE nesta pagina de teste antes do primeiro render
if (typeof document !== "undefined") {
  document.documentElement.classList.remove("light");
  document.documentElement.classList.add("dark");
  document.documentElement.style.colorScheme = "dark";
}

const SAMPLE_TASKS: GanttTask[] = [
  {
    start: new Date(2026, 6, 13),
    end: new Date(2026, 6, 25),
    name: "Planejamento Estratégico",
    id: "p-1",
    type: "project",
    progress: 100,
    isDisabled: true,
    styles: { backgroundColor: "#475569", backgroundSelectedColor: "#94a3b8", progressColor: "#22c55e", progressSelectedColor: "#4ade80" },
  },
  {
    start: new Date(2026, 6, 13),
    end: new Date(2026, 6, 18),
    name: "Cronograma de BDG-27",
    id: "t-1",
    type: "task",
    progress: 60,
    project: "p-1",
    styles: { backgroundColor: "#60a5fa", backgroundSelectedColor: "#fbbf24", progressColor: "#ffffff", progressSelectedColor: "#ffffff" },
  },
  {
    start: new Date(2026, 6, 19),
    end: new Date(2026, 6, 26),
    name: "Lançamento de Produto X",
    id: "t-2",
    type: "task",
    progress: 30,
    project: "p-1",
    styles: { backgroundColor: "#fb923c", backgroundSelectedColor: "#f59e0b", progressColor: "#ffffff", progressSelectedColor: "#ffffff" },
  },
  {
    start: new Date(2026, 6, 14),
    end: new Date(2026, 6, 17),
    name: "Bug crítico do mobile",
    id: "t-3",
    type: "task",
    progress: 80,
    project: "p-1",
    styles: { backgroundColor: "#f87171", backgroundSelectedColor: "#ef4444", progressColor: "#ffffff", progressSelectedColor: "#ffffff" },
  },
  {
    start: new Date(2026, 6, 20),
    end: new Date(2026, 6, 23),
    name: "Pesquisa de UX",
    id: "t-4",
    type: "task",
    progress: 25,
    project: "p-1",
    styles: { backgroundColor: "#38bdf8", backgroundSelectedColor: "#0ea5e9", progressColor: "#ffffff", progressSelectedColor: "#ffffff" },
  },
];

export default function DemoGanttDark() {
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);

  // Forca o html class="dark" pra teste
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }, []);

  function formatDateBR(date: Date): string {
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}/${mm}/${yy}`;
  }

  const days =
    selectedTask
      ? Math.round(
          (selectedTask.end.getTime() - selectedTask.start.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          🧪 DEMO Gantt em Dark Mode
        </h1>
        <p className="text-muted-foreground mb-6">
          Esta página renderiza o Gantt em dark mode SEM precisar de login.
          Use pra validar visualmente as cores do calendário.
          <br />
          <span className="text-amber-600 dark:text-amber-400 font-semibold">
            ✨ NOVO: Clique em uma task (row ou barra) pra abrir o popup de edição!
          </span>
        </p>
        <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
          <div className="gantt-wrapper">
            <Gantt
              tasks={SAMPLE_TASKS}
              viewMode={ViewMode.Week}
              locale="pt-BR"
              listCellWidth="155px"
              columnWidth={60}
              TaskListHeader={GanttTaskListHeaderPT}
              TaskListTable={(props) => (
                <GanttTaskListTablePT
                  {...props}
                  onTaskClick={(t) => setSelectedTask(t)}
                />
              )}
              TooltipContent={GanttTooltipPT}
              onClick={(task) => {
                if (task.type === "task") setSelectedTask(task);
              }}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          ⚠️ Esta página força &lt;html class=&quot;dark&quot;&gt;. Para teste de light mode, edite o useEffect.
        </p>
      </div>

      {/* Demo Dialog (mock do TaskDialog real, sem DataContext) */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-6 text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Editar Tarefa
                </p>
                <h2 className="text-xl font-bold">{selectedTask.name}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  <strong className="text-foreground">Início:</strong>{" "}
                  {formatDateBR(selectedTask.start)}
                </span>
                <span className="mx-2">→</span>
                <span>
                  <strong className="text-foreground">Término:</strong>{" "}
                  {formatDateBR(selectedTask.end)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="w-4 h-4" />
                <span>
                  <strong className="text-foreground">Duração:</strong> {days} dia(s)
                </span>
                <span className="mx-2">•</span>
                <span>
                  <strong className="text-foreground">Progresso:</strong>{" "}
                  {selectedTask.progress}%
                </span>
              </div>

              <div className="pt-2 mt-2 border-t border-border">
                <p className="text-xs text-muted-foreground italic">
                  💡 Esta é a demo. Em produção (/{`app/timeline`}), este popup
                  é o <code className="px-1 py-0.5 rounded bg-accent">TaskDialog</code>{" "}
                  completo com edição de título, descrição, prioridade, status,
                  assignee, datas e progresso.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-accent transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  alert(
                    "🚀 Em produção, este botão salvaria as edições da task no Supabase!"
                  );
                  setSelectedTask(null);
                }}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
