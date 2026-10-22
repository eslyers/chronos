import {
  applyProjectAction,
  applyProjectMemberChange,
  applyWorkspaceMemberChange,
  buildCell,
  buildMatrix,
  callerContext,
  cellValueToRole,
  countPeopleWithAccess,
  filterMembers,
  matchesMember,
  ownerOptions,
  visibleProjects,
  workspaceRoleControl,
} from "../access-matrix";
import { makeOverview } from "../__fixtures__/overview";

const overview = makeOverview();
const caller = callerContext(overview);
const member = (id: string) => overview.members.find((m) => m.user_id === id)!;
const project = (id: string) => overview.projects.find((p) => p.id === id)!;

describe("colunas e linhas da matriz", () => {
  it("oculta arquivados por padrão e ordena projetos por nome", () => {
    const m = buildMatrix(overview, { query: "", showArchived: false });
    expect(m.columns.map((c) => c.project.name)).toEqual(["Fechamento Mensal", "Orçamento 2027"]);
    expect(m.hiddenArchived).toBe(1);

    const all = buildMatrix(overview, { query: "", showArchived: true });
    expect(all.columns.map((c) => c.project.id)).toEqual(["p1", "p3", "p2"]);
    expect(all.hiddenArchived).toBe(0);
  });

  it("ordena membros por papel e depois por nome, marcando o próprio usuário", () => {
    const m = buildMatrix(overview, { query: "", showArchived: false });
    expect(m.rows.map((r) => r.member.user_id)).toEqual(["u-owner", "u-admin", "u-mem", "u-master", "u-view"]);
    expect(m.rows.find((r) => r.isSelf)?.member.user_id).toBe("u-admin");
    expect(m.rows[0].cells).toHaveLength(2);
  });

  it("busca por nome ou e-mail sem diferenciar acentos e maiúsculas", () => {
    expect(matchesMember(member("u-mem"), "MARIO")).toBe(true);
    expect(matchesMember(member("u-mem"), "mario@ex")).toBe(true);
    expect(matchesMember(member("u-mem"), "vera")).toBe(false);
    expect(filterMembers(overview.members, "  ").length).toBe(5);
    expect(buildMatrix(overview, { query: "master@", showArchived: false }).rows).toHaveLength(1);
  });

  it("visibleProjects não altera a lista original", () => {
    const before = overview.projects.map((p) => p.id);
    visibleProjects(overview.projects, true);
    expect(overview.projects.map((p) => p.id)).toEqual(before);
  });
});

describe("células", () => {
  it("dono e admin do workspace: Admin (todos), somente leitura", () => {
    for (const id of ["u-owner", "u-admin"]) {
      const cell = buildCell(caller, member(id), project("p1"), overview.grants);
      expect(cell.kind).toBe("workspace-admin");
      if (cell.kind === "workspace-admin") {
        expect(cell.label).toBe("Admin (todos)");
        expect(cell.reason).toMatch(/todos os projetos/);
      }
    }
  });

  it("criador do projeto: Dono, somente leitura", () => {
    const cell = buildCell(caller, member("u-mem"), project("p1"), overview.grants);
    expect(cell).toMatchObject({ kind: "owner", label: "Dono" });
  });

  it("concessão ou ausência dela: Select editável", () => {
    expect(buildCell(caller, member("u-mem"), project("p2"), overview.grants)).toEqual({
      kind: "editable",
      value: "member",
      viewerWarning: false,
      disabledReason: null,
    });
    expect(buildCell(caller, member("u-master"), project("p2"), overview.grants)).toMatchObject({
      kind: "editable",
      value: "none",
    });
  });

  it("membro com papel Leitura no workspace recebe aviso", () => {
    expect(buildCell(caller, member("u-view"), project("p1"), overview.grants)).toMatchObject({
      kind: "editable",
      value: "admin",
      viewerWarning: true,
    });
  });

  it("chamador sem permissão vê a célula bloqueada com o motivo", () => {
    const plain = { role: "member" as const, isMasterAdmin: false };
    const cell = buildCell(plain, member("u-view"), project("p2"), overview.grants);
    expect(cell).toMatchObject({ kind: "editable", disabledReason: expect.stringMatching(/administradores/) });
  });

  it("mapeia o valor da célula para o papel do contrato", () => {
    expect(cellValueToRole("none")).toBeNull();
    expect(cellValueToRole("viewer")).toBe("viewer");
    expect(cellValueToRole("admin")).toBe("admin");
  });
});

describe("contagem de pessoas com acesso", () => {
  it("conta admins do workspace, dono do projeto e concessões", () => {
    // p1: dono + admin do workspace + criador (u-mem) + concessão (u-view)
    expect(countPeopleWithAccess(project("p1"), overview.members, overview.grants)).toBe(4);
    // p2: dono + admin (u-owner é também o criador) + concessão (u-mem)
    expect(countPeopleWithAccess(project("p2"), overview.members, overview.grants)).toBe(3);
    // p3: sem dono e sem concessões
    expect(countPeopleWithAccess(project("p3"), overview.members, overview.grants)).toBe(2);
  });
});

describe("papel no workspace", () => {
  it("não permite alterar o próprio papel nem se remover", () => {
    const c = workspaceRoleControl(caller, member("u-admin"), true, 1);
    expect(c.disabledReason).toMatch(/próprio papel/);
    expect(c.removeDisabledReason).toMatch(/próprio papel/);
  });

  it("admin não mexe em dono, mas ajusta membros (sem promover a dono)", () => {
    const onOwner = workspaceRoleControl(caller, member("u-owner"), false, 1);
    expect(onOwner.disabledReason).toMatch(/dono/);
    expect(onOwner.removeDisabledReason).toMatch(/dono/);

    const onMember = workspaceRoleControl(caller, member("u-mem"), false, 1);
    expect(onMember.disabledReason).toBeNull();
    expect(onMember.removeDisabledReason).toBeNull();
    const byRole = Object.fromEntries(onMember.options.map((o) => [o.role, o.disabledReason]));
    expect(byRole.owner).toMatch(/dono/);
    expect(byRole.admin).toBeNull();
    expect(byRole.member).toBeNull();
    expect(byRole.viewer).toBeNull();
  });

  it("protege o último dono", () => {
    const ownerCaller = { role: "owner" as const, isMasterAdmin: false };
    const last = workspaceRoleControl(ownerCaller, member("u-owner"), false, 1);
    expect(last.disabledReason).toMatch(/ao menos um dono/);
    expect(last.removeDisabledReason).toMatch(/ao menos um dono/);
    expect(workspaceRoleControl(ownerCaller, member("u-owner"), false, 2).disabledReason).toBeNull();
  });
});

describe("dono do projeto", () => {
  it("oferece membros elegíveis (sem Leitura) e mantém o dono atual", () => {
    const ids = ownerOptions(caller, project("p1"), overview.members).map((o) => o.user_id);
    expect(ids).toEqual(["u-owner", "u-admin", "u-mem", "u-master"]);
    expect(ids).not.toContain("u-view");
  });
});

describe("mudanças otimistas", () => {
  it("concede, altera e revoga acesso a projeto", () => {
    const base = { workspace_id: "ws1", project_id: "p2", user_id: "u-view" };
    const granted = applyProjectMemberChange(overview, { ...base, role: "viewer" });
    expect(granted.grants).toContainEqual({ project_id: "p2", user_id: "u-view", role: "viewer" });

    const changed = applyProjectMemberChange(granted, { ...base, role: "admin" });
    expect(changed.grants.filter((g) => g.project_id === "p2" && g.user_id === "u-view")).toEqual([
      { project_id: "p2", user_id: "u-view", role: "admin" },
    ]);

    const revoked = applyProjectMemberChange(changed, { ...base, role: null });
    expect(revoked.grants.some((g) => g.project_id === "p2" && g.user_id === "u-view")).toBe(false);
    // Não muta o original
    expect(overview.grants).toHaveLength(2);
  });

  it("altera papel e remove membro do workspace (com suas concessões)", () => {
    const promoted = applyWorkspaceMemberChange(overview, { workspace_id: "ws1", user_id: "u-mem", role: "admin" });
    expect(promoted.members.find((m) => m.user_id === "u-mem")?.role).toBe("admin");

    const removed = applyWorkspaceMemberChange(overview, { workspace_id: "ws1", user_id: "u-view", role: null });
    expect(removed.members.some((m) => m.user_id === "u-view")).toBe(false);
    expect(removed.grants.some((g) => g.user_id === "u-view")).toBe(false);
  });

  it("arquiva, reativa, transfere e exclui projeto", () => {
    const ws = "ws1";
    const archived = applyProjectAction(overview, { workspace_id: ws, project_id: "p1", action: "archive" });
    expect(archived.projects.find((p) => p.id === "p1")?.status).toBe("archived");
    const active = applyProjectAction(archived, { workspace_id: ws, project_id: "p1", action: "activate" });
    expect(active.projects.find((p) => p.id === "p1")?.status).toBe("active");

    const moved = applyProjectAction(overview, {
      workspace_id: ws,
      project_id: "p1",
      action: "transfer",
      new_owner_id: "u-admin",
    });
    expect(moved.projects.find((p) => p.id === "p1")?.created_by).toBe("u-admin");

    const deleted = applyProjectAction(overview, { workspace_id: ws, project_id: "p1", action: "delete" });
    expect(deleted.projects.some((p) => p.id === "p1")).toBe(false);
    expect(deleted.grants.some((g) => g.project_id === "p1")).toBe(false);
  });
});
