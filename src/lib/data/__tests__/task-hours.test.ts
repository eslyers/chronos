import type { Task } from "@/lib/context/DataContext";
import { parseDurationToHours, formatHoursToHHMM, formatHoursBadge } from "@/lib/duration";

describe("Task Hours & Duration Parsing (HH:MM com suporte > 24h)", () => {
  describe("parseDurationToHours", () => {
    it("deve converter formatos compostos como 36h:25m, 36h25m e 36h 25m", () => {
      expect(parseDurationToHours("36h:25m")).toBe(36.4167);
      expect(parseDurationToHours("36h25m")).toBe(36.4167);
      expect(parseDurationToHours("36h 25m")).toBe(36.4167);
      expect(parseDurationToHours("36h:25")).toBe(36.4167);
    });

    it("deve converter formato de relógio HH:MM com horas superiores a 24h", () => {
      expect(parseDurationToHours("36:25")).toBe(36.4167);
      expect(parseDurationToHours("08:00")).toBe(8);
      expect(parseDurationToHours("120:30")).toBe(120.5);
    });

    it("deve converter formato apenas minutos (ex: 45m, 30min)", () => {
      expect(parseDurationToHours("45m")).toBe(0.75);
      expect(parseDurationToHours("30min")).toBe(0.5);
    });

    it("deve converter números inteiros e decimais com ponto ou vírgula", () => {
      expect(parseDurationToHours("8")).toBe(8);
      expect(parseDurationToHours("8.5")).toBe(8.5);
      expect(parseDurationToHours("8,5")).toBe(8.5);
      expect(parseDurationToHours(16)).toBe(16);
      expect(parseDurationToHours("36.4167")).toBe(36.4167);
    });

    it("deve retornar null para strings vazias ou inválidas", () => {
      expect(parseDurationToHours("")).toBeNull();
      expect(parseDurationToHours("   ")).toBeNull();
      expect(parseDurationToHours("abc")).toBeNull();
      expect(parseDurationToHours(null)).toBeNull();
      expect(parseDurationToHours(undefined)).toBeNull();
    });
  });

  describe("formatHoursToHHMM", () => {
    it("deve formatar horas decimais para o padrão HHh:MMm com suporte > 24h", () => {
      expect(formatHoursToHHMM(36.4167)).toBe("36h:25m");
      expect(formatHoursToHHMM(8)).toBe("08h:00m");
      expect(formatHoursToHHMM(8.5)).toBe("08h:30m");
      expect(formatHoursToHHMM(120.5)).toBe("120h:30m");
      expect(formatHoursToHHMM(0.75)).toBe("00h:45m");
    });

    it("deve retornar string vazia para valores nulos ou zero", () => {
      expect(formatHoursToHHMM(null)).toBe("");
      expect(formatHoursToHHMM(undefined)).toBe("");
      expect(formatHoursToHHMM(0)).toBe("");
    });
  });

  describe("formatHoursBadge", () => {
    it("deve omitir minutos quando forem 0", () => {
      expect(formatHoursBadge(8)).toBe("8h");
      expect(formatHoursBadge(36)).toBe("36h");
    });

    it("deve exibir minutos quando existirem", () => {
      expect(formatHoursBadge(36.4167)).toBe("36h:25m");
      expect(formatHoursBadge(8.5)).toBe("8h:30m");
      expect(formatHoursBadge(0.75)).toBe("0h:45m");
    });
  });

  describe("Cálculo de Desvio (Variance)", () => {
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
        estimated_hours: 36.4167,
        actual_hours: 36.4167,
        assignee_id: null,
        assignee_name: null,
        assignee_status: null,
        position: 0,
        parent_task_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      expect(task.actual_hours).toBe(36.4167);
      expect(formatHoursBadge(task.actual_hours)).toBe("36h:25m");
      expect(task.status).toBe("done");
    });
  });
});
