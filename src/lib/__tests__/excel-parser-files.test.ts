/**
 * @jest-environment node
 */
// Leitura de arquivos reais (xlsx/ods/csv) com a versão atual do SheetJS.
// Protege a atualização do pacote: o parser tem um workaround escrito para
// o 0.18.5 e precisa continuar funcionando com versões novas.
import * as XLSX from "xlsx";
import { parseImportFile, buildPreview } from "../excel-parser";

function workbookBuffer(bookType: "xlsx" | "ods", rows: unknown[][]): Buffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Plano");
  return Buffer.from(XLSX.write(book, { type: "buffer", bookType }));
}

const ROWS = [
  ["Nível", "Tarefa", "Status", "Prazo"],
  [1, "Fechamento", "Concluído", "05/10/2026"],
  [2, "Conciliação", "Em andamento", "2026-10-07"],
];

describe("parseImportFile com arquivos reais", () => {
  it.each([
    ["xlsx", "plano.xlsx"],
    ["ods", "plano.ods"],
  ] as const)("lê um arquivo .%s e interpreta as colunas", async (bookType, filename) => {
    const parsed = await parseImportFile(workbookBuffer(bookType, ROWS), filename);
    expect(parsed.headers).toEqual(["Nível", "Tarefa", "Status", "Prazo"]);
    expect(parsed.rows).toHaveLength(2);

    const preview = buildPreview(parsed.rows, parsed.headers, filename, parsed.sheetName);
    expect(preview.rows[0].parsed.title).toBe("Fechamento");
    expect(preview.rows[0].parsed.status).toBe("done");
    expect(preview.rows[0].parsed.due_date).toBe("2026-10-05");
    expect(preview.rows[1].level).toBe(2);
    expect(preview.hasWBS).toBe(true);
  });

  it("lê um CSV", async () => {
    const csv = Buffer.from("Tarefa,Prazo\nRevisão,2026-10-09\n", "utf-8");
    const parsed = await parseImportFile(csv, "plano.csv");
    expect(parsed.rows).toHaveLength(1);
    expect(buildPreview(parsed.rows, parsed.headers, "plano.csv").rows[0].parsed.title).toBe("Revisão");
  });

  it("não deixa um objeto malicioso poluir o prototype ao ler a planilha", async () => {
    const sheet = XLSX.utils.aoa_to_sheet([["__proto__", "constructor"], ["polluted", "polluted"]]);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Plano");
    const buffer = Buffer.from(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));

    await parseImportFile(buffer, "malicioso.xlsx");

    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
  });
});
