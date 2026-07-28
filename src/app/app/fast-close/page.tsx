"use client";

import React, { useState, useMemo } from "react";
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
  useDraggable,
  useDroppable,
  closestCenter,
} from "@dnd-kit/core";
import {
  CalendarClock,
  Flag,
  Plus,
  Copy,
  Sparkles,
  GripVertical,
  Loader2,
  Calendar as CalendarIcon,
  Filter,
  FolderKanban,
  FileSpreadsheet,
  Settings2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useData, type Task } from "@/lib/context/DataContext";
import { TaskAssignee } from "@/components/TaskAssignee";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskIndicators } from "@/components/TaskIndicators";
import { CopyClosingDialog } from "@/components/CopyClosingDialog";
import { ImportClosingSpreadsheetDialog } from "@/components/ImportClosingSpreadsheetDialog";
import { WorkdayConfigDialog } from "@/components/WorkdayConfigDialog";
import {
  getClosingD0Date,
  addBusinessDays,
  getWorkdayOffsets,
  formatWorkdayColumnHeader,
  getWorkdayOffsetFromDate,
} from "@/lib/business-days";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const PRIORITY_FLAG_COLORS = {
  low: "#64748b",
  medium: "#3b82f6",
  high: "#3b82f6",
  critical: "#ef4444",
};

function FastCloseTaskCard({
  task,
  onOpenEdit,
}: {
  task: Task;
  onOpenEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.4 : 1,
      }
    : undefined;

  const isDone = task.status === "done" || task.progress === 100;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative bg-card hover:border-blue-500/60 transition-all duration-200 shadow-xs cursor-grab active:cursor-grabbing border-border/80 ${
        isDone ? "bg-muted/30 border-emerald-500/30" : ""
      }`}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onOpenEdit();
        }
      }}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={`text-xs font-semibold leading-tight text-foreground group-hover:text-blue-500 transition-colors ${
              isDone ? "line-through text-muted-foreground" : ""
            }`}
          >
            {task.title}
          </h4>
          <div className="flex items-center gap-1 shrink-0">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            <Flag
              className="h-3 w-3"
              style={{
                color: PRIORITY_FLAG_COLORS[task.priority as keyof typeof PRIORITY_FLAG_COLORS] || "#3b82f6",
              }}
            />
          </div>
        </div>

        {task.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {task.progress > 0 && (
          <div className="space-y-1 pt-0.5">
            <Progress value={task.progress} className="h-1" />
            <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
              <span>Progresso</span>
              <span className="font-bold">{task.progress}%</span>
            </div>
          </div>
        )}

        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between gap-1.5">
          {(task.assignee_id || task.assignee_name) ? (
            <TaskAssignee
              assigneeId={task.assignee_id}
              assigneeName={task.assignee_name}
              workspaceId={undefined as unknown as string}
              variant="badge"
            />
          ) : (
            <div />
          )}
          <TaskIndicators taskId={task.id} />
        </div>
      </CardContent>
    </Card>
  );
}

function WorkdayColumn({
  offset,
  columnDate,
  useD0,
  tasks,
  onAddTask,
  onOpenEditTask,
}: {
  offset: number;
  columnDate: Date;
  useD0: boolean;
  tasks: Task[];
  onAddTask: () => void;
  onOpenEditTask: (t: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `offset-${offset}`,
    data: { type: "workday", offset, columnDate },
  });

  const headerInfo = formatWorkdayColumnHeader(offset, columnDate, useD0);
  const isD0 = useD0 && offset === 0;

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 sm:w-80 flex flex-col bg-muted/30 rounded-2xl border border-border/80 snap-center transition-all ${
        isOver ? "bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30" : ""
      } ${isD0 ? "border-pink-500/50 bg-pink-500/5" : ""}`}
    >
      {/* Column Header */}
      <div
        className={`p-3.5 border-b border-border/60 flex items-center justify-between rounded-t-2xl backdrop-blur-sm ${
          isD0 ? "bg-pink-500/10 border-b-pink-500/30" : "bg-card/70"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            className={`text-xs font-mono font-bold px-2 py-0.5 border-0 ${
              isD0
                ? "bg-pink-600 text-white shadow-md shadow-pink-500/20"
                : offset < 0
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
            }`}
          >
            {headerInfo.badge}
          </Badge>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-foreground">
              {headerInfo.formattedDate} — {headerInfo.weekdayName}
            </span>
            {isD0 && (
              <span className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider">
                Trava do ERP / Cut-off
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="text-xs font-mono font-bold bg-background">
            {tasks.length}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 hover:bg-muted"
            onClick={onAddTask}
            title={`Adicionar rotina em ${headerInfo.badge}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Column Content */}
      <div className="p-2.5 flex-1 space-y-2 min-h-[420px] max-h-[calc(100vh-280px)] overflow-y-auto">
        {tasks.map((task) => (
          <FastCloseTaskCard
            key={task.id}
            task={task}
            onOpenEdit={() => onOpenEditTask(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-32 border-2 border-dashed border-border/60 rounded-xl flex items-center justify-center text-[11px] text-muted-foreground font-medium p-4 text-center">
            Nenhuma rotina para {headerInfo.badge}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FastCloseCockpitPage() {
  const { tasks, projects, loading, createTask, updateTask, createProject } = useData();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [offsetRange, setOffsetRange] = useState("D-5_D+5");
  const [customOffsets, setCustomOffsets] = useState<number[] | undefined>(undefined);
  const [useD0, setUseD0] = useState(true);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedEditTask, setSelectedEditTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [defaultTaskDueDate, setDefaultTaskDueDate] = useState<string | undefined>(undefined);

  // Filtra tarefas do projeto selecionado (ou todas se "all")
  const scopedTasks = useMemo(() => {
    if (selectedProjectId === "all") return tasks;
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const selectedProjectObj = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Criar Projeto de Fechamento rápido
  const handleCreateFastCloseProject = async () => {
    const projName = `Fechamento Contábil ${selectedMonth}/${selectedYear}`;
    const newProj = await createProject({
      name: projName,
      description: "Projeto de Fechamento Contábil (Fast Close)",
      color: "#3b82f6",
    });
    if (newProj && newProj.id) {
      setSelectedProjectId(newProj.id);
    }
  };

  // Calcula a data D0 (último dia útil do mês selecionado)
  const d0Date = useMemo(() => {
    return getClosingD0Date(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Lista de offsets visíveis
  const workdayOffsets = useMemo(() => {
    return getWorkdayOffsets(offsetRange, customOffsets);
  }, [offsetRange, customOffsets]);

  // Mapeia cada offset para sua data real de calendário
  const offsetDatesMap = useMemo(() => {
    const map = new Map<number, Date>();
    workdayOffsets.forEach((offset) => {
      map.set(offset, addBusinessDays(d0Date, offset));
    });
    return map;
  }, [d0Date, workdayOffsets]);

  // Agrupa tarefas por offset de dia útil (usando tarefas filtradas por projeto!)
  const tasksByOffset = useMemo(() => {
    const map = new Map<number, Task[]>();
    workdayOffsets.forEach((offset) => map.set(offset, []));

    scopedTasks.forEach((t) => {
      if (!t.due_date && !t.start_date) return;
      const tDate = new Date((t.due_date || t.start_date) + "T00:00:00");
      
      if (tDate.getMonth() + 1 === selectedMonth && tDate.getFullYear() === selectedYear) {
        const offset = getWorkdayOffsetFromDate(tDate, d0Date);
        if (map.has(offset)) {
          map.get(offset)!.push(t);
        } else {
          const minOffset = workdayOffsets[0];
          const maxOffset = workdayOffsets[workdayOffsets.length - 1];
          if (offset < minOffset && map.has(minOffset)) {
            map.get(minOffset)!.push(t);
          } else if (offset > maxOffset && map.has(maxOffset)) {
            map.get(maxOffset)!.push(t);
          }
        }
      }
    });

    return map;
  }, [scopedTasks, selectedMonth, selectedYear, d0Date, workdayOffsets]);

  // Métricas
  const monthTasks = useMemo(() => {
    return Array.from(tasksByOffset.values()).flat();
  }, [tasksByOffset]);

  const completedTasksCount = useMemo(() => {
    return monthTasks.filter((t) => t.status === "done" || t.progress === 100).length;
  }, [monthTasks]);

  const closingProgressPercent = useMemo(() => {
    if (monthTasks.length === 0) return 0;
    return Math.round((completedTasksCount / monthTasks.length) * 100);
  }, [monthTasks, completedTasksCount]);

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
      if (newTargetDate) {
        const isoDate = newTargetDate.toISOString().split("T")[0];
        await updateTask(taskId, { due_date: isoDate });
      }
    }
  };

  // Gerar rotinas padrão do mês
  const handleGenerateDefaultClosingTasks = async () => {
    const targetProjId = selectedProjectId !== "all" ? selectedProjectId : undefined;

    const defaultRoutines = [
      { offset: -5, title: "[D-5] Notificação de encerramento de POs", priority: "medium" },
      { offset: -4, title: "[D-4] Corte de faturamento e remessas", priority: "high" },
      { offset: -3, title: "[D-3] Conciliação de Contas a Receber (AR)", priority: "high" },
      { offset: -2, title: "[D-2] Integração da Folha & Benefícios", priority: "critical" },
      { offset: -1, title: "[D-1] Provisões & Conciliação Bancária Prévia", priority: "high" },
      { offset: 0, title: "[D0] Trava oficial de lançamentos no ERP", priority: "critical" },
      { offset: 1, title: "[D+1] Depreciação e Accruals Operacionais", priority: "high" },
      { offset: 2, title: "[D+2] Conciliação Intercompany & FX Gain/Loss", priority: "medium" },
      { offset: 3, title: "[D+3] Apuração de Impostos Diretos/Indiretos", priority: "high" },
      { offset: 4, title: "[D+4] Emissão do Balancete Final (Trial Balance)", priority: "critical" },
      { offset: 5, title: "[D+5] Reporting Executivo ao CFO & Conselho", priority: "critical" },
    ];

    for (const r of defaultRoutines) {
      const targetDate = addBusinessDays(d0Date, r.offset);
      const isoDate = targetDate.toISOString().split("T")[0];
      await createTask({
        title: r.title,
        due_date: isoDate,
        priority: r.priority as Task["priority"],
        status: "todo",
        progress: 0,
        project_id: targetProjId,
      });
    }
  };

  // Cópia mês a mês
  const handleCopyTasksFromMonth = async (params: {
    sourceMonth: number;
    sourceYear: number;
    targetMonth: number;
    targetYear: number;
    selectedTaskIds: string[];
    resetStatus: boolean;
    keepAssignees: boolean;
  }) => {
    const sourceD0 = getClosingD0Date(params.sourceYear, params.sourceMonth);
    const targetD0 = getClosingD0Date(params.targetYear, params.targetMonth);

    const sourceTasksToCopy = scopedTasks.filter((t) => params.selectedTaskIds.includes(t.id));

    for (const t of sourceTasksToCopy) {
      const originalDate = new Date((t.due_date || t.start_date || d0Date.toISOString()) + "T00:00:00");
      const offset = getWorkdayOffsetFromDate(originalDate, sourceD0);
      const newTargetDate = addBusinessDays(targetD0, offset);
      const isoDate = newTargetDate.toISOString().split("T")[0];

      await createTask({
        title: t.title,
        description: t.description || undefined,
        due_date: isoDate,
        priority: t.priority,
        status: params.resetStatus ? "todo" : t.status,
        progress: params.resetStatus ? 0 : t.progress,
        assignee_id: params.keepAssignees ? t.assignee_id || undefined : undefined,
        assignee_name: params.keepAssignees ? t.assignee_name || undefined : undefined,
        project_id: t.project_id || (selectedProjectId !== "all" ? selectedProjectId : undefined),
      });
    }
  };

  // Importação de planilha
  const handleImportSpreadsheetSuccess = async (importedTasks: {
    title: string;
    description?: string;
    due_date?: string;
    priority: "low" | "medium" | "high" | "critical";
    project_id?: string;
  }[]) => {
    for (const t of importedTasks) {
      await createTask({
        title: t.title,
        description: t.description,
        due_date: t.due_date,
        priority: t.priority,
        status: "todo",
        progress: 0,
        project_id: t.project_id || (selectedProjectId !== "all" ? selectedProjectId : undefined),
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-xs font-semibold text-muted-foreground">Carregando Cockpit de Fechamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border border-border/80 p-5 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Cockpit de Fechamento Contábil
                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  Fast Close
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Régua diária por projeto corporativo com suporte a D0 e Ds customizados
              </p>
            </div>
          </div>
        </div>

        {/* Controles Principais */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Projeto */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border">
            <FolderKanban className="h-4 w-4 text-blue-500 ml-1 shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => {
                if (e.target.value === "new") {
                  handleCreateFastCloseProject();
                } else {
                  setSelectedProjectId(e.target.value);
                }
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-zinc-100 max-w-[180px] truncate"
            >
              <option value="all">📁 (Todos os Projetos)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
              <option value="new">➕ + Criar Projeto de Fechamento</option>
            </select>
          </div>

          {/* Seletor Mês/Ano */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border">
            <CalendarIcon className="h-4 w-4 text-muted-foreground ml-1 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-zinc-100"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={idx + 1}>{m}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-zinc-100"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Seletor de Intervalo de "Ds" */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1.5 rounded-xl border border-border">
            <Filter className="h-3.5 w-3.5 text-muted-foreground ml-1 shrink-0" />
            <select
              value={offsetRange}
              onChange={(e) => {
                setOffsetRange(e.target.value);
                setCustomOffsets(undefined);
              }}
              className="bg-transparent text-xs font-bold text-foreground focus:outline-none cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-zinc-100"
            >
              <option value="D-5_D+5">Alcance: D-5 a D+5 (Completo)</option>
              <option value="D-3_D+3">Alcance: D-3 a D+3 (Curto)</option>
              <option value="D-2_D+4">Alcance: D-2 a D+4 (Padrão)</option>
              <option value="D-10_D+10">Alcance: D-10 a D+10 (Expandido)</option>
            </select>
          </div>

          {/* Botão Configurar Régua */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfigDialogOpen(true)}
            className="text-xs font-bold gap-1.5 h-9 rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10"
            title="Configurar D0 e Dias D customizados"
          >
            <Settings2 className="h-3.5 w-3.5" />
            ⚙️ Configurar Régua
          </Button>

          {/* Botão Importar Planilha */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            className="text-xs font-bold gap-1.5 h-9 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Importar Planilha
          </Button>

          {/* Botão Copiar Fechamento */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCopyDialogOpen(true)}
            className="text-xs font-bold gap-1.5 h-9 rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500/10"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar Mês Anterior
          </Button>

          {/* Botão Gerar Rotinas Padrão */}
          {monthTasks.length === 0 && (
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateDefaultClosingTasks}
              className="text-xs font-bold gap-1.5 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              ⚡ Gerar Rotinas do Mês
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar & Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>Progresso ({selectedProjectObj?.name || "Todos os Projetos"})</span>
            <span className="text-blue-500 font-mono">{closingProgressPercent}%</span>
          </div>
          <Progress value={closingProgressPercent} className="h-2" />
          <p className="text-[11px] text-muted-foreground">
            {completedTasksCount} de {monthTasks.length} rotinas contábeis concluídas em {MONTH_NAMES[selectedMonth - 1]}
          </p>
        </Card>

        <Card className="bg-card border-border/80 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground block">
              {useD0 ? "Dia do Corte Oficial (D0 / WD0)" : "Dia Base de Referência"}
            </span>
            <span className="text-base font-bold text-pink-600 dark:text-pink-400">
              {formatWorkdayColumnHeader(0, d0Date, useD0).formattedDate} — {formatWorkdayColumnHeader(0, d0Date, useD0).weekdayName}
            </span>
          </div>
          <Badge className="bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30">
            {useD0 ? "Corte ERP" : "Base"}
          </Badge>
        </Card>

        <Card className="bg-card border-border/80 p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground block">Rotinas no Escopo Atual</span>
            <span className="text-base font-bold text-foreground">
              {monthTasks.length} rotinas ativas
            </span>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {workdayOffsets.length} colunas diárias
          </Badge>
        </Card>
      </div>

      {/* Kanban Grid por Dias Úteis */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
          {workdayOffsets.map((offset) => {
            const columnDate = offsetDatesMap.get(offset) || d0Date;
            const columnTasks = tasksByOffset.get(offset) || [];

            return (
              <WorkdayColumn
                key={offset}
                offset={offset}
                columnDate={columnDate}
                useD0={useD0}
                tasks={columnTasks}
                onAddTask={() => {
                  setDefaultTaskDueDate(columnDate.toISOString().split("T")[0]);
                  setSelectedEditTask(null);
                  setTaskDialogOpen(true);
                }}
                onOpenEditTask={(task) => {
                  setSelectedEditTask(task);
                  setTaskDialogOpen(true);
                }}
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

      {/* Modal de Criação / Edição de Tarefa */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedEditTask}
        projectId={selectedProjectId !== "all" ? selectedProjectId : undefined}
        defaultDueDate={defaultTaskDueDate}
      />

      {/* Modal de Cópia Mês a Mês */}
      <CopyClosingDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        currentMonth={selectedMonth}
        currentYear={selectedYear}
        tasks={scopedTasks}
        onCopyTasks={handleCopyTasksFromMonth}
      />

      {/* Modal de Importação de Planilha */}
      <ImportClosingSpreadsheetDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        projectId={selectedProjectId !== "all" ? selectedProjectId : undefined}
        projectName={selectedProjectObj?.name}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        onImportSuccess={handleImportSpreadsheetSuccess}
      />

      {/* Modal de Configuração de Dias Úteis & D0 */}
      <WorkdayConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        useD0={useD0}
        onToggleUseD0={setUseD0}
        workdayOffsets={workdayOffsets}
        onSaveOffsets={(newOffsets) => setCustomOffsets(newOffsets)}
      />
    </div>
  );
}
