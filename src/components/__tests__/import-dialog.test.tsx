import * as React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ImportPreview, ImportRow } from "@/lib/excel-parser";
import { ImportDialog } from "@/components/ImportDialog";

function row(index: number, status: ImportRow["status"], title: string): ImportRow {
  return {
    index,
    raw: { Tarefa: title },
    parsed: { title },
    warnings: status === "warning" ? ["Data não reconhecida"] : [],
    errors: status === "error" ? ["Título vazio"] : [],
    status,
  };
}

const preview: ImportPreview = {
  filename: "tarefas.xlsx",
  totalRows: 3,
  validRows: 1,
  warningRows: 1,
  errorRows: 1,
  columns: ["Tarefa"],
  mapping: { Tarefa: "title" },
  rows: [row(1, "valid", "Beta"), row(2, "error", ""), row(3, "warning", "Alfa")],
  hasWBS: false,
};

const fetchMock = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: typeof fetchMock }).fetch = fetchMock;
});
afterEach(() => jest.useRealTimers());

function jsonResponse(body: unknown) {
  return { ok: true, json: async () => body };
}

async function uploadFile() {
  fetchMock.mockResolvedValueOnce(jsonResponse({ preview }));
  const input = screen.getByLabelText("Arquivo da planilha");
  const file = new File(["x"], "tarefas.xlsx");
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
}

describe("ImportDialog", () => {
  it("rejeita extensão não suportada", async () => {
    render(<ImportDialog open onOpenChange={jest.fn()} projectId="p1" workspaceId="w1" />);
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Arquivo da planilha"), {
        target: { files: [new File(["x"], "notas.txt")] },
      });
    });
    expect(screen.getByText(/Formato .txt não suportado/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prévia: contadores, filtro, edição e seleção refletem no botão de importar", async () => {
    render(<ImportDialog open onOpenChange={jest.fn()} projectId="p1" workspaceId="w1" />);
    await uploadFile();

    // Seleção padrão: linhas sem erro
    expect(screen.getByRole("button", { name: /Importar 2 selecionadas/ })).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(4);

    // Filtro "Com erro" mostra só a linha 2
    fireEvent.click(screen.getByTitle(/linhas com erro/));
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("Filtro ativo:")).toBeTruthy();
    fireEvent.click(screen.getByText("(Limpar filtro)"));
    expect(screen.getAllByRole("row")).toHaveLength(4);

    // Corrigir o título da linha 2 e marcá-la: 3 importáveis, editadas e filtradas
    fireEvent.change(screen.getByLabelText("Título da linha 2"), { target: { value: "Gama" } });
    fireEvent.click(screen.getByLabelText("Selecionar linha 2"));
    expect(screen.getByRole("button", { name: /Importar 3 selecionadas \(editadas\) \(filtradas\)/ })).toBeTruthy();

    // Ordenação por título (asc)
    fireEvent.click(screen.getByRole("button", { name: /^Título/ }));
    const titles = screen.getAllByLabelText(/^Título da linha/).map((el) => (el as HTMLInputElement).value);
    expect(titles).toEqual(["Alfa", "Beta", "Gama"]);
  });

  it("importa e mostra o resumo; reset ao fechar após a animação", async () => {
    const onImported = jest.fn();
    const { rerender } = render(
      <ImportDialog open onOpenChange={jest.fn()} projectId="p1" workspaceId="w1" onImported={onImported} />
    );
    await uploadFile();

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ summary: { created: 2, skipped: 1, failed: 0, wbsLinked: 0 } })
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Importar 2 selecionadas/ }));
    });

    // Seleção padrão sem edições: envia o arquivo original
    const form = fetchMock.mock.calls[1][1].body as FormData;
    expect((form.get("file") as File).name).toBe("tarefas.xlsx");
    expect(form.get("dry_run")).toBe("false");
    expect(onImported).toHaveBeenCalledWith({ created: 2, skipped: 1 });
    expect(screen.getByText("Importação concluída!")).toBeTruthy();

    rerender(<ImportDialog open={false} onOpenChange={jest.fn()} projectId="p1" workspaceId="w1" onImported={onImported} />);
    rerender(<ImportDialog open onOpenChange={jest.fn()} projectId="p1" workspaceId="w1" onImported={onImported} />);
    // Reaberto antes de 200 ms: o timer de reset foi cancelado
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByText("Importação concluída!")).toBeTruthy();

    rerender(<ImportDialog open={false} onOpenChange={jest.fn()} projectId="p1" workspaceId="w1" onImported={onImported} />);
    act(() => {
      jest.advanceTimersByTime(300);
    });
    rerender(<ImportDialog open onOpenChange={jest.fn()} projectId="p1" workspaceId="w1" onImported={onImported} />);
    expect(screen.getByText("Arraste sua planilha aqui")).toBeTruthy();
  });
});
