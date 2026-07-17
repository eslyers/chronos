// Página de TESTE isolada pra validar visualmente o Gantt em dark mode.
// Não precisa de auth. Use pra confirmar se as cores estão certas.

"use client";

import { useEffect } from "react";
import { Gantt, ViewMode, type Task as GanttTask } from "gantt-task-react";
import "gantt-task-react/dist/index.css";

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
  // Forca o html class="dark" pra teste
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          🧪 DEMO Gantt em Dark Mode
        </h1>
        <p className="text-muted-foreground mb-6">
          Esta página renderiza o Gantt em dark mode SEM precisar de login.
          Use pra validar visualmente as cores do calendário.
        </p>
        <div className="rounded-xl border border-border bg-card p-4 shadow-lg">
          <div className="gantt-wrapper">
            <Gantt
              tasks={SAMPLE_TASKS}
              viewMode={ViewMode.Week}
              locale="pt-BR"
              listCellWidth=""
              columnWidth={60}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          ⚠️ Esta página força &lt;html class=&quot;dark&quot;&gt;. Para teste de light mode, edite o useEffect.
        </p>
      </div>
    </div>
  );
}
