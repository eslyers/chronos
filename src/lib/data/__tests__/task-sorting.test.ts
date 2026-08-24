import {
  getTaskTimestamp,
  compareTasksByDueDate,
  sortTasksWithHierarchy,
} from "../../task-sorting";

describe("task-sorting utility", () => {
  describe("getTaskTimestamp", () => {
    it("should parse ISO date strings accurately", () => {
      const ts = getTaskTimestamp("2026-08-15");
      expect(ts).toBeGreaterThan(0);
      expect(ts).not.toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should parse Brazilian DD/MM/YYYY date strings accurately", () => {
      const ts = getTaskTimestamp("15/08/2026");
      expect(ts).toBeGreaterThan(0);
      expect(ts).not.toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should return MAX_SAFE_INTEGER for null or undefined", () => {
      expect(getTaskTimestamp(null)).toBe(Number.MAX_SAFE_INTEGER);
      expect(getTaskTimestamp(undefined)).toBe(Number.MAX_SAFE_INTEGER);
      expect(getTaskTimestamp("")).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe("compareTasksByDueDate", () => {
    it("should sort earlier due dates before later ones", () => {
      const taskA = { id: "1", title: "Primeira", due_date: "2026-08-10" };
      const taskB = { id: "2", title: "Segunda", due_date: "2026-08-20" };

      expect(compareTasksByDueDate(taskA, taskB)).toBeLessThan(0);
      expect(compareTasksByDueDate(taskB, taskA)).toBeGreaterThan(0);
    });

    it("should place tasks with no due date at the end", () => {
      const taskWithDate: { id: string; title: string; due_date: string | null } = {
        id: "1",
        title: "Com Data",
        due_date: "2026-08-10",
      };
      const taskNoDate: { id: string; title: string; due_date: string | null } = {
        id: "2",
        title: "Sem Data",
        due_date: null,
      };

      expect(compareTasksByDueDate(taskWithDate, taskNoDate)).toBeLessThan(0);
      expect(compareTasksByDueDate(taskNoDate, taskWithDate)).toBeGreaterThan(0);
    });
  });

  describe("sortTasksWithHierarchy", () => {
    it("should nest sub-tasks directly under their parent task in order", () => {
      const tasks = [
        { id: "parent-2", title: "Projeto B", due_date: "2026-08-20", parent_task_id: null },
        { id: "sub-1-b", title: "Sub 1B", due_date: "2026-08-12", parent_task_id: "parent-1" },
        { id: "parent-1", title: "Projeto A", due_date: "2026-08-10", parent_task_id: null },
        { id: "sub-1-a", title: "Sub 1A", due_date: "2026-08-11", parent_task_id: "parent-1" },
      ];

      const sorted = sortTasksWithHierarchy(tasks);
      const sortedIds = sorted.map((t) => t.id);

      // Parent 1 (due 10) should come first, immediately followed by its subtasks (sub-1-a due 11, sub-1-b due 12), then Parent 2
      expect(sortedIds).toEqual(["parent-1", "sub-1-a", "sub-1-b", "parent-2"]);
    });

    it("should handle empty or single-item arrays gracefully", () => {
      expect(sortTasksWithHierarchy([])).toEqual([]);
      const single = [{ id: "1", title: "Unica", due_date: "2026-08-10" }];
      expect(sortTasksWithHierarchy(single)).toEqual(single);
    });
  });
});
