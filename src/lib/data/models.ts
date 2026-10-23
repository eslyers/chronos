// ─────────────────────────────────────────────────────────────
// CHRONOS — Tipos de domínio da UI (projetos, etapas, tarefas…)
// Módulo neutro (sem "use client"): usado pelo DataContext, pela camada
// Supabase e pelas libs. O DataContext reexporta estes tipos.
// ─────────────────────────────────────────────────────────────

export type Stage = {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  is_done: boolean;
  wip_limit?: number | null;
};

export type Task = {
  id: string;
  project_id: string;
  stage_id: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "review" | "done" | "blocked";
  progress: number;
  start_date: string | null; // ISO
  due_date: string | null; // ISO
  estimated_hours?: number | null;
  actual_hours?: number | null;
  assignee_id: string | null;
  assignee_name: string | null; // texto original quando assignee não é membro
  assignee_status: "pending" | "invited" | null;
  position: number;
  parent_task_id: string | null; // WBS hierarchy
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  color: string;
  status: "active" | "completed" | "archived";
  start_date: string | null;
  target_date: string | null;
  progress: number;
  track_time: boolean;
  created_at: string;
  updated_at: string;
};

export type TaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  type: "FS" | "SS" | "FF" | "SF"; // Finish-to-Start, Start-to-Start, Finish-to-Finish, Start-to-Finish
};

export type TaskComment = {
  id: string;
  task_id: string;
  user_id: string | null;
  user_name: string;
  content: string;
  created_at: string;
};

export type TaskAttachment = {
  id: string;
  task_id: string;
  user_id: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  /**
   * Link para abrir/baixar: assinado (temporário) para arquivos no Storage,
   * data URL em anexos antigos e no modo demo. null se não foi possível gerar.
   */
  file_url: string | null;
  /** Caminho no bucket task-attachments (<task_id>/<uuid>-<nome>). */
  storage_path?: string | null;
  uploaded_at: string;
};

/** Arquivo escolhido pelo usuário para anexar. */
export type NewTaskAttachment = {
  name: string;
  size: number;
  type: string;
  file: Blob;
};

export type DataState = {
  projects: Project[];
  stages: Stage[];
  tasks: Task[];
  dependencies: TaskDependency[];
  loading: boolean;
};

export type CloneProjectOptions = {
  name: string;
  description?: string;
  color?: string;
  startDate?: string;
  targetDate?: string;
  cloneTasks?: boolean;
  cloneDependencies?: boolean;
  resetStatus?: boolean;
  keepAssignees?: boolean;
  shiftDates?: boolean;
  trackTime?: boolean;
};
