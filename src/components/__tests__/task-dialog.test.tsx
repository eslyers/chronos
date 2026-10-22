import * as React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { Stage, Task } from "@/lib/context/DataContext";

const createTask = jest.fn().mockResolvedValue({});
const updateTask = jest.fn().mockResolvedValue({});
const stages = [
  { id: "s1", name: "A Fazer" },
  { id: "s2", name: "Concluído", is_done: true },
] as unknown as Stage[];

const data = {
  createTask,
  updateTask,
  getProject: () => ({ id: "p1", track_time: true }),
  getStagesByProject: () => stages,
  getTasksByProject: () => [] as Task[],
  getTaskComments: jest.fn().mockResolvedValue([]),
  addTaskComment: jest.fn(),
  deleteTaskComment: jest.fn(),
  getTaskAttachments: jest.fn().mockResolvedValue([]),
  addTaskAttachment: jest.fn(),
  deleteTaskAttachment: jest.fn(),
  isProjectLoaded: () => true,
  loadProjectDetails: jest.fn().mockResolvedValue(undefined),
};

jest.mock("@/lib/context/DataContext", () => ({ useData: () => data }));
// Projeto sem workspace: lista de responsáveis vazia
jest.mock("@/lib/supabase/client", () => ({
  createSPAClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  }),
}));

import { TaskDialog } from "@/components/TaskDialog";

function task(extra: Partial<Task> = {}): Task {
  return {
    id: "t1",
    project_id: "p1",
    title: "Fechar balancete",
    status: "todo",
    priority: "medium",
    progress: 0,
    stage_id: "s1",
    ...extra,
  } as unknown as Task;
}

beforeEach(() => jest.clearAllMocks());

describe("TaskDialog", () => {
  it("não reseta o que foi digitado quando o pai re-renderiza com a mesma tarefa", async () => {
    const { rerender } = render(<TaskDialog open onOpenChange={jest.fn()} task={task()} projectId="p1" />);
    await act(async () => {});

    const title = screen.getByLabelText(/Título/) as HTMLInputElement;
    expect(title.value).toBe("Fechar balancete");
    fireEvent.change(title, { target: { value: "Editado" } });

    // Novo objeto com o mesmo id (ex.: refresh do DataContext)
    rerender(<TaskDialog open onOpenChange={jest.fn()} task={task({ title: "Do servidor" })} projectId="p1" />);
    await act(async () => {});
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe("Editado");

    // Outra tarefa reinicializa o formulário
    rerender(<TaskDialog open onOpenChange={jest.fn()} task={task({ id: "t2", title: "Outra" })} projectId="p1" />);
    await act(async () => {});
    expect((screen.getByLabelText(/Título/) as HTMLInputElement).value).toBe("Outra");
  });

  it("cria tarefa com payload normalizado e fecha após salvar", async () => {
    const onOpenChange = jest.fn();
    render(<TaskDialog open onOpenChange={onOpenChange} projectId="p1" defaultDueDate="2026-11-05" />);
    await act(async () => {});

    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: "  Conciliar bancos  " } });
    const est = screen.getByLabelText(/Horas Est/) as HTMLInputElement;
    fireEvent.change(est, { target: { value: "8x" } });
    expect(est.value).toBe("8");
    fireEvent.blur(est);
    expect(est.value).toBe("08h:00m");

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Criar Tarefa/ }));
    });

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Conciliar bancos",
        project_id: "p1",
        stage_id: "s1",
        due_date: "2026-11-05",
        estimated_hours: 8,
        actual_hours: null,
        status: "todo",
        priority: "medium",
      })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("tarefa concluída mostra horas reais e a variação contra o estimado", async () => {
    render(
      <TaskDialog
        open
        onOpenChange={jest.fn()}
        task={task({ progress: 100, status: "done", estimated_hours: 10, actual_hours: 8 })}
        projectId="p1"
      />
    );
    await act(async () => {});

    expect((screen.getByLabelText(/Horas Reais Gastas/) as HTMLInputElement).value).toBe("08h:00m");
    expect(screen.getByText(/2h a menos que o estimado \(20% economia\)/)).toBeTruthy();
    // Abas só aparecem em edição
    expect(screen.getByRole("button", { name: /Comentários \(0\)/ })).toBeTruthy();
  });

  it("responsável externo fica pendente e exibe o convite", async () => {
    render(<TaskDialog open onOpenChange={jest.fn()} projectId="p1" />);
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: /Sem cadastro/ }));
    fireEvent.change(screen.getByLabelText("Nome ou e-mail do responsável externo"), {
      target: { value: "roberto@empresa.com" },
    });
    expect(screen.getByText("roberto@empresa.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Convidar/ })).toBeTruthy();
  });
});
