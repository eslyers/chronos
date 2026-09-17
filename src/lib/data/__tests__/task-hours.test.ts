import type { Task } from "@/lib/context/DataContext";

describe("Task Hours & Actual Hours Calculation", () => {
  // Simula a lógica de sanitização e parsing usada no TaskDialog e CompleteTaskDialog
  function parseHoursInput(val: string): number | null {
    const cleaned = val.replace(/[^0-9.,]/g, "").replace(",", ".");
    if (!cleaned.trim()) return null;
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) ? parsed : null;
  }

  function calculateHourVariance(estimated: number | null, actual: number | null) {
    if (estimated == null || actual == null || estimated <= 0 || actual <= 0) {
      return null;
    }
    const diff = actual - estimated;
    const pct = Math.round((diff / estimated) * 100);
    return {
      diff,
      pct,
      isEconomy: diff < 0,
      isDelayed: diff > 0,
      isExact: diff === 0,
    };
  }

  it("deve converter horas com vírgula ou ponto corretamente", () => {
    expect(parseHoursInput("8")).toBe(8);
    expect(parseHoursInput("8.5")).toBe(8.5);
    expect(parseHoursInput("8,5")).toBe(8.5);
    expect(parseHoursInput("  12,25  ")).toBe(12.25);
    expect(parseHoursInput("")).toBeNull();
    expect(parseHoursInput("abc")).toBeNull();
  });

  it("deve calcular economia de tempo quando as horas reais forem menores que as estimadas", () => {
    const variance = calculateHourVariance(10, 8);
    expect(variance).not.toBeNull();
    expect(variance?.diff).toBe(-2);
    expect(variance?.pct).toBe(-20);
    expect(variance?.isEconomy).toBe(true);
    expect(variance?.isDelayed).toBe(false);
    expect(variance?.isExact).toBe(false);
  });

  it("deve calcular desvio quando as horas reais excederem as estimadas", () => {
    const variance = calculateHourVariance(8, 10);
    expect(variance).not.toBeNull();
    expect(variance?.diff).toBe(2);
    expect(variance?.pct).toBe(25);
    expect(variance?.isEconomy).toBe(false);
    expect(variance?.isDelayed).toBe(true);
  });

  it("deve identificar conclusão exata no tempo previsto", () => {
    const variance = calculateHourVariance(8, 8);
    expect(variance).not.toBeNull();
    expect(variance?.diff).toBe(0);
    expect(variance?.pct).toBe(0);
    expect(variance?.isExact).toBe(true);
  });

  it("deve permitir tarefas com actual_hours no modelo Task", () => {
    const task: Task = {
      id: "task-1",
      project_id: "p-1",
      stage_id: "s-1",
      title: "Desenvolvimento de Feature",
      description: null,
      priority: "high",
      status: "done",
      progress: 100,
      start_date: "2026-09-01",
      due_date: "2026-09-05",
      estimated_hours: 16,
      actual_hours: 14.5,
      assignee_id: null,
      assignee_name: null,
      assignee_status: null,
      position: 0,
      parent_task_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(task.actual_hours).toBe(14.5);
    expect(task.estimated_hours).toBe(16);
    expect(task.status).toBe("done");
  });
});
