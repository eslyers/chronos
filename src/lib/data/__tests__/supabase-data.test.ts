/**
 * @jest-environment node
 */
// Cliente Supabase falso: guarda as chamadas e responde com linhas em memória
type Row = Record<string, unknown>;
type Call = { table: string; op: string; filters: Array<[string, unknown[]]>; range?: [number, number] };

const db: Record<string, Row[]> = {};
const calls: Call[] = [];
let failWith: { message: string; code?: string } | null = null;

function query(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  const matches = () =>
    (db[table] ?? []).filter((r) => call.filters.every(([col, values]) => values.includes(r[col])));
  const result = () => {
    calls.push(call);
    if (failWith) return { data: null, error: failWith };
    if (!call.range) return { data: matches(), error: null };
    const [from, to] = call.range;
    return { data: matches().slice(from, to + 1), error: null };
  };
  const q: Record<string, unknown> = {
    select: () => q,
    order: () => q,
    in: (col: string, values: unknown[]) => (call.filters.push([col, values]), q),
    eq: (col: string, value: unknown) => (call.filters.push([col, [value]]), q),
    range: (from: number, to: number) => ((call.range = [from, to]), q),
    update: () => ((call.op = "update"), q),
    delete: () => ((call.op = "delete"), q),
    then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve, reject),
  };
  return q;
}

jest.mock("@/lib/supabase/client", () => ({
  createSPAClient: () => ({ from: (table: string) => query(table) }),
}));

import {
  fetchAllTasks,
  fetchAllDependencies,
  updateTask,
  deleteStage,
  DataLayerError,
} from "../supabase-data";

const task = (i: number, projectId: string) => ({
  id: `t${i}`,
  project_id: projectId,
  stage_id: "s1",
  title: `Task ${i}`,
  description: null,
  priority: "medium",
  status: "todo",
  progress: 0,
  start_date: null,
  due_date: null,
  assignee_id: null,
  position: 0,
  created_at: "",
  updated_at: "",
});

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  calls.length = 0;
  failWith = null;
});

describe("supabase-data reads", () => {
  it("paginates past the 1000-row PostgREST limit", async () => {
    db.tasks = Array.from({ length: 2500 }, (_, i) => task(i, "p1"));
    const tasks = await fetchAllTasks(["p1"]);
    expect(tasks).toHaveLength(2500);
    expect(calls.filter((c) => c.table === "tasks").map((c) => c.range)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("splits long id lists into chunks instead of one huge .in()", async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `t${i}`);
    db.task_dependencies = ids.map((id, i) => ({
      id: `d${i}`,
      task_id: id,
      depends_on_task_id: "t0",
      dependency_type: "FS",
    }));
    const deps = await fetchAllDependencies(ids);
    expect(deps).toHaveLength(250);
    const sizes = calls.map((c) => (c.filters[0][1] as unknown[]).length);
    expect(sizes).toEqual([100, 100, 50]);
  });

  it("throws instead of returning an empty list when the query fails", async () => {
    failWith = { message: "permission denied", code: "42501" };
    await expect(fetchAllTasks(["p1"])).rejects.toBeInstanceOf(DataLayerError);
  });
});

describe("supabase-data writes", () => {
  it("throws when an update fails, so the UI cannot show it as saved", async () => {
    failWith = { message: "new row violates row-level security policy", code: "42501" };
    await expect(updateTask("t1", { title: "x" })).rejects.toThrow("row-level security");
  });

  it("moves the stage's tasks before deleting it", async () => {
    await deleteStage("s1", "s2");
    expect(calls.map((c) => [c.table, c.op])).toEqual([
      ["tasks", "update"],
      ["stages", "delete"],
    ]);
    expect(calls[0].filters).toEqual([["stage_id", ["s1"]]]);
  });
});
