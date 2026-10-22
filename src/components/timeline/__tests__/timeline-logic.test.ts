import { act, renderHook } from "@testing-library/react";
import type { Task as GanttTask } from "gantt-task-react";
import type { Project, Task } from "@/lib/context/DataContext";
import { computeTimelineStats } from "../timeline-stats";
import { toggleInSet, useGanttInteractions } from "../useGanttInteractions";

const project = (id: string): Project => ({
  id,
  workspace_id: "ws1",
  owner_id: "u1",
  name: id,
  description: null,
  color: "#123456",
  status: "active",
  start_date: null,
  target_date: null,
  progress: 0,
  track_time: false,
  created_at: "",
  updated_at: "",
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
  due_date: "2026-10-10",
  assignee_id: null,
  assignee_name: null,
  assignee_status: null,
  position: 0,
  parent_task_id: null,
  created_at: "",
  updated_at: "",
  ...over,
});

const bar = (id: string, start: Date, end: Date): GanttTask =>
  ({ id, name: id, start, end, progress: 0, type: "task" }) as GanttTask;

describe("toggleInSet", () => {
  it("adds and removes ids without mutating the previous set", () => {
    const prev = new Set(["a"]);
    expect([...toggleInSet(prev, "b")]).toEqual(["a", "b"]);
    expect([...toggleInSet(prev, "a")]).toEqual([]);
    expect([...prev]).toEqual(["a"]);
  });
});

describe("computeTimelineStats", () => {
  const today = "2026-10-21";
  const byProject: Record<string, Task[]> = {
    p1: [task("t1", { status: "done", progress: 100 }), task("t2", { due_date: "2026-10-01" })],
    p2: [task("t3", { project_id: "p2", due_date: "2026-12-01" })],
  };
  const getTasksByProject = (id: string) => byProject[id] ?? [];
  const projects = [project("p1"), project("p2")];

  it("aggregates every project when 'all' is selected", () => {
    expect(computeTimelineStats(projects, getTasksByProject, "all", today)).toEqual({
      totalProjects: 2,
      totalTasks: 3,
      completed: 1,
      overdue: 1,
      completionRate: 33,
      isFiltered: false,
    });
  });

  it("scopes to the selected project", () => {
    expect(computeTimelineStats(projects, getTasksByProject, "p1", today)).toMatchObject({
      totalProjects: 1,
      totalTasks: 2,
      completionRate: 50,
      isFiltered: true,
    });
  });

  it("reports 0% when there are no tasks", () => {
    expect(computeTimelineStats([], getTasksByProject, "all", today).completionRate).toBe(0);
  });
});

describe("useGanttInteractions", () => {
  const original = bar("task-t1", new Date(2026, 9, 5), new Date(2026, 9, 11));
  const tasks = [task("t1"), task("t2", { parent_task_id: "t1" }), task("t3")];

  function setup(over: { readOnly?: boolean; updateTask?: jest.Mock } = {}) {
    const updateTask = over.updateTask ?? jest.fn().mockResolvedValue(undefined);
    const addToast = jest.fn().mockReturnValue("toast");
    const setCollapsedProjects = jest.fn();
    const setCollapsedTasks = jest.fn();
    const onEditTask = jest.fn();
    const { result } = renderHook(() =>
      useGanttInteractions({
        ganttTasks: [bar("project-p1", original.start, original.end), original, bar("task-t3", original.start, original.end)],
        tasks,
        readOnly: over.readOnly ?? false,
        updateTask,
        addToast,
        setCollapsedProjects,
        setCollapsedTasks,
        onEditTask,
      })
    );
    return { result, updateTask, addToast, setCollapsedProjects, setCollapsedTasks, onEditTask };
  }

  it("toggles projects and parent tasks, opens leaf tasks", () => {
    const { result, setCollapsedProjects, setCollapsedTasks, onEditTask } = setup();
    act(() => result.current.openTaskOrToggle("project-p1"));
    expect(setCollapsedProjects).toHaveBeenCalledTimes(1);
    act(() => result.current.openTaskOrToggle("task-t1"));
    expect(setCollapsedTasks).toHaveBeenCalledTimes(1);
    act(() => result.current.openTaskOrToggle("task-t3"));
    expect(onEditTask).toHaveBeenCalledWith(tasks[2]);
  });

  it("persists a drag and returns true", async () => {
    const { result, updateTask } = setup();
    const moved = bar("task-t1", new Date(2026, 9, 6), new Date(2026, 9, 12));
    await expect(result.current.handleDateChange(moved)).resolves.toBe(true);
    expect(updateTask).toHaveBeenCalledWith("t1", { start_date: "2026-10-06", due_date: "2026-10-11" });
  });

  it("reverts (returns false) when read-only, invalid or failing", async () => {
    const moved = bar("task-t1", new Date(2026, 9, 6), new Date(2026, 9, 12));
    await expect(setup({ readOnly: true }).result.current.handleDateChange(moved)).resolves.toBe(false);

    const { result, addToast } = setup();
    const inverted = bar("task-t1", new Date(2026, 9, 12), new Date(2026, 9, 6));
    await expect(result.current.handleDateChange(inverted)).resolves.toBe(false);
    expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Datas inválidas" }));

    await expect(result.current.handleDateChange(original)).resolves.toBe(false);

    const failing = setup({ updateTask: jest.fn().mockRejectedValue(new Error("x")) });
    await expect(failing.result.current.handleDateChange(moved)).resolves.toBe(false);
  });

  it("ignores the bar click fired right after a drag (500ms)", async () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(1_000);
    const { result, onEditTask } = setup();
    const t3 = bar("task-t3", original.start, original.end);
    await result.current.handleDateChange(t3);
    act(() => result.current.handleBarClick(t3));
    expect(onEditTask).not.toHaveBeenCalled();
    now.mockReturnValue(1_500);
    act(() => result.current.handleBarClick(t3));
    expect(onEditTask).toHaveBeenCalledTimes(1);
    now.mockRestore();
  });
});
