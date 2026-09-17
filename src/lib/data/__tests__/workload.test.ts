import {
  calculateWorkload,
  getTaskAssigneeKey,
  getTaskEstimatedHours,
} from "@/lib/workload";
import type { Task } from "@/lib/context/DataContext";

describe("Workload Calculations", () => {
  const mockTask = (overrides: Partial<Task>): Task => ({
    id: "task-1",
    project_id: "proj-1",
    stage_id: "stage-1",
    title: "Tarefa Teste",
    description: null,
    priority: "medium",
    status: "todo",
    progress: 0,
    start_date: "2026-09-01",
    due_date: "2026-09-05",
    estimated_hours: 8,
    assignee_id: null,
    assignee_name: "Ana Silva",
    assignee_status: null,
    position: 0,
    parent_task_id: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  });

  test("normalizes assignee key correctly", () => {
    const taskWithId = mockTask({ assignee_id: "user-123", assignee_name: "Carlos" });
    expect(getTaskAssigneeKey(taskWithId)).toEqual({
      key: "user-123",
      name: "Carlos",
      id: "user-123",
    });

    const taskWithNameOnly = mockTask({ assignee_id: null, assignee_name: "Maria Santos" });
    expect(getTaskAssigneeKey(taskWithNameOnly)).toEqual({
      key: "maria santos",
      name: "Maria Santos",
      id: null,
    });

    const taskUnassigned = mockTask({ assignee_id: null, assignee_name: null });
    expect(getTaskAssigneeKey(taskUnassigned)).toEqual({
      key: "unassigned",
      name: "Não Atribuído",
      id: null,
    });
  });

  test("retrieves estimated hours accurately", () => {
    const taskWithExplicitHours = mockTask({ estimated_hours: 14 });
    expect(getTaskEstimatedHours(taskWithExplicitHours)).toBe(14);

    const taskWithoutHours = mockTask({ estimated_hours: null, start_date: null, due_date: null });
    expect(getTaskEstimatedHours(taskWithoutHours)).toBe(8); // Default fallback
  });

  test("calculates capacity and classifies overload/optimal/under correctly", () => {
    const tasks: Task[] = [
      // Ana tem 48h pendentes em capacidade de 40h -> Overload (>100%)
      mockTask({ id: "t1", assignee_name: "Ana", estimated_hours: 24, status: "in_progress" }),
      mockTask({ id: "t2", assignee_name: "Ana", estimated_hours: 24, status: "todo" }),

      // Bruno tem 32h pendentes em capacidade de 40h -> Optimal (80%)
      mockTask({ id: "t3", assignee_name: "Bruno", estimated_hours: 32, status: "todo" }),

      // Clara tem 16h pendentes em capacidade de 40h -> Under (40%)
      mockTask({ id: "t4", assignee_name: "Clara", estimated_hours: 16, status: "todo" }),

      // Tarefa não atribuída
      mockTask({ id: "t5", assignee_name: null, estimated_hours: 10, status: "todo" }),
    ];

    const result = calculateWorkload(tasks, { weeklyCapacityHours: 40 });

    expect(result.totalMembers).toBe(3);
    expect(result.overloadedMembersCount).toBe(1);
    expect(result.optimalMembersCount).toBe(1);
    expect(result.underallocatedMembersCount).toBe(1);
    expect(result.unassignedTasksCount).toBe(1);
    expect(result.unassignedHours).toBe(10);

    const ana = result.members.find((m) => m.memberName === "Ana");
    expect(ana).toBeDefined();
    expect(ana?.status).toBe("overload");
    expect(ana?.pendingHours).toBe(48);
    expect(ana?.utilizationPercentage).toBe(120);

    const bruno = result.members.find((m) => m.memberName === "Bruno");
    expect(bruno?.status).toBe("optimal");
    expect(bruno?.pendingHours).toBe(32);
    expect(bruno?.utilizationPercentage).toBe(80);

    const clara = result.members.find((m) => m.memberName === "Clara");
    expect(clara?.status).toBe("under");
    expect(clara?.pendingHours).toBe(16);
    expect(clara?.utilizationPercentage).toBe(40);
  });
});
