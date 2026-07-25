import { wouldCreateCycle } from "../supabase-data";
import type { TaskDependency } from "@/lib/context/DataContext";

describe("wouldCreateCycle", () => {
  it("should return false when there are no dependencies", () => {
    const result = wouldCreateCycle("taskA", "taskB", []);
    expect(result).toBe(false);
  });

  it("should return true when a direct cycle is introduced", () => {
    const allDeps: TaskDependency[] = [
      { id: "dep1", task_id: "taskA", depends_on_task_id: "taskB", type: "FS" },
    ];
    // taskB depends on taskA when taskA already depends on taskB
    const result = wouldCreateCycle("taskB", "taskA", allDeps);
    expect(result).toBe(true);
  });

  it("should return true when an indirect cycle is introduced", () => {
    const allDeps: TaskDependency[] = [
      { id: "dep1", task_id: "taskA", depends_on_task_id: "taskB", type: "FS" },
      { id: "dep2", task_id: "taskB", depends_on_task_id: "taskC", type: "FS" },
    ];
    // taskC depends on taskA when taskA already depends on taskB and B depends on C
    const result = wouldCreateCycle("taskC", "taskA", allDeps);
    expect(result).toBe(true);
  });

  it("should return false when no cycle is introduced", () => {
    const allDeps: TaskDependency[] = [
      { id: "dep1", task_id: "taskA", depends_on_task_id: "taskB", type: "FS" },
      { id: "dep2", task_id: "taskB", depends_on_task_id: "taskC", type: "FS" },
    ];
    // taskD depends on taskA -> no cycle
    const result = wouldCreateCycle("taskD", "taskA", allDeps);
    expect(result).toBe(false);
  });
});
