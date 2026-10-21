/**
 * @jest-environment node
 */
import { buildPreview } from "../excel-parser";

describe("buildPreview", () => {
  it("keeps parsing columns that come after the Nível column", () => {
    const headers = ["Nível", "Tarefa", "Status", "Prazo"];
    const rows = [
      { "Nível": 1, Tarefa: "Fechamento", Status: "Concluído", Prazo: "05/10/2026" },
      { "Nível": "", Tarefa: "Conciliação", Status: "Em andamento", Prazo: "2026-10-07" },
    ];

    const preview = buildPreview(rows, headers, "plano.xlsx");

    expect(preview.rows[0].level).toBe(1);
    expect(preview.rows[0].parsed.title).toBe("Fechamento");
    expect(preview.rows[0].parsed.status).toBe("done");
    expect(preview.rows[0].parsed.due_date).toBe("2026-10-05");
    // Nível vazio não pode descartar as colunas seguintes
    expect(preview.rows[1].parsed.title).toBe("Conciliação");
    expect(preview.rows[1].parsed.due_date).toBe("2026-10-07");
  });

  it("does not accept impossible dates", () => {
    const preview = buildPreview([{ Tarefa: "X", Prazo: "31/02/2026" }], ["Tarefa", "Prazo"], "a.csv");
    expect(preview.rows[0].parsed.due_date ?? null).toBeNull();
  });
});
