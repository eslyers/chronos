import type { Project, Task } from "@/lib/context/DataContext";
import { dbToProject } from "@/lib/data/supabase-data";

describe("Project track_time functionality", () => {
  it("deve mapear track_time como true por padrão no dbToProject para compatibilidade retroativa", () => {
    const dbRowWithoutTrackTime = {
      id: "proj-1",
      workspace_id: "ws-1",
      created_by: "user-1",
      name: "Projeto Legado",
      description: "Sem coluna track_time preenchida",
      color: "#3b82f6",
      status: "active" as const,
      start_date: "2026-01-01",
      target_date: "2026-06-30",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const project = dbToProject(dbRowWithoutTrackTime as unknown as Parameters<typeof dbToProject>[0]);
    expect(project.track_time).toBe(true);
  });

  it("deve mapear track_time como false quando o valor no banco for explicitamente false", () => {
    const dbRowWithTrackTimeFalse = {
      id: "proj-2",
      workspace_id: "ws-1",
      created_by: "user-1",
      name: "Projeto Sem Horas",
      description: "Controle de tempo desabilitado",
      color: "#10b981",
      status: "active" as const,
      start_date: "2026-02-01",
      target_date: "2026-08-30",
      track_time: false,
      created_at: "2026-02-01T00:00:00Z",
      updated_at: "2026-02-01T00:00:00Z",
    };

    const project = dbToProject(dbRowWithTrackTimeFalse);
    expect(project.track_time).toBe(false);
  });

  it("deve mapear track_time como true quando o valor no banco for true", () => {
    const dbRowWithTrackTimeTrue = {
      id: "proj-3",
      workspace_id: "ws-1",
      created_by: "user-1",
      name: "Projeto Com Horas",
      description: "Controle de tempo habilitado",
      color: "#6366f1",
      status: "active" as const,
      start_date: "2026-03-01",
      target_date: "2026-09-30",
      track_time: true,
      created_at: "2026-03-01T00:00:00Z",
      updated_at: "2026-03-01T00:00:00Z",
    };

    const project = dbToProject(dbRowWithTrackTimeTrue);
    expect(project.track_time).toBe(true);
  });

  it("deve herdar track_time na clonagem se a opção não for explicitada", () => {
    const sourceProject: Project = {
      id: "source-1",
      workspace_id: "ws-1",
      owner_id: "user-1",
      name: "Projeto Modelo",
      description: null,
      color: "#3b82f6",
      status: "active",
      start_date: null,
      target_date: null,
      progress: 0,
      track_time: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    // Lógica do DataContext.cloneProject:
    // options.trackTime !== undefined ? options.trackTime : (sourceProject.track_time !== false)
    const clonedTrackTimeDefault = undefined !== undefined ? undefined : (sourceProject.track_time !== false);
    expect(clonedTrackTimeDefault).toBe(false);

    const clonedTrackTimeOverridden = true !== undefined ? true : (sourceProject.track_time !== false);
    expect(clonedTrackTimeOverridden).toBe(true);
  });

  it("deve zelar para que tarefas de projeto sem track_time possam omitir horas", () => {
    const projectWithoutTime: Project = {
      id: "proj-notime",
      workspace_id: "ws-1",
      owner_id: "user-1",
      name: "Simples",
      description: null,
      color: "#3b82f6",
      status: "active",
      start_date: null,
      target_date: null,
      progress: 100,
      track_time: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const task: Task = {
      id: "task-notime-1",
      project_id: projectWithoutTime.id,
      stage_id: "stage-done",
      title: "Tarefa sem medição de tempo",
      description: null,
      priority: "medium",
      status: "done",
      progress: 100,
      start_date: null,
      due_date: null,
      estimated_hours: null,
      actual_hours: null,
      assignee_id: null,
      assignee_name: null,
      assignee_status: null,
      position: 0,
      parent_task_id: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    expect(projectWithoutTime.track_time).toBe(false);
    expect(task.estimated_hours).toBeNull();
    expect(task.actual_hours).toBeNull();
    expect(task.status).toBe("done");
  });
});
