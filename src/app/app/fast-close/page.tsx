"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Calendar as CalendarIcon,
  Filter,
  FolderKanban,
  FileSpreadsheet,
  Settings2,
  KanbanSquare,
  List,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useData, type Task } from "@/lib/context/DataContext";
import { TaskAssignee } from "@/components/TaskAssignee";
import { TaskDialog } from "@/components/TaskDialog";
import { CompleteTaskDialog } from "@/components/CompleteTaskDialog";
import { TaskIndicators } from "@/components/TaskIndicators";
import { CopyClosingDialog } from "@/components/CopyClosingDialog";
import { ImportClosingSpreadsheetDialog } from "@/components/ImportClosingSpreadsheetDialog";
import { WorkdayConfigDialog } from "@/components/WorkdayConfigDialog";
import { FastCloseSkeleton } from "@/components/skeletons/FastCloseSkeleton";
import { FastCloseListView } from "@/components/FastCloseListView";
import {
  getClosingD0Date,
  getCalculatedWorkdayDate,
  getWorkdayOffsets,
  formatWorkdayColumnHeader,
  getWorkdayOffsetFromDate,
} from "@/lib/business-days";
import { formatDateOnly, parseDateOnly, toDateOnly } from "@/lib/date-only";
import { PRIORITY_HEX } from "@/lib/priority";
import { isTaskDone } from "@/lib/task-status";
import { countRejected, mapSettled } from "@/lib/board-moves";
import { BOARD_ACCESSIBILITY, pointerOnlyListeners } from "@/components/kanban/dnd-a11y";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const CLOSING_KEYWORDS = [
  "fechamento", "fast close", "contábil", "contabil", "controladoria",
  "demonstrativo", "fp&a", "fpa", "financeiro", "orçamento", "orcamento", "dre", "balancete"
];

// Criações em lote (rotinas, cópia, importação): no máximo N requisições simultâneas
const BULK_CONCURRENCY = 6;

/** Cria em paralelo (limitado); se alguma falhar, lança um erro com o resumo. */
async function createAllOrThrow<T>(items: T[], create: (item: T) => Promise<unknown>) {
  const results = await mapSettled(items, BULK_CONCURRENCY, create);
  const failed = countRejected(results);
  if (failed > 0) {
    throw new Error(`${failed} de ${items.length} rotinas não puderam ser criadas.`);
  }
}

function FastCloseTaskCard({
  task,
  workspaceId,
  onOpenEdit,
}: {
  task: Task;
  workspaceId: string | undefined;
  onOpenEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", task, label: task.title },
  });

  const isDone = isTaskDone(task);

  // Sem transform no original: quem acompanha o ponteiro é o DragOverlay.
  // O card de origem só fica esmaecido enquanto é arrastado.
  return (
    <Card
      ref={setNodeRef}
      // Mouse/toque arrastam pelo card inteiro; o teclado usa só o botão de arrastar
      {...pointerOnlyListeners(listeners)}
      className={`group relative bg-card hover:border-blue-500/60 transition-all duration-200 shadow-xs cursor-grab active:cursor-grabbing border-border/80 ${
        isDone ? "bg-muted/30 border-emerald-500/30" : ""
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={`text-xs font-semibold leading-tight text-foreground group-hover:text-blue-500 transition-colors ${
              isDone ? "line-through text-muted-foreground" : ""
            }`}
          >
            {/* O botão se estende (after:inset-0) sobre o card: clique ou Enter abrem a rotina */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!isDragging) onOpenEdit();
              }}
              className="text-left cursor-grab focus-visible:outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-blue-500"
            >
              {task.title}
            </button>
          </h4>
          <div className="relative z-10 flex items-center gap-1 shrink-0">
            <button
              type="button"
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}
              aria-label="Arrastar tarefa"
              className="rounded p-0.5 -m-0.5 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            </button>
            <Flag
              className="h-3 w-3"
              aria-hidden="true"
              style={{
                color: PRIORITY_HEX[task.priority] ?? PRIORITY_HEX.medium,
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
              workspaceId={workspaceId}
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
  getWorkspaceId,
  onAddTask,
  onOpenEditTask,
}: {
  offset: number;
  columnDate: Date;
  useD0: boolean;
  tasks: Task[];
  getWorkspaceId: (projectId: string) => string | undefined;
  onAddTask: () => void;
  onOpenEditTask: (t: Task) => void;
}) {
  const headerInfo = formatWorkdayColumnHeader(offset, columnDate, useD0);

  const { setNodeRef, isOver } = useDroppable({
    id: `offset-${offset}`,
    data: {
      type: "workday",
      offset,
      columnDate,
      label: `a coluna ${headerInfo.badge} (${headerInfo.formattedDate})`,
    },
  });
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
            {headerInfo.holidayName && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate max-w-[170px]" title={headerInfo.holidayName}>
                🎉 {headerInfo.holidayName}
              </span>
            )}
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
            workspaceId={getWorkspaceId(task.project_id)}
            onOpenEdit={() => onOpenEditTask(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="h-32 border-2 border-dashed border-border/60 hover:border-border rounded-xl flex flex-col items-center justify-center text-[11px] text-muted-foreground font-medium p-3 text-center transition-colors">
            <span>Nenhuma rotina para {headerInfo.badge}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddTask}
              className="mt-1.5 text-[11px] text-blue-500 hover:text-blue-400 font-semibold h-7 px-2 hover:bg-blue-500/10 gap-1"
            >
              <Plus className="h-3 w-3" /> Adicionar rotina
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FastCloseCockpitPage() {
  const {
    tasks,
    projects,
    loading,
    createTask,
    updateTask,
    deleteTask,
    createProject,
    loadProjectDetails,
    loadAllProjectsDetails,
    isProjectLoaded,
  } = useData();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [offsetRange, setOffsetRange] = useState("D-5_D+5");
  const [customOffsets, setCustomOffsets] = useState<number[] | undefined>(undefined);
  const [useD0, setUseD0] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedEditTask, setSelectedEditTask] = useState<Task | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [defaultTaskDueDate, setDefaultTaskDueDate] = useState<string | undefined>(undefined);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Trava síncrona contra duplo clique (o state só atualiza no próximo render)
  const generatingRef = useRef(false);

  // Ano atual -1 … +2 (antes fixo em 2025–2027); inclui o ano selecionado se estiver fora
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years = [current - 1, current, current + 1, current + 2];
    if (!years.includes(selectedYear)) years.push(selectedYear);
    return years.sort((a, b) => a - b);
  }, [selectedYear]);

  // Fechar dropdown de ações ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Carregar preferência salva do D0/offsets do localStorage para o projeto selecionado
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `fastclose_config_${selectedProjectId}`;
    const globalKey = `fastclose_config_global`;
    
    const saved = localStorage.getItem(storageKey) || localStorage.getItem(globalKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.useD0 === "boolean") setUseD0(parsed.useD0);
        if (Array.isArray(parsed.customOffsets)) setCustomOffsets(parsed.customOffsets);
        if (typeof parsed.offsetRange === "string") setOffsetRange(parsed.offsetRange);
      } catch (err) {
        console.warn("Error parsing fastclose config:", err);
      }
    }
  }, [selectedProjectId]);

  // Função atômica para salvar a configuração inteira no localStorage
  const saveProjectConfig = (newUseD0: boolean, newCustomOffsets?: number[], newOffsetRange?: string) => {
    if (typeof window === "undefined") return;
    const payload = JSON.stringify({
      useD0: newUseD0,
      customOffsets: newCustomOffsets ?? customOffsets,
      offsetRange: newOffsetRange ?? offsetRange,
    });

    localStorage.setItem(`fastclose_config_${selectedProjectId}`, payload);
    localStorage.setItem(`fastclose_config_global`, payload);
  };

  // Carregar detalhes das tarefas sob demanda com suporte a cache
  useEffect(() => {
    async function ensureProjectData() {
      if (selectedProjectId === "all") {
        await loadAllProjectsDetails();
      } else if (!isProjectLoaded(selectedProjectId)) {
        await loadProjectDetails(selectedProjectId);
      }
    }
    ensureProjectData();
  }, [selectedProjectId, isProjectLoaded, loadProjectDetails, loadAllProjectsDetails]);

  // Filtrar apenas projetos do escopo de Fechamento / Controladoria
  const closingProjects = useMemo(() => {
    return projects.filter((p) => {
      const nameLower = p.name.toLowerCase();
      const descLower = (p.description || "").toLowerCase();
      return CLOSING_KEYWORDS.some((kw) => nameLower.includes(kw) || descLower.includes(kw));
    });
  }, [projects]);

  // Tarefas filtradas pelo projeto selecionado; "Todos" = só projetos de fechamento
  const scopedTasks = useMemo(() => {
    if (selectedProjectId === "all") {
      const closingIds = new Set(closingProjects.map((p) => p.id));
      return tasks.filter((t) => closingIds.has(t.project_id));
    }
    return tasks.filter((t) => t.project_id === selectedProjectId);
  }, [tasks, selectedProjectId, closingProjects]);

  const selectedProjectObj = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const getWorkspaceId = (projectId: string) => projects.find((p) => p.id === projectId)?.workspace_id;

  // Criar Projeto de Fechamento rápido
  const handleCreateFastCloseProject = async () => {
    const projName = `Fechamento Contábil ${selectedMonth}/${selectedYear}`;
    try {
      const newProj = await createProject({
        name: projName,
        description: "Projeto de Fechamento Contábil (Fast Close / Controladoria)",
        color: "#3b82f6",
      });
      if (newProj && newProj.id) {
        setSelectedProjectId(newProj.id);
      }
    } catch {
      // Toast já exibido pelo DataContext
    }
  };

  // Data do último dia útil do mês selecionado
  const lastDayOfMonth = useMemo(() => {
    return getClosingD0Date(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Lista de offsets visíveis (respeitando useD0!)
  const workdayOffsets = useMemo(() => {
    return getWorkdayOffsets(offsetRange, customOffsets, useD0);
  }, [offsetRange, customOffsets, useD0]);

  // Mapeia cada offset para sua data real de calendário (respeitando useD0!)
  const offsetDatesMap = useMemo(() => {
    const map = new Map<number, Date>();
    workdayOffsets.forEach((offset) => {
      map.set(offset, getCalculatedWorkdayDate(selectedYear, selectedMonth, offset, useD0));
    });
    return map;
  }, [selectedYear, selectedMonth, workdayOffsets, useD0]);

  // Agrupa tarefas por offset de dia útil
  const tasksByOffset = useMemo(() => {
    const map = new Map<number, Task[]>();
    workdayOffsets.forEach((offset) => map.set(offset, []));

    scopedTasks.forEach((t) => {
      const tDate = parseDateOnly(t.due_date || t.start_date);
      if (!tDate) return;

      if (tDate.getMonth() + 1 === selectedMonth && tDate.getFullYear() === selectedYear) {
        const offset = getWorkdayOffsetFromDate(tDate, selectedYear, selectedMonth, useD0);
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
  }, [scopedTasks, selectedMonth, selectedYear, useD0, workdayOffsets]);

  // Métricas
  const monthTasks = useMemo(() => {
    return Array.from(tasksByOffset.values()).flat();
  }, [tasksByOffset]);

  const completedTasksCount = useMemo(() => {
    return monthTasks.filter(isTaskDone).length;
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

  // Alternar conclusão rápida de tarefa
  const handleToggleTaskComplete = async (task: Task) => {
    try {
      if (isTaskDone(task)) {
        await updateTask(task.id, {
          status: "todo",
          progress: 0,
        });
      } else {
        const taskProject = projects.find((p) => p.id === task.project_id);
        if (taskProject?.track_time === false) {
          await updateTask(task.id, {
            status: "done",
            progress: 100,
          });
        } else {
          setCompletingTask(task);
        }
      }
    } catch {
      // Toast já exibido pelo DataContext
    }
  };

  // Excluir tarefa (confirmação via ConfirmDialog)
  const handleDeleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) setDeleteTarget(task);
  };

  // Rotinas padrão do mês
  const defaultRoutines: Array<{ offset: number; title: string; priority: Task["priority"] }> = useD0
      ? [
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
        ]
      : [
          { offset: -5, title: "[D-5] Notificação de encerramento de POs", priority: "medium" },
          { offset: -4, title: "[D-4] Corte de faturamento e remessas", priority: "high" },
          { offset: -3, title: "[D-3] Conciliação de Contas a Receber (AR)", priority: "high" },
          { offset: -2, title: "[D-2] Provisões & Conciliação Bancária Prévia", priority: "high" },
          { offset: -1, title: "[D-1] Trava oficial e encerramento do mês", priority: "critical" },
          { offset: 1, title: "[D+1] Depreciação e Accruals Operacionais", priority: "high" },
          { offset: 2, title: "[D+2] Conciliação Intercompany & FX Gain/Loss", priority: "medium" },
          { offset: 3, title: "[D+3] Apuração de Impostos Diretos/Indiretos", priority: "high" },
          { offset: 4, title: "[D+4] Emissão do Balancete Final (Trial Balance)", priority: "critical" },
          { offset: 5, title: "[D+5] Reporting Executivo ao CFO & Conselho", priority: "critical" },
        ];

  // Gerar rotinas padrão (exige um projeto: no Supabase toda tarefa pertence a um).
  // Chamado pelo ConfirmDialog, que mostra "Aguarde..." enquanto cria.
  const handleGenerateDefaultClosingTasks = async () => {
    if (selectedProjectId === "all" || generatingRef.current) return;
    generatingRef.current = true;
    setGenerating(true);
    try {
      await createAllOrThrow(defaultRoutines, (r) =>
        createTask({
          title: r.title,
          due_date: formatDateOnly(getCalculatedWorkdayDate(selectedYear, selectedMonth, r.offset, useD0)),
          priority: r.priority,
          status: "todo",
          progress: 0,
          project_id: selectedProjectId,
        })
      );
    } catch (err) {
      // Cada falha já virou toast no DataContext. Fecha o diálogo mesmo assim:
      // repetir criaria em dobro as rotinas que deram certo.
      console.error("[FastClose] generate routines:", err);
    } finally {
      generatingRef.current = false;
      setGenerating(false);
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
    const sourceTasksToCopy = scopedTasks.filter((t) => params.selectedTaskIds.includes(t.id));

    // Erros sobem para o CopyClosingDialog, que permanece aberto
    await createAllOrThrow(sourceTasksToCopy, (t) => {
      const originalDate = parseDateOnly(t.due_date || t.start_date) ?? lastDayOfMonth;
      const offset = getWorkdayOffsetFromDate(originalDate, params.sourceYear, params.sourceMonth, useD0);
      const newTargetDate = getCalculatedWorkdayDate(params.targetYear, params.targetMonth, offset, useD0);

      return createTask({
        title: t.title,
        description: t.description || undefined,
        due_date: formatDateOnly(newTargetDate),
        priority: t.priority,
        status: params.resetStatus ? "todo" : t.status,
        progress: params.resetStatus ? 0 : t.progress,
        assignee_id: params.keepAssignees ? t.assignee_id || undefined : undefined,
        assignee_name: params.keepAssignees ? t.assignee_name || undefined : undefined,
        project_id: t.project_id || (selectedProjectId !== "all" ? selectedProjectId : undefined),
      });
    });
  };

  // Importação de planilha
  const handleImportSpreadsheetSuccess = async (importedTasks: {
    title: string;
    description?: string;
    due_date?: string;
    priority: "low" | "medium" | "high" | "critical";
    project_id?: string;
  }[]) => {
    // Erros sobem para o ImportClosingSpreadsheetDialog, que mostra o resumo
    await createAllOrThrow(importedTasks, (t) =>
      createTask({
        title: t.title,
        description: t.description,
        due_date: toDateOnly(t.due_date),
        priority: t.priority,
        status: "todo",
        progress: 0,
        project_id: t.project_id || (selectedProjectId !== "all" ? selectedProjectId : undefined),
      })
    );
  };

  if (loading) {
    return <FastCloseSkeleton />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto">
      {/* Sleek Single-Line Executive Header */}
      <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Título & Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Cockpit de Fechamento Contábil
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                  Fast Close
                </Badge>
              </h1>
              <p className="text-xs text-muted-foreground">
                Régua de dias úteis com suporte a D0 e sincronização por projeto
              </p>
            </div>
          </div>

          {/* Single-Line Executive Toolbar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Seletor de Projeto */}
            <div className="flex items-center gap-1.5 bg-muted/50 pl-2.5 pr-1 py-1 rounded-xl border border-border/80">
              <FolderKanban className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <Select
                value={selectedProjectId}
                onValueChange={(val) => {
                  if (val === "new") {
                    handleCreateFastCloseProject();
                  } else {
                    setSelectedProjectId(val);
                  }
                }}
              >
                <SelectTrigger className="h-7 text-xs font-bold bg-transparent border-0 shadow-none px-1.5 py-0 focus:ring-0 max-w-[170px] truncate">
                  <SelectValue placeholder="Selecione o projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                      <span>(Todos os Fechamentos)</span>
                    </div>
                  </SelectItem>
                  {closingProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <FolderKanban className="h-3.5 w-3.5 text-blue-400" />
                        <span className="truncate">{p.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="new">
                    <div className="flex items-center gap-2 text-blue-500 font-semibold">
                      <Plus className="h-3.5 w-3.5" />
                      <span>+ Novo Projeto</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mês e Ano */}
            <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-xl border border-border/80">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
              <Select
                value={String(selectedMonth)}
                onValueChange={(val) => setSelectedMonth(Number(val))}
              >
                <SelectTrigger className="h-7 text-xs font-bold bg-transparent border-0 shadow-none px-1.5 py-0 focus:ring-0 w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, idx) => (
                    <SelectItem key={idx} value={String(idx + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(selectedYear)}
                onValueChange={(val) => setSelectedYear(Number(val))}
              >
                <SelectTrigger className="h-7 text-xs font-bold bg-transparent border-0 shadow-none px-1.5 py-0 focus:ring-0 w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Alcance de Ds */}
            <div className="flex items-center gap-1.5 bg-muted/50 pl-2.5 pr-1 py-1 rounded-xl border border-border/80">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select
                value={offsetRange}
                onValueChange={(val) => {
                  setOffsetRange(val);
                  setCustomOffsets(undefined);
                  saveProjectConfig(useD0, undefined, val);
                }}
              >
                <SelectTrigger className="h-7 text-xs font-bold bg-transparent border-0 shadow-none px-1.5 py-0 focus:ring-0 w-[115px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D-5_D+5">D-5 a D+5</SelectItem>
                  <SelectItem value="D-3_D+3">D-3 a D+3</SelectItem>
                  <SelectItem value="D-2_D+4">D-2 a D+4</SelectItem>
                  <SelectItem value="D-10_D+10">D-10 a D+10</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alternador de Visão (Matriz x Lista) */}
            <div className="flex items-center p-1 rounded-xl bg-muted border border-border shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "kanban"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visão Matriz Kanban"
              >
                <KanbanSquare className="h-3.5 w-3.5" />
                <span>Matriz</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "list"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Visão Lista Cronológica"
              >
                <List className="h-3.5 w-3.5" />
                <span>Lista</span>
              </button>
            </div>

            {/* Botão Configurar Régua */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfigDialogOpen(true)}
              className="text-xs font-bold gap-1.5 h-9 rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10"
              title="Configurar D0 e Régua de Dias"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Régua</span>
            </Button>

            {/* Menu Dropdown de Ações Unificadas */}
            <div className="relative" ref={menuRef}>
              <Button
                type="button"
                size="sm"
                onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-9 px-3.5 rounded-xl shadow-md shadow-blue-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ações</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-80" />
              </Button>

              {actionsMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-2xl z-[9999] py-1 divide-y divide-border/50 animate-in fade-in zoom-in-95">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        setCopyDialogOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-blue-500/10 hover:text-blue-500 flex items-center gap-2.5 transition-colors"
                    >
                      <Copy className="h-4 w-4 text-blue-500" />
                      <span>Copiar Mês Anterior</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActionsMenuOpen(false);
                        setImportDialogOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-emerald-500/10 hover:text-emerald-500 flex items-center gap-2.5 transition-colors"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                      <span>Importar Planilha (.ODS/XLSX)</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      disabled={generating || selectedProjectId === "all"}
                      onClick={() => {
                        setActionsMenuOpen(false);
                        setGenerateConfirmOpen(true);
                      }}
                      title={selectedProjectId === "all" ? "Selecione um projeto de fechamento para gerar as rotinas" : undefined}
                      className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-purple-500/10 hover:text-purple-500 flex items-center gap-2.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-purple-500" />
                      )}
                      <span className="flex flex-col">
                        <span>{generating ? "Gerando rotinas..." : "⚡ Gerar Rotinas Padrão"}</span>
                        {selectedProjectId === "all" && (
                          <span className="text-[10px] font-normal text-muted-foreground">
                            Selecione um projeto primeiro
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar & Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/80 p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span>Progresso ({selectedProjectObj?.name || "Todos os Fechamentos"})</span>
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
              {useD0 ? "Dia do Corte Oficial (D0 / WD0)" : "Encerramento do Mês (D-1)"}
            </span>
            <span className="text-base font-bold text-pink-600 dark:text-pink-400">
              {formatWorkdayColumnHeader(useD0 ? 0 : -1, lastDayOfMonth, useD0).formattedDate} — {formatWorkdayColumnHeader(useD0 ? 0 : -1, lastDayOfMonth, useD0).weekdayName}
            </span>
          </div>
          <Badge className="bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30">
            {useD0 ? "Corte ERP" : "D-1 (Sem D0)"}
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

      {/* Exibição: Kanban vs Lista Cronológica */}
      {viewMode === "kanban" ? (
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
                  onAddTask={() => {
                    setDefaultTaskDueDate(formatDateOnly(columnDate));
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
      ) : (
        <FastCloseListView
          workdayOffsets={workdayOffsets}
          offsetDatesMap={offsetDatesMap}
          tasksByOffset={tasksByOffset}
          useD0={useD0}
          onOpenEditTask={(task) => {
            setSelectedEditTask(task);
            setTaskDialogOpen(true);
          }}
          onToggleTaskComplete={handleToggleTaskComplete}
          onDeleteTask={handleDeleteTask}
          onAddTaskToOffset={(date) => {
            setDefaultTaskDueDate(formatDateOnly(date));
            setSelectedEditTask(null);
            setTaskDialogOpen(true);
          }}
        />
      )}

      {/* Modal de Criação / Edição de Tarefa */}
      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedEditTask}
        // Em "Todos", a edição usa o projeto da própria tarefa
        projectId={selectedEditTask?.project_id || (selectedProjectId !== "all" ? selectedProjectId : undefined)}
        defaultDueDate={defaultTaskDueDate}
      />

      {/* Confirmação de exclusão (substitui o confirm() nativo) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={`Excluir "${deleteTarget?.title ?? "rotina"}"?`}
        description="Esta ação não pode ser desfeita."
        variant="destructive"
        confirmText="Excluir"
        onConfirm={async () => {
          if (deleteTarget) await deleteTask(deleteTarget.id);
        }}
      />

      {/* Confirmação de geração das rotinas padrão */}
      <ConfirmDialog
        open={generateConfirmOpen}
        onOpenChange={setGenerateConfirmOpen}
        title="Gerar rotinas padrão?"
        description={`Serão criadas ${defaultRoutines.length} rotinas de fechamento para ${MONTH_NAMES[selectedMonth - 1]}/${selectedYear} em "${selectedProjectObj?.name ?? "projeto selecionado"}".`}
        confirmText="Gerar rotinas"
        onConfirm={handleGenerateDefaultClosingTasks}
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

      {/* Modal de Configuração de Dias Úteis & D0 (Salvamento Atômico) */}
      <WorkdayConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        useD0={useD0}
        workdayOffsets={workdayOffsets}
        onSaveConfig={(newUseD0, newOffsets) => {
          setUseD0(newUseD0);
          setCustomOffsets(newOffsets);
          saveProjectConfig(newUseD0, newOffsets, offsetRange);
        }}
      />

      {/* Modal de Conclusão de Tarefa: Registro de Horas Reais */}
      <CompleteTaskDialog
        open={!!completingTask}
        onOpenChange={(open) => {
          if (!open) setCompletingTask(null);
        }}
        task={completingTask}
        onConfirm={async (actualHours) => {
          if (completingTask) {
            await updateTask(completingTask.id, {
              status: "done",
              progress: 100,
              ...(actualHours !== null ? { actual_hours: actualHours } : {}),
            });
            setCompletingTask(null);
          }
        }}
      />
    </div>
  );
}
