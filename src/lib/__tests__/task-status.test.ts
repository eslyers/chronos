import { isTaskDone, isTaskOverdue, isTaskDueToday, daysUntilDue } from "../task-status";
import { priorityLabel, PRIORITY_HEX } from "../priority";

const task = (due_date: string | null, status = "todo", progress = 0) =>
  ({ due_date, status, progress }) as Parameters<typeof isTaskOverdue>[0];

describe("task-status", () => {
  const today = "2026-10-21";

  it("treats a task due today as due, not overdue", () => {
    expect(isTaskOverdue(task("2026-10-21"), today)).toBe(false);
    expect(isTaskDueToday(task("2026-10-21T00:00:00.000Z"), today)).toBe(true);
  });

  it("flags past-due open tasks only", () => {
    expect(isTaskOverdue(task("2026-10-20"), today)).toBe(true);
    expect(isTaskOverdue(task("2026-10-20", "done", 100), today)).toBe(false);
    expect(isTaskOverdue(task("2026-10-20", "in_progress", 100), today)).toBe(false);
    expect(isTaskOverdue(task(null), today)).toBe(false);
  });

  it("computes days until due", () => {
    expect(daysUntilDue(task("2026-10-24"), today)).toBe(3);
    expect(daysUntilDue(task("2026-10-19"), today)).toBe(-2);
    expect(daysUntilDue(task(null), today)).toBeNull();
    expect(isTaskDone({ status: "todo", progress: 100 })).toBe(true);
  });
});

describe("priority", () => {
  it("labels and colors priorities", () => {
    expect(priorityLabel("high")).toBe("Alta");
    expect(priorityLabel(undefined)).toBe("Média");
    expect(PRIORITY_HEX.high).toBe("#f97316");
  });
});
