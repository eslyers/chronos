import {
  buildGanttTasks,
  dateOnlyFromGanttStart,
  dueDateFromGanttEnd,
  formatGanttDate,
  ganttDateChangeToPatch,
  ganttEndFromDueDate,
  ganttStartFromDateOnly,
  parseGanttId,
  type BuildGanttTasksInput,
} from "../gantt-tasks";
import type { Project, Task, TaskDependency } from "@/lib/context/DataContext";

const project = (over: Partial<Project> = {}): Project => ({
  id: "p1",
  workspace_id: "ws1",
  owner_id: "u1",
  name: "Fechamento",
  description: null,
  color: "#123456",
  status: "active",
  start_date: "2026-10-01",
  target_date: "2026-10-31",
  progress: 40,
  track_time: false,
  created_at: "",
  updated_at: "",
  ...over,
});

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  project_id: "p1",
  stage_id: null,
  title: id,
  description: null,
  priority: "medium",
  status: "todo",
  progress: 0,
  start_date: "2026-10-05",
  due_date: "2026-10-09",
  assignee_id: null,
  assignee_name: null,
  assignee_status: null,
  position: 0,
  parent_task_id: null,
  created_at: "",
  updated_at: "",
  ...over,
});

function build(tasks: Task[], over: Partial<BuildGanttTasksInput> = {}) {
  return buildGanttTasks({
    projects: [project()],
    getTasksByProject: (id) => tasks.filter((t) => t.project_id === id),
    dependencies: [],
    selectedProjectId: "all",
    collapsedProjects: new Set(),
    collapsedTasks: new Set(),
    isDark: false,
    sortField: null,
    sortDirection: "asc",
    now: new Date(2026, 9, 21, 15, 30),
    ...over,
  });
}

describe("gantt date conversion", () => {
  it("maps DATE columns to local-midnight start and exclusive end", () => {
    expect(ganttStartFromDateOnly("2026-10-05")).toEqual(new Date(2026, 9, 5));
    // Prazo 31/10 → barra termina na meia-noite de 01/11 (cobre o dia inteiro)
    expect(ganttEndFromDueDate("2026-10-31")).toEqual(new Date(2026, 10, 1));
    expect(ganttEndFromDueDate("2026-10-31T00:00:00.000Z")).toEqual(new Date(2026, 10, 1));
    expect(ganttEndFromDueDate(null)).toBeNull();
  });

  it("inverts the conversion and rounds stray hours to the nearest day", () => {
    expect(dateOnlyFromGanttStart(new Date(2026, 9, 5))).toBe("2026-10-05");
    expect(dueDateFromGanttEnd(new Date(2026, 10, 1))).toBe("2026-10-31");
    expect(dateOnlyFromGanttStart(new Date(2026, 9, 5, 13))).toBe("2026-10-06");
    expect(dateOnlyFromGanttStart(new Date(2026, 9, 5, 11, 59))).toBe("2026-10-05");
    expect(dueDateFromGanttEnd(new Date(2026, 0, 1, 2))).toBe("2025-12-31");
  });

  it("round-trips every day of a year", () => {
    for (let d = 0; d < 366; d++) {
      const day = new Date(2026, 0, 1 + d);
      const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
      expect(dateOnlyFromGanttStart(ganttStartFromDateOnly(iso)!)).toBe(iso);
      expect(dueDateFromGanttEnd(ganttEndFromDueDate(iso)!)).toBe(iso);
    }
  });

  it("builds a patch with only the dates that changed", () => {
    const original = { start: new Date(2026, 9, 5), end: new Date(2026, 9, 10) };
    // move: +2 dias
    expect(
      ganttDateChangeToPatch(original, { start: new Date(2026, 9, 7), end: new Date(2026, 9, 12) })
    ).toEqual({ start_date: "2026-10-07", due_date: "2026-10-11" });
    // resize do fim
    expect(
      ganttDateChangeToPatch(original, { start: new Date(2026, 9, 5), end: new Date(2026, 9, 15) })
    ).toEqual({ due_date: "2026-10-14" });
    // resize do início
    expect(
      ganttDateChangeToPatch(original, { start: new Date(2026, 9, 3), end: new Date(2026, 9, 10) })
    ).toEqual({ start_date: "2026-10-03" });
    // sem mudança efetiva (sub-dia)
    expect(
      ganttDateChangeToPatch(original, { start: new Date(2026, 9, 5, 3), end: new Date(2026, 9, 10, 2) })
    ).toEqual({});
  });

  it("rejects a due date before the start date", () => {
    const original = { start: new Date(2026, 9, 5), end: new Date(2026, 9, 10) };
    expect(
      ganttDateChangeToPatch(original, { start: new Date(2026, 9, 5), end: new Date(2026, 9, 5) })
    ).toBeNull();
    // um único dia é válido
    expect(
      ganttDateChangeToPatch(original, { start: new Date(2026, 9, 5), end: new Date(2026, 9, 6) })
    ).toEqual({ due_date: "2026-10-05" });
  });

  it("formats dates as DD/MM/YY and parses gantt ids", () => {
    expect(formatGanttDate(new Date(2026, 0, 9))).toBe("09/01/26");
    expect(parseGanttId("task-abc")).toEqual({ kind: "task", id: "abc" });
    expect(parseGanttId("project-p1")).toEqual({ kind: "project", id: "p1" });
    expect(parseGanttId("other")).toBeNull();
  });
});

describe("buildGanttTasks", () => {
  it("emits a locked project row followed by its tasks", () => {
    const rows = build([task("t1")]);
    expect(rows.map((r) => r.id)).toEqual(["project-p1", "task-t1"]);
    expect(rows[0]).toMatchObject({
      type: "project",
      isDisabled: true,
      start: new Date(2026, 9, 1),
      end: new Date(2026, 10, 1),
    });
    expect(rows[1]).toMatchObject({
      type: "task",
      isDisabled: false,
      project: "project-p1",
      start: new Date(2026, 9, 5),
      end: new Date(2026, 9, 10),
      workspaceId: "ws1",
    });
  });

  it("locks every bar in read-only mode", () => {
    const rows = build([task("t1")], { readOnly: true });
    expect(rows.every((r) => r.isDisabled)).toBe(true);
  });

  it("falls back to project start and a 7-day span for undated tasks", () => {
    const rows = build([task("t1", { start_date: null, due_date: null })]);
    expect(rows[1].start).toEqual(new Date(2026, 9, 1));
    expect(rows[1].end).toEqual(new Date(2026, 9, 8));
  });

  it("falls back to today/+30 days for undated projects", () => {
    const rows = build([], { projects: [project({ start_date: null, target_date: null })] });
    expect(rows[0].start).toEqual(new Date(2026, 9, 21));
    expect(rows[0].end).toEqual(new Date(2026, 10, 20));
  });

  it("colors bars by priority and marks completed tasks", () => {
    const rows = build([
      task("crit", { priority: "critical" }),
      task("high", { priority: "high" }),
      task("done", { status: "done", progress: 100 }),
    ]);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get("task-crit")!.styles!.backgroundColor).toBe("#ef4444");
    expect(byId.get("task-high")!.styles!.backgroundColor).toBe("#f97316");
    expect(byId.get("task-done")!.isDone).toBe(true);
    expect(byId.get("task-done")!.styles!.backgroundColor).toBe("#10b981");
  });

  it("nests subtasks and hides them when the parent is collapsed", () => {
    const tasks = [task("parent"), task("child", { parent_task_id: "parent" })];
    const open = build(tasks);
    expect(open.map((r) => r.id)).toEqual(["project-p1", "task-parent", "task-child"]);
    expect(open[1].name).toBe("▼ parent");
    expect(open[2]).toMatchObject({ name: "  ↳ child", project: "task-parent" });

    const collapsed = build(tasks, { collapsedTasks: new Set(["parent"]) });
    expect(collapsed.map((r) => r.id)).toEqual(["project-p1", "task-parent"]);
    expect(collapsed[1].name).toBe("▶ parent");
  });

  it("hides all tasks of a collapsed project", () => {
    const rows = build([task("t1")], { collapsedProjects: new Set(["p1"]) });
    expect(rows.map((r) => r.id)).toEqual(["project-p1"]);
    expect(rows[0].name).toBe("▶ Fechamento");
  });

  it("filters by the selected project", () => {
    const rows = build([task("t1"), task("t2", { project_id: "p2" })], {
      projects: [project(), project({ id: "p2", name: "Outro" })],
      selectedProjectId: "p2",
    });
    expect(rows.map((r) => r.id)).toEqual(["project-p2", "task-t2"]);
  });

  it("sorts by the chosen column and direction", () => {
    const tasks = [
      task("b", { start_date: "2026-10-03" }),
      task("a", { start_date: "2026-10-08" }),
      task("c", { start_date: null }),
    ];
    const ids = (rows: ReturnType<typeof build>) => rows.slice(1).map((r) => r.id);
    expect(ids(build(tasks, { sortField: "name" }))).toEqual(["task-a", "task-b", "task-c"]);
    expect(ids(build(tasks, { sortField: "start" }))).toEqual(["task-c", "task-b", "task-a"]);
    expect(ids(build(tasks, { sortField: "start", sortDirection: "desc" }))).toEqual([
      "task-a",
      "task-b",
      "task-c",
    ]);
  });

  it("links dependencies using gantt ids so arrows render", () => {
    const deps: TaskDependency[] = [{ id: "d1", task_id: "t2", depends_on_task_id: "t1", type: "FS" }];
    const rows = build([task("t1"), task("t2")], { dependencies: deps });
    expect(rows.find((r) => r.id === "task-t2")!.dependencies).toEqual(["task-t1"]);
    expect(rows.find((r) => r.id === "task-t1")!.dependencies).toBeUndefined();
  });
});
