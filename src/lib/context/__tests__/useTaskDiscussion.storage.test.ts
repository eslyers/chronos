import { renderHook } from "@testing-library/react";

// Supabase falso: tabela task_attachments + Storage em memória
const storage = {
  upload: jest.fn(),
  remove: jest.fn(),
  createSignedUrls: jest.fn(),
};
const table = {
  insertResult: { data: null as unknown, error: null as null | { message: string } },
  deleteResult: { data: [] as unknown[], error: null as null | { message: string } },
  selectRows: [] as unknown[],
  inserted: [] as Record<string, unknown>[],
};

jest.mock("@/lib/data/data-provider", () => ({ getDataLayer: () => "supabase" }));
jest.mock("@/lib/supabase/client", () => ({
  createSPAClient: () => ({
    storage: { from: () => storage },
    from: () => ({
      select: () => ({
        eq: () => ({ order: async () => ({ data: table.selectRows, error: null }) }),
      }),
      insert: (row: Record<string, unknown>) => {
        table.inserted.push(row);
        return { select: () => ({ single: async () => table.insertResult }) };
      },
      delete: () => ({ eq: () => ({ select: async () => table.deleteResult }) }),
    }),
  }),
}));

import { useTaskDiscussion } from "../useTaskDiscussion";

const reportError = jest.fn((_title: string, err: unknown) => {
  throw err;
}) as unknown as (title: string, err: unknown) => never;

function setup() {
  return renderHook(() => useTaskDiscussion("user-1", reportError)).result.current;
}

const file = (size = 3) => ({ name: "Relatório.pdf", size, type: "application/pdf", file: new Blob(["abc"]) });

beforeEach(() => {
  jest.clearAllMocks();
  table.inserted = [];
  table.insertResult = { data: { id: "a1" }, error: null };
  table.deleteResult = { data: [{ storage_path: "t1/x-Relatorio.pdf" }], error: null };
  storage.upload.mockResolvedValue({ error: null });
  storage.remove.mockResolvedValue({ error: null });
});

describe("anexos no Storage", () => {
  it("envia o arquivo para a pasta da tarefa e grava só o caminho", async () => {
    await setup().addTaskAttachment("t1", file());
    const [path, blob, opts] = storage.upload.mock.calls[0];
    expect(path).toMatch(/^t1\/[0-9a-f-]{36}-Relatorio\.pdf$/);
    expect(blob).toBeInstanceOf(Blob);
    expect(opts).toEqual({ contentType: "application/pdf", upsert: false });
    expect(table.inserted[0]).toMatchObject({ task_id: "t1", storage_path: path, file_name: "Relatório.pdf" });
    expect(table.inserted[0]).not.toHaveProperty("file_url");
  });

  it("remove o arquivo do bucket se o registro não puder ser gravado", async () => {
    table.insertResult = { data: null, error: { message: "new row violates row-level security policy" } };
    await expect(setup().addTaskAttachment("t1", file())).rejects.toThrow(/row-level security/);
    expect(storage.remove).toHaveBeenCalledWith([storage.upload.mock.calls[0][0]]);
  });

  it("recusa arquivo acima de 10 MB sem enviar nada", async () => {
    await expect(setup().addTaskAttachment("t1", file(11 * 1024 * 1024))).rejects.toThrow(/limite é 10 MB/);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it("lista com links assinados e mantém anexos antigos em data URL", async () => {
    table.selectRows = [
      { id: "a1", storage_path: "t1/u-a.pdf", file_url: null },
      { id: "a2", storage_path: null, file_url: "data:application/pdf;base64,AAA" },
    ];
    storage.createSignedUrls.mockResolvedValue({ data: [{ path: "t1/u-a.pdf", signedUrl: "https://x/sign/a" }], error: null });
    const list = await setup().getTaskAttachments("t1");
    expect(storage.createSignedUrls).toHaveBeenCalledWith(["t1/u-a.pdf"], 3600);
    expect(list.map((a) => a.file_url)).toEqual(["https://x/sign/a", "data:application/pdf;base64,AAA"]);
  });

  it("exclui o registro e depois o arquivo", async () => {
    await setup().deleteTaskAttachment("a1");
    expect(storage.remove).toHaveBeenCalledWith(["t1/x-Relatorio.pdf"]);
  });

  it("não remove arquivo quando a exclusão do registro é negada", async () => {
    table.deleteResult = { data: [], error: null };
    await expect(setup().deleteTaskAttachment("a1")).rejects.toThrow(/sem permissão/);
    expect(storage.remove).not.toHaveBeenCalled();
  });
});
