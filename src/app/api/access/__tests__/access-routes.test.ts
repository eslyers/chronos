/**
 * @jest-environment node
 */
// Testes das rotas /api/access/* com um Supabase falso em memória.
import { NextRequest } from "next/server";
import { MASTER_ADMIN_EMAIL } from "@/lib/auth/master-admin";

type Row = Record<string, unknown>;
type Op = "select" | "update" | "delete" | "upsert";
interface Call {
  table: string;
  op: Op;
  inSizes: number[];
  range?: [number, number];
}

const db: Record<string, Row[]> = {};
const calls: Call[] = [];
let failOn: { table: string; op: Op } | null = null;
let sessionUser: { id: string; email: string } | null = null;
const authUsers: Record<string, { email: string; user_metadata?: Record<string, string> }> = {};

// Construtor de consultas encadeável (subconjunto do PostgREST usado pelas rotas)
function from(table: string) {
  const call: Call = { table, op: "select", inSizes: [] };
  const filters: Array<(r: Row) => boolean> = [];
  let values: Row | undefined;
  let opts: { count?: string; head?: boolean; onConflict?: string } | undefined;
  let single = false;
  let columns: string[] | undefined;
  // Devolve só as colunas pedidas no select, como o PostgREST
  const pick = (r: Row) => (columns ? Object.fromEntries(columns.map((c) => [c, r[c]])) : { ...r });

  const exec = () => {
    calls.push(call);
    if (failOn && failOn.table === table && failOn.op === call.op) {
      return { data: null, error: { message: "boom", code: "XX000" } };
    }
    const rows = (db[table] ??= []);
    const match = rows.filter((r) => filters.every((f) => f(r)));
    switch (call.op) {
      case "select": {
        if (opts?.head) return { data: null, count: match.length, error: null };
        if (single) return { data: match[0] ? pick(match[0]) : null, error: null };
        const data = call.range ? match.slice(call.range[0], call.range[1] + 1) : match;
        return { data: data.map(pick), error: null };
      }
      case "update":
        match.forEach((r) => Object.assign(r, values));
        return { data: null, error: null };
      case "delete":
        db[table] = rows.filter((r) => !match.includes(r));
        return { data: null, error: null };
      case "upsert": {
        const keys = (opts?.onConflict ?? "id").split(",");
        const existing = rows.find((r) => keys.every((k) => r[k] === values![k]));
        if (existing) Object.assign(existing, values);
        else rows.push({ ...values });
        return { data: null, error: null };
      }
    }
  };

  const q: Record<string, unknown> = {
    select: (cols?: string, o?: typeof opts) => {
      if (call.op === "select") {
        opts = o;
        columns = cols?.split(",").map((c) => c.trim());
      }
      return q;
    },
    eq: (col: string, v: unknown) => (filters.push((r) => r[col] === v), q),
    gt: (col: string, v: string) => (filters.push((r) => String(r[col]) > v), q),
    in: (col: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[col])), call.inSizes.push(vs.length), q),
    order: () => q,
    range: (a: number, b: number) => ((call.range = [a, b]), q),
    maybeSingle: () => ((single = true), q),
    update: (v: Row) => ((call.op = "update"), (values = v), q),
    delete: () => ((call.op = "delete"), q),
    upsert: (v: Row, o: typeof opts) => ((call.op = "upsert"), (values = v), (opts = o), q),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(exec()).then(resolve, reject),
  };
  return q;
}

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () =>
        sessionUser
          ? { data: { user: sessionUser }, error: null }
          : { data: { user: null }, error: { message: "Auth session missing" } },
    },
  }),
}));

jest.mock("@/lib/supabase/serverAdminClient", () => ({
  createServerAdminClient: async () => ({
    from,
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: { user: authUsers[id] ? { id, ...authUsers[id] } : null },
          error: null,
        }),
      },
    },
  }),
}));

import { GET as getOverview } from "../overview/route";
import { POST as postProjectMember } from "../project-member/route";
import { POST as postWorkspaceMember } from "../workspace-member/route";
import { POST as postProject } from "../project/route";

// ── Dados de exemplo ──
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const WS = uid(1);
const WS2 = uid(2);
const OWNER = uid(10);
const ADMIN = uid(11);
const MEMBER = uid(12);
const MEMBER2 = uid(13);
const VIEWER = uid(14);
const MASTER = uid(15);
const OUTSIDER = uid(16);
const P1 = uid(100);
const P2 = uid(101);
const P3 = uid(102);

const as = (id: string) => {
  sessionUser = { id, email: id === MASTER ? MASTER_ADMIN_EMAIL : `${id}@example.com` };
};

function seed() {
  for (const k of Object.keys(db)) delete db[k];
  for (const k of Object.keys(authUsers)) delete authUsers[k];
  calls.length = 0;
  failOn = null;
  db.workspaces = [
    { id: WS, name: "Beta", owner_id: OWNER },
    { id: WS2, name: "Alpha", owner_id: MEMBER },
  ];
  db.workspace_members = [
    { workspace_id: WS, user_id: OWNER, role: "owner", joined_at: "2026-01-01" },
    { workspace_id: WS, user_id: ADMIN, role: "admin", joined_at: "2026-01-02" },
    { workspace_id: WS, user_id: MEMBER, role: "member", joined_at: "2026-01-03" },
    { workspace_id: WS, user_id: MEMBER2, role: "member", joined_at: "2026-01-04" },
    { workspace_id: WS, user_id: VIEWER, role: "viewer", joined_at: "2026-01-05" },
    { workspace_id: WS2, user_id: MEMBER, role: "owner", joined_at: "2026-01-01" },
    { workspace_id: WS2, user_id: MASTER, role: "member", joined_at: "2026-01-02" },
  ];
  db.profiles = [OWNER, ADMIN, MEMBER, MEMBER2, VIEWER].map((id) => ({
    id,
    email: `${id}@example.com`,
    full_name: `User ${id.slice(-2)}`,
  }));
  db.profiles.push({ id: MASTER, email: MASTER_ADMIN_EMAIL, full_name: "Master" });
  db.projects = [
    { id: P1, workspace_id: WS, name: "P1", color: null, status: "active", created_by: MEMBER, created_at: "2026-02-01" },
    { id: P2, workspace_id: WS, name: "P2", color: "#f00", status: "on_hold", created_by: OWNER, created_at: "2026-02-02" },
    { id: P3, workspace_id: WS2, name: "P3", color: null, status: "active", created_by: MEMBER, created_at: "2026-02-03" },
  ];
  db.project_members = [
    { project_id: P1, user_id: MEMBER, role: "owner" },
    { project_id: P2, user_id: VIEWER, role: "viewer" },
    { project_id: P2, user_id: MEMBER, role: "member" },
    { project_id: P3, user_id: MEMBER, role: "owner" },
  ];
  db.invite_tokens = [
    { workspace_id: WS, email: "new@example.com", role: "member", status: "pending", expires_at: "2999-01-01T00:00:00.000Z" },
    { workspace_id: WS, email: "old@example.com", role: "member", status: "pending", expires_at: "2000-01-01T00:00:00.000Z" },
    { workspace_id: WS, email: "done@example.com", role: "admin", status: "accepted", expires_at: "2999-01-01T00:00:00.000Z" },
    { workspace_id: WS2, email: "other@example.com", role: "viewer", status: "pending", expires_at: "2999-01-01T00:00:00.000Z" },
  ];
}

const overview = (workspaceId: string) =>
  getOverview(new NextRequest(`http://localhost/api/access/overview?workspace_id=${workspaceId}`));

const post = (handler: (req: NextRequest) => Promise<Response>, body: unknown) =>
  handler(
    new NextRequest("http://localhost/api/access", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json" },
    })
  );

const grantsOf = (projectId: string) =>
  db.project_members.filter((g) => g.project_id === projectId).map((g) => [g.user_id, g.role]);
const wsRole = (workspaceId: string, userId: string) =>
  db.workspace_members.find((m) => m.workspace_id === workspaceId && m.user_id === userId)?.role;

beforeEach(() => {
  seed();
  as(ADMIN);
});

// ───────────────────────── GET /api/access/overview ─────────────────────────
describe("GET /api/access/overview", () => {
  it("401 sem sessão", async () => {
    sessionUser = null;
    const res = await overview(WS);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Não autenticado" });
  });

  it("403 para membro comum", async () => {
    as(MEMBER);
    const res = await overview(WS);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBeTruthy();
  });

  it("403 para quem não é membro do workspace", async () => {
    as(OUTSIDER);
    expect((await overview(WS)).status).toBe(403);
  });

  it("400 com workspace_id inválido", async () => {
    expect((await overview("nao-e-uuid")).status).toBe(400);
  });

  it("404 quando o workspace não existe (Master ADM)", async () => {
    as(MASTER);
    expect((await overview(uid(999))).status).toBe(404);
  });

  it("admin recebe membros, projetos, concessões e convites do workspace (sem lista de workspaces)", async () => {
    const res = await overview(WS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.workspace).toEqual({ id: WS, name: "Beta", owner_id: OWNER });
    expect(body.workspaces).toBeUndefined();
    expect(body.caller).toEqual({ user_id: ADMIN, role: "admin", is_master_admin: false });
    expect(body.members).toHaveLength(5);
    expect(body.members[0]).toEqual({
      user_id: OWNER,
      email: `${OWNER}@example.com`,
      full_name: "User 10",
      role: "owner",
      is_master_admin: false,
    });
    expect(body.projects.map((p: Row) => p.id)).toEqual([P1, P2]);
    expect(body.projects[1]).toEqual({
      id: P2,
      name: "P2",
      color: "#f00",
      status: "on_hold",
      created_by: OWNER,
      created_at: "2026-02-02",
    });
    expect(body.grants).toHaveLength(3);
    expect(body.grants.every((g: Row) => g.project_id !== P3)).toBe(true);
    expect(body.invites).toEqual([{ email: "new@example.com", role: "member", expires_at: "2999-01-01T00:00:00.000Z" }]);
  });

  it("Master ADM recebe todos os workspaces e administra um workspace do qual não é membro", async () => {
    as(MASTER);
    const res = await overview(WS);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.caller).toEqual({ user_id: MASTER, role: null, is_master_admin: true });
    expect(body.workspaces.map((w: Row) => w.id).sort()).toEqual([WS, WS2].sort());
  });

  it("marca is_master_admin pelo email do membro", async () => {
    as(MEMBER); // owner do WS2
    const body = await (await overview(WS2)).json();
    const master = body.members.find((m: Row) => m.user_id === MASTER);
    expect(master.is_master_admin).toBe(true);
    expect(body.members.find((m: Row) => m.user_id === MEMBER).is_master_admin).toBe(false);
  });

  it("usa auth.users quando o perfil não tem email", async () => {
    db.profiles = db.profiles.filter((p) => p.id !== VIEWER);
    authUsers[VIEWER] = { email: "viewer@auth.com", user_metadata: { full_name: "Viewer Auth" } };
    const body = await (await overview(WS)).json();
    expect(body.members.find((m: Row) => m.user_id === VIEWER)).toMatchObject({
      email: "viewer@auth.com",
      full_name: "Viewer Auth",
    });
  });

  it("pagina com .range() e divide o .in() de projetos em lotes de 100", async () => {
    for (let i = 0; i < 1150; i++) {
      db.projects.push({ id: uid(10_000 + i), workspace_id: WS, name: `X${i}`, color: null, status: "active", created_by: OWNER, created_at: "2026-03-01" });
    }
    const body = await (await overview(WS)).json();
    expect(body.projects).toHaveLength(1152);
    const projectRanges = calls.filter((c) => c.table === "projects" && c.op === "select").map((c) => c.range);
    expect(projectRanges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    const grantChunks = calls.filter((c) => c.table === "project_members").map((c) => c.inSizes[0]);
    expect(grantChunks).toHaveLength(12);
    expect(Math.max(...grantChunks)).toBe(100);
    expect(grantChunks.reduce((a, b) => a + b, 0)).toBe(1152);
  });

  it("500 com mensagem genérica em erro de banco", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    failOn = { table: "projects", op: "select" };
    const res = await overview(WS);
    expect(res.status).toBe(500);
    expect((await res.json()).error).not.toContain("boom");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

// ─────────────────────── POST /api/access/project-member ───────────────────────
describe("POST /api/access/project-member", () => {
  const change = (body: Partial<Record<string, unknown>>) =>
    post(postProjectMember, { workspace_id: WS, project_id: P1, user_id: VIEWER, role: "member", ...body });

  it("401 sem sessão", async () => {
    sessionUser = null;
    expect((await change({})).status).toBe(401);
  });

  it("403 para membro comum", async () => {
    as(MEMBER);
    expect((await change({})).status).toBe(403);
    expect(grantsOf(P1)).toEqual([[MEMBER, "owner"]]);
  });

  it("concede acesso (upsert)", async () => {
    const res = await change({});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(grantsOf(P1)).toEqual([
      [MEMBER, "owner"],
      [VIEWER, "member"],
    ]);
  });

  it("altera o papel de uma concessão existente sem duplicar", async () => {
    expect((await change({ project_id: P2, role: "admin" })).status).toBe(200);
    expect(grantsOf(P2)).toEqual([
      [VIEWER, "admin"],
      [MEMBER, "member"],
    ]);
  });

  it("revoga o acesso quando role é null", async () => {
    expect((await change({ project_id: P2, role: null })).status).toBe(200);
    expect(grantsOf(P2)).toEqual([[MEMBER, "member"]]);
  });

  it("409 para admin do workspace e para o dono do projeto", async () => {
    expect((await change({ user_id: ADMIN })).status).toBe(409);
    expect((await change({ user_id: MEMBER, role: "viewer" })).status).toBe(409);
    expect(grantsOf(P1)).toEqual([[MEMBER, "owner"]]);
  });

  it("409 quando o usuário não é membro do workspace", async () => {
    expect((await change({ user_id: OUTSIDER })).status).toBe(409);
  });

  it("404 para projeto de outro workspace", async () => {
    const res = await change({ project_id: P3 });
    expect(res.status).toBe(404);
    expect(grantsOf(P3)).toEqual([[MEMBER, "owner"]]);
  });

  it("400 para papel 'owner' ou corpo inválido", async () => {
    expect((await change({ role: "owner" })).status).toBe(400);
    expect((await change({ project_id: "x" })).status).toBe(400);
    expect((await post(postProjectMember, "{nao-json")).status).toBe(400);
  });
});

// ────────────────────── POST /api/access/workspace-member ──────────────────────
describe("POST /api/access/workspace-member", () => {
  const change = (body: Partial<Record<string, unknown>>) =>
    post(postWorkspaceMember, { workspace_id: WS, user_id: MEMBER, role: "viewer", ...body });

  it("401 sem sessão", async () => {
    sessionUser = null;
    expect((await change({})).status).toBe(401);
  });

  it("403 para membro comum", async () => {
    as(MEMBER2);
    expect((await change({})).status).toBe(403);
    expect(wsRole(WS, MEMBER)).toBe("member");
  });

  it("admin altera o papel de um membro", async () => {
    const res = await change({});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(wsRole(WS, MEMBER)).toBe("viewer");
  });

  it("admin não pode mexer no papel de dono (409)", async () => {
    const demote = await change({ user_id: OWNER, role: "member" });
    expect(demote.status).toBe(409);
    expect((await demote.json()).error).toMatch(/dono/);
    expect((await change({ role: "owner" })).status).toBe(409);
    expect((await change({ user_id: OWNER, role: null })).status).toBe(409);
    expect(wsRole(WS, OWNER)).toBe("owner");
    expect(wsRole(WS, MEMBER)).toBe("member");
  });

  it("ninguém altera o próprio papel (409)", async () => {
    as(OWNER);
    expect((await change({ user_id: OWNER, role: "admin" })).status).toBe(409);
    as(ADMIN);
    expect((await change({ user_id: ADMIN, role: null })).status).toBe(409);
    expect(wsRole(WS, ADMIN)).toBe("admin");
  });

  it("o workspace mantém ao menos um dono (409)", async () => {
    as(MASTER);
    expect((await change({ user_id: OWNER, role: "admin" })).status).toBe(409);
    expect(wsRole(WS, OWNER)).toBe("owner");
  });

  it("dono promove outro membro a dono", async () => {
    as(OWNER);
    expect((await change({ role: "owner" })).status).toBe(200);
    expect(wsRole(WS, MEMBER)).toBe("owner");
  });

  it("remover do workspace apaga também as concessões nos projetos do workspace", async () => {
    const res = await change({ role: null });
    expect(res.status).toBe(200);
    expect(wsRole(WS, MEMBER)).toBeUndefined();
    expect(db.project_members.filter((g) => g.user_id === MEMBER).map((g) => g.project_id)).toEqual([P3]);
    // Vínculos com outros workspaces ficam intactos
    expect(wsRole(WS2, MEMBER)).toBe("owner");
  });

  it("Master ADM administra workspace do qual não é membro", async () => {
    as(MASTER);
    expect((await change({ user_id: OWNER, role: null })).status).toBe(409); // último dono
    expect((await change({ user_id: ADMIN, role: "owner" })).status).toBe(200);
    expect(wsRole(WS, ADMIN)).toBe("owner");
    expect((await change({ user_id: OWNER, role: "member" })).status).toBe(200);
    expect(wsRole(WS, OWNER)).toBe("member");
  });

  it("404 quando o alvo não é membro do workspace", async () => {
    expect((await change({ user_id: OUTSIDER })).status).toBe(404);
  });

  it("400 para papel inválido", async () => {
    expect((await change({ role: "superuser" })).status).toBe(400);
  });
});

// ───────────────────────── POST /api/access/project ─────────────────────────
describe("POST /api/access/project", () => {
  const act = (body: Partial<Record<string, unknown>>) =>
    post(postProject, { workspace_id: WS, project_id: P1, action: "archive", ...body });
  const project = (id: string) => db.projects.find((p) => p.id === id);

  it("401 sem sessão e 403 para membro comum", async () => {
    sessionUser = null;
    expect((await act({})).status).toBe(401);
    as(MEMBER);
    expect((await act({})).status).toBe(403);
    expect(project(P1)?.status).toBe("active");
  });

  it("arquiva e reativa", async () => {
    expect((await act({})).status).toBe(200);
    expect(project(P1)?.status).toBe("archived");
    expect((await act({ action: "activate" })).status).toBe(200);
    expect(project(P1)?.status).toBe("active");
  });

  it("exclui somente projetos do workspace informado", async () => {
    const other = await act({ project_id: P3, action: "delete" });
    expect(other.status).toBe(404);
    expect(project(P3)).toBeDefined();

    const res = await act({ action: "delete" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(project(P1)).toBeUndefined();
    expect(project(P2)).toBeDefined();
  });

  it("transfere: atualiza created_by, concede 'owner' ao novo dono e rebaixa o anterior para 'admin'", async () => {
    const res = await act({ action: "transfer", new_owner_id: MEMBER2 });
    expect(res.status).toBe(200);
    expect(project(P1)?.created_by).toBe(MEMBER2);
    expect(grantsOf(P1)).toEqual([
      [MEMBER, "admin"],
      [MEMBER2, "owner"],
    ]);
  });

  it("transfere projeto sem dono anterior", async () => {
    project(P2)!.created_by = null;
    expect((await act({ project_id: P2, action: "transfer", new_owner_id: MEMBER2 })).status).toBe(200);
    expect(project(P2)?.created_by).toBe(MEMBER2);
    expect(grantsOf(P2)).toContainEqual([MEMBER2, "owner"]);
  });

  it("transferência inválida retorna 409 sem alterar nada", async () => {
    expect((await act({ action: "transfer", new_owner_id: VIEWER })).status).toBe(409);
    expect((await act({ action: "transfer", new_owner_id: OUTSIDER })).status).toBe(409);
    expect((await act({ action: "transfer", new_owner_id: MEMBER })).status).toBe(409);
    expect(project(P1)?.created_by).toBe(MEMBER);
    expect(grantsOf(P1)).toEqual([[MEMBER, "owner"]]);
  });

  it("400 para ação desconhecida ou transferência sem new_owner_id", async () => {
    const unknown = await act({ action: "explode" });
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toEqual({ error: "Ação inválida" });
    const missing = await act({ action: "transfer" });
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ error: "Identificador obrigatório" });
  });

  it("500 com mensagem genérica quando o banco falha", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    failOn = { table: "projects", op: "delete" };
    const res = await act({ action: "delete" });
    expect(res.status).toBe(500);
    expect((await res.json()).error).not.toContain("boom");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
