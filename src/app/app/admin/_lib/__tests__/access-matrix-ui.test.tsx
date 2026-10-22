import "@testing-library/jest-dom";
import * as React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-notification";
import type { AccessOverview } from "@/lib/access/types";
import { AccessMatrix } from "../../_components/AccessMatrix";
import { useAccessAdmin } from "../useAccessAdmin";
import { applyProjectMemberChange } from "../access-matrix";
import { makeOverview } from "../__fixtures__/overview";

jest.mock("next/link", () => {
  const Link = ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  Link.displayName = "Link";
  return Link;
});

// jsdom não implementa APIs usadas pelo Radix Select
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit?]>;

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

/** fetch falso: GET devolve `state.overview`; POST responde `postResponse`. */
function mockFetch(state: { overview: AccessOverview }, postResponse: () => Response) {
  const fn: FetchMock = jest.fn(async (url: string, init?: RequestInit) => {
    if (!init || !init.method || init.method === "GET") return jsonResponse(state.overview);
    return postResponse();
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

function Harness() {
  const admin = useAccessAdmin("ws1");
  if (admin.error) return <p>{admin.error}</p>;
  if (!admin.overview) return <p>Carregando</p>;
  return (
    <AccessMatrix
      overview={admin.overview}
      pendingKeys={admin.pendingKeys}
      onChangeProjectMember={admin.changeProjectMember}
      onChangeWorkspaceRole={(user_id, role) => admin.changeWorkspaceMember({ user_id, role })}
      onRemoveMember={(user_id) => admin.changeWorkspaceMember({ user_id, role: null })}
    />
  );
}

async function renderMatrix() {
  render(
    <ToastProvider>
      <Harness />
    </ToastProvider>
  );
  await screen.findByRole("table");
}

function rowOf(name: string) {
  return screen.getByRole("rowheader", { name: new RegExp(name) }).closest("tr") as HTMLElement;
}

async function pick(trigger: HTMLElement, optionName: string) {
  await act(async () => {
    fireEvent.keyDown(trigger, { key: "Enter" });
  });
  const option = await screen.findByRole("option", { name: optionName });
  await act(async () => {
    fireEvent.keyDown(option, { key: "Enter" });
  });
}

const postCalls = (fn: FetchMock) => fn.mock.calls.filter(([, init]) => init?.method === "POST");

afterEach(() => {
  jest.restoreAllMocks();
});

describe("AccessMatrix", () => {
  it("carrega o overview do workspace e mostra células somente leitura para admins e dono", async () => {
    const fetchMock = mockFetch({ overview: makeOverview() }, () => jsonResponse({ ok: true }));
    await renderMatrix();

    expect(fetchMock).toHaveBeenCalledWith("/api/access/overview?workspace_id=ws1", expect.anything());

    // Cabeçalhos: projetos ativos; arquivado oculto por padrão
    expect(screen.getByRole("columnheader", { name: /Fechamento Mensal/ })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: /Legado/ })).not.toBeInTheDocument();

    // Dono do workspace: "Admin (todos)" sem Select
    const owner = rowOf("Olga Dona");
    expect(within(owner).getAllByText("Admin (todos)")).toHaveLength(2);
    expect(screen.queryByRole("combobox", { name: /Acesso de Olga Dona/ })).not.toBeInTheDocument();

    // Criador do projeto: "Dono" sem Select naquele projeto, Select no outro
    expect(within(rowOf("Mário Membro")).getByText("Dono")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Acesso de Mário Membro ao projeto Fechamento Mensal" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Acesso de Mário Membro ao projeto Orçamento 2027" })).toBeInTheDocument();

    // Próprio papel: Select e remoção bloqueados
    expect(screen.getByRole("combobox", { name: "Papel de Ana Admin no workspace" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remover Ana Admin do workspace" })).toBeDisabled();

    // Mostrar arquivados
    fireEvent.click(screen.getByLabelText(/Mostrar arquivados/));
    expect(screen.getByRole("columnheader", { name: /Legado/ })).toBeInTheDocument();
  });

  it("alterar uma célula envia o ProjectMemberChange e relê o servidor", async () => {
    const state = { overview: makeOverview() };
    const fetchMock = mockFetch(state, () => {
      // Servidor aplica a mudança: a releitura já vem atualizada
      state.overview = applyProjectMemberChange(state.overview, {
        workspace_id: "ws1",
        project_id: "p2",
        user_id: "u-view",
        role: "member",
      });
      return jsonResponse({ ok: true });
    });
    await renderMatrix();

    const trigger = screen.getByRole("combobox", { name: "Acesso de Vera Leitura ao projeto Orçamento 2027" });
    expect(trigger).toHaveTextContent("Sem acesso");
    await pick(trigger, "Membro");

    const posts = postCalls(fetchMock);
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toBe("/api/access/project-member");
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual({
      workspace_id: "ws1",
      project_id: "p2",
      user_id: "u-view",
      role: "member",
    });

    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Acesso de Vera Leitura ao projeto Orçamento 2027" })).toHaveTextContent("Membro")
    );
    // Releitura após o sucesso
    await waitFor(() => expect(fetchMock.mock.calls.filter(([, i]) => !i?.method)).toHaveLength(2));
  });

  it("revogar envia role null", async () => {
    const fetchMock = mockFetch({ overview: makeOverview() }, () => jsonResponse({ ok: true }));
    await renderMatrix();

    await pick(screen.getByRole("combobox", { name: "Acesso de Mário Membro ao projeto Orçamento 2027" }), "Sem acesso");
    expect(JSON.parse(String(postCalls(fetchMock)[0][1]?.body))).toMatchObject({ user_id: "u-mem", project_id: "p2", role: null });
  });

  it("desfaz a mudança otimista e mostra o erro do servidor quando a API recusa", async () => {
    let release: (r: Response) => void = () => {};
    mockFetch({ overview: makeOverview() }, () => new Promise<Response>((resolve) => (release = resolve)) as unknown as Response);
    await renderMatrix();

    const name = "Acesso de Vera Leitura ao projeto Orçamento 2027";
    await pick(screen.getByRole("combobox", { name }), "Admin");
    // Otimista: já mostra o novo valor enquanto a API responde
    expect(screen.getByRole("combobox", { name })).toHaveTextContent("Admin");

    await act(async () => {
      release(jsonResponse({ error: "Sem permissão para este projeto" }, 403));
    });

    expect(await screen.findByText("Sem permissão para este projeto")).toBeInTheDocument();
    expect(screen.getByText("Não foi possível alterar o acesso")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name })).toHaveTextContent("Sem acesso");
  });

  it("mostra aviso para membro com papel Leitura no workspace com papel de edição no projeto", async () => {
    mockFetch({ overview: makeOverview() }, () => jsonResponse({ ok: true }));
    await renderMatrix();
    const vera = rowOf("Vera Leitura");
    expect(within(vera).getByText(/somente leitura/)).toBeInTheDocument();
  });
});
