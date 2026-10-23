// ─────────────────────────────────────────────────────────────
// CHRONOS — Testes de RLS
// Aplica todas as migrations num Postgres em memória (PGlite), com stubs
// mínimos de auth/net do Supabase, e executa cenários de acesso/ataque.
// Uso: npm run test:rls
// ─────────────────────────────────────────────────────────────
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const migDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const files = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();

const db = new PGlite();

await db.exec(`
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (
    id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
  );
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
    $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
    $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  -- Publicação que o Supabase cria por padrão (usada pelo Realtime)
  CREATE PUBLICATION supabase_realtime;
  CREATE SCHEMA net;
  CREATE FUNCTION net.http_post(url text, headers jsonb DEFAULT '{}', body jsonb DEFAULT '{}',
    params jsonb DEFAULT '{}', timeout_milliseconds int DEFAULT 1000)
    RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
  -- 20260726000002 uses MIN(uuid), which core Postgres lacks
  CREATE FUNCTION public.uuid_smaller(a uuid, b uuid) RETURNS uuid LANGUAGE sql IMMUTABLE AS
    $$ SELECT CASE WHEN a < b THEN a ELSE b END $$;
  CREATE AGGREGATE public.min(uuid) (SFUNC = public.uuid_smaller, STYPE = uuid);
  GRANT USAGE ON SCHEMA public, auth, net TO anon, authenticated, service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
  GRANT SELECT ON auth.users TO service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
`);

// Produção divergiu do repositório: o schema foi aplicado por fora das
// migrations, com outros nomes de policies. Reproduz esse estado antes da
// migration de segurança, que precisa chegar ao mesmo resultado mesmo assim.
const PRODUCTION_DRIFT = `
  ALTER POLICY "Members can create projects" ON public.projects RENAME TO "Members create projects";
  ALTER POLICY "Members can view members" ON public.workspace_members RENAME TO "Members view members";
  ALTER POLICY "Public templates are visible to all" ON public.templates RENAME TO "Public templates visible";
  ALTER POLICY "Users can create workspace templates" ON public.templates RENAME TO "Users create templates";
  ALTER POLICY "Users can update own templates" ON public.templates RENAME TO "Users update own templates";
  ALTER POLICY "Users manage their own preferences" ON public.notification_subscribers RENAME TO "Users manage own prefs";
  ALTER POLICY "Members can view transitions" ON public.stage_transitions RENAME TO "Members view transitions";
  ALTER POLICY "Members can create transitions" ON public.stage_transitions RENAME TO "Members create transitions";
  -- policy permissiva extra, com nome que nenhuma migration conhece
  CREATE POLICY "Legacy open read" ON public.tasks FOR SELECT USING (true);
`;

for (const f of files) {
  if (f.startsWith("20261021000000")) await db.exec(PRODUCTION_DRIFT);
  let sql = fs.readFileSync(path.join(migDir, f), "utf8");
  // gen_random_uuid() is built in; pg_net is stubbed above
  sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS (pg_net|"pgcrypto");/g, "");
  try {
    await db.exec(sql);
  } catch (e) {
    console.log(`MIGRATION FAILED ${f}: ${e.message}`);
    process.exit(1);
  }
}
console.log(`applied ${files.length} migrations`);

// O conjunto final de policies é exatamente o esperado, sem sobras da divergência
{
  const rows = (await db.query(
    `SELECT tablename || ' | ' || policyname AS p FROM pg_policies
     WHERE schemaname = 'public' AND tablename IN ('invite_tokens','notification_subscribers','project_members','projects',
       'stage_transitions','stages','task_attachments','task_comments','task_dependencies','tasks','templates','workspace_members')
     ORDER BY 1`
  )).rows.map((r) => r.p);
  const expected = [
    "invite_tokens | Users can view own invites",
    "invite_tokens | Workspace admins manage invites",
    "notification_subscribers | Users manage their own preferences",
    "project_members | Admins manage project_members",
    "project_members | Members view project_members",
    "projects | Members can create projects",
    "projects | Members delete projects",
    "projects | Members update projects",
    "projects | Members view projects",
    "stage_transitions | Members create transitions",
    "stage_transitions | Members view transitions",
    "stages | Members delete stages",
    "stages | Members insert stages",
    "stages | Members update stages",
    "stages | Members view stages",
    "task_attachments | Project members add own attachments",
    "task_attachments | Project members view attachments",
    "task_attachments | Uploaders or admins delete attachments",
    "task_comments | Authors or admins delete comments",
    "task_comments | Project members add own comments",
    "task_comments | Project members view comments",
    "task_dependencies | Members delete deps",
    "task_dependencies | Members insert deps",
    "task_dependencies | Members update deps",
    "task_dependencies | Members view deps",
    "tasks | Members delete tasks",
    "tasks | Members insert tasks",
    "tasks | Members update tasks",
    "tasks | Members view tasks",
    "templates | Public templates are visible to all",
    "templates | Users can create workspace templates",
    "templates | Users can update own templates",
    "workspace_members | Admins manage workspace members",
    "workspace_members | Members can view members",
    "workspace_members | Workspace owner bootstraps membership",
  ];
  const extra = rows.filter((p) => !expected.includes(p));
  const missing = expected.filter((p) => !rows.includes(p));
  if (extra.length || missing.length) {
    console.log(`POLICY SET MISMATCH\n  extra: ${extra.join("; ")}\n  missing: ${missing.join("; ")}`);
    process.exit(1);
  }
  console.log(`policy set ok (${rows.length} policies, drift reconciled)`);
}

// ── helpers ──────────────────────────────────────────────────
const users = {
  alice: "a0000000-0000-0000-0000-000000000001", // owner of workspace A
  bob: "b0000000-0000-0000-0000-000000000002",   // member of A
  carol: "c0000000-0000-0000-0000-000000000003", // viewer of A
  dave: "d0000000-0000-0000-0000-000000000004",  // outsider
  erin: "e0000000-0000-0000-0000-000000000005",  // admin of A
};
const email = (n) => `${n}@test.dev`;

async function as(who, sql, params = []) {
  const uid = who && who !== "service" ? users[who] : "";
  await db.query(
    `SELECT set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false)`,
    [uid, uid ? JSON.stringify({ sub: uid, email: email(who) }) : ""]
  );
  const role = who === null ? null : who === "service" ? "service_role" : who === "anon" ? "anon" : "authenticated";
  if (role) await db.exec(`SET ROLE ${role}`);
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec("RESET ROLE");
  }
}
const sys = (sql, p) => as(null, sql, p);

let pass = 0, fail = 0;
async function expectRows(label, who, sql, n, params) {
  try {
    const r = await as(who, sql, params);
    const rows = r.rows.length || r.affectedRows || 0;
    if (rows === n) { pass++; console.log(`  ok   ${label}`); }
    else { fail++; console.log(`  FAIL ${label}: expected ${n} rows, got ${rows}`); }
    return r;
  } catch (e) {
    fail++; console.log(`  FAIL ${label}: unexpected error: ${e.message}`);
  }
}
async function expectDenied(label, who, sql, params) {
  try {
    const r = await as(who, sql, params);
    const rows = r.rows.length || r.affectedRows || 0;
    if (rows === 0) { pass++; console.log(`  ok   ${label} (0 rows)`); }
    else { fail++; console.log(`  FAIL ${label}: succeeded on ${rows} row(s)`); }
  } catch (e) {
    pass++; console.log(`  ok   ${label} (${e.message.split("\n")[0]})`);
  }
}

// ── fixtures ─────────────────────────────────────────────────
// Cada INSERT em auth.users passa pelo trigger handle_new_user (signup)
for (const [n, id] of Object.entries(users)) {
  await sys(`INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ($1, $2, '{}')`, [id, email(n)]);
}
const wsA = (await sys(`SELECT id FROM public.workspaces WHERE owner_id = $1`, [users.alice])).rows[0].id;
await sys(`INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES
  ($1, $2, 'member'), ($1, $3, 'viewer'), ($1, $4, 'admin')`, [wsA, users.bob, users.carol, users.erin]);
const p1 = (await sys(`INSERT INTO public.projects (workspace_id, name, created_by) VALUES ($1, 'P1 alice', $2) RETURNING id`, [wsA, users.alice])).rows[0].id;
const p2 = (await sys(`INSERT INTO public.projects (workspace_id, name, created_by) VALUES ($1, 'P2 bob', $2) RETURNING id`, [wsA, users.bob])).rows[0].id;
const s1 = (await sys(`INSERT INTO public.stages (project_id, name) VALUES ($1, 'To do') RETURNING id`, [p1])).rows[0].id;
const s2 = (await sys(`INSERT INTO public.stages (project_id, name) VALUES ($1, 'To do') RETURNING id`, [p2])).rows[0].id;
const t1 = (await sys(`INSERT INTO public.tasks (project_id, stage_id, title) VALUES ($1, $2, 'T1') RETURNING id`, [p1, s1])).rows[0].id;
const t2 = (await sys(`INSERT INTO public.tasks (project_id, stage_id, title) VALUES ($1, $2, 'T2') RETURNING id`, [p2, s2])).rows[0].id;
await sys(`INSERT INTO public.task_comments (task_id, user_id, user_name, content) VALUES ($1, $2, 'alice', 'secret')`, [t1, users.alice]);
await sys(`INSERT INTO public.task_attachments (task_id, user_id, file_name, file_url) VALUES ($1, $2, 'f.pdf', 'data:x')`, [t1, users.alice]);
const inv = (await sys(`INSERT INTO public.invite_tokens (workspace_id, email, role, invited_by) VALUES ($1, 'new@test.dev', 'admin', $2) RETURNING token`, [wsA, users.alice])).rows[0].token;

console.log("\n# Invite tokens");
await expectDenied("anon cannot list invite tokens", "anon", `SELECT * FROM public.invite_tokens`);
await expectDenied("outsider cannot list invite tokens", "dave", `SELECT * FROM public.invite_tokens`);
await expectDenied("authenticated cannot call accept_invite_token", "dave",
  `SELECT * FROM public.accept_invite_token($1, $2)`, [inv, users.dave]);
await expectDenied("service: token for another email is rejected", "service",
  `SELECT * FROM public.accept_invite_token($1, $2)`, [inv, users.dave]);

console.log("\n# Workspace members");
await expectDenied("viewer cannot promote self to owner", "carol",
  `UPDATE public.workspace_members SET role = 'owner' WHERE user_id = $1 AND workspace_id = $2 RETURNING 1`, [users.carol, wsA]);
await expectDenied("viewer cannot promote self to admin", "carol",
  `UPDATE public.workspace_members SET role = 'admin' WHERE user_id = $1 AND workspace_id = $2 RETURNING 1`, [users.carol, wsA]);
await expectDenied("member cannot change others' roles", "bob",
  `UPDATE public.workspace_members SET role = 'admin' WHERE user_id = $1 AND workspace_id = $2 RETURNING 1`, [users.carol, wsA]);
await expectDenied("member cannot delete the owner", "bob",
  `DELETE FROM public.workspace_members WHERE user_id = $1 AND workspace_id = $2 RETURNING 1`, [users.alice, wsA]);
await expectDenied("outsider cannot add self to workspace", "dave",
  `INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'member') RETURNING 1`, [wsA, users.dave]);
await expectDenied("outsider cannot add self as owner", "dave",
  `INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'owner') RETURNING 1`, [wsA, users.dave]);
await expectDenied("admin cannot promote to owner", "erin",
  `UPDATE public.workspace_members SET role = 'owner' WHERE user_id = $1 AND workspace_id = $2 RETURNING 1`, [users.bob, wsA]);
await expectDenied("admin cannot remove the owner", "erin",
  `DELETE FROM public.workspace_members WHERE user_id = $1 AND workspace_id = $2 RETURNING 1`, [users.alice, wsA]);
await expectDenied("owner cannot change own role", "alice",
  `UPDATE public.workspace_members SET role = 'viewer' WHERE user_id = $1 AND workspace_id = $2 RETURNING 1`, [users.alice, wsA]);
await expectRows("admin can change a member's role", "erin",
  `UPDATE public.workspace_members SET role = 'member' WHERE user_id = $1 AND workspace_id = $2 RETURNING 1`, 1, [users.carol, wsA]);
await sys(`UPDATE public.workspace_members SET role = 'viewer' WHERE user_id = $1 AND workspace_id = $2`, [users.carol, wsA]);

console.log("\n# Project isolation");
await expectRows("member sees only own project", "bob", `SELECT id FROM public.projects WHERE workspace_id = $1`, 1, [wsA]);
await expectRows("admin sees every project", "erin", `SELECT id FROM public.projects WHERE workspace_id = $1`, 2, [wsA]);
await expectDenied("member cannot read tasks of a foreign project", "bob", `SELECT * FROM public.tasks WHERE project_id = $1`, [p1]);
await expectDenied("member cannot update a foreign project", "bob", `UPDATE public.projects SET name = 'x' WHERE id = $1 RETURNING 1`, [p1]);
await expectDenied("member cannot delete a foreign project", "bob", `DELETE FROM public.projects WHERE id = $1 RETURNING 1`, [p1]);
await expectDenied("outsider sees no projects", "dave", `SELECT * FROM public.projects WHERE workspace_id = $1`, [wsA]);
await expectRows("member can create project (INSERT ... RETURNING)", "bob",
  `INSERT INTO public.projects (workspace_id, name) VALUES ($1, 'new') RETURNING id`, 1, [wsA]);
await expectRows("member can create task in own project (RETURNING)", "bob",
  `INSERT INTO public.tasks (project_id, stage_id, title) VALUES ($1, $2, 'T3') RETURNING id`, 1, [p2, s2]);
await expectRows("assignee gains access to the project", "service",
  `UPDATE public.tasks SET assignee_id = $1 WHERE id = $2 RETURNING 1`, 1, [users.bob, t1]);
await expectRows("...and now sees it", "bob", `SELECT id FROM public.projects WHERE id = $1`, 1, [p1]);
await expectRows("project owner lists project members", "bob", `SELECT * FROM public.project_members WHERE project_id = $1`, 1, [p2]);
await expectRows("admin adds a project member", "erin",
  `INSERT INTO public.project_members (project_id, user_id, role) VALUES ($1, $2, 'viewer') RETURNING 1`, 1, [p2, users.carol]);
await expectDenied("plain member cannot add project members", "carol",
  `INSERT INTO public.project_members (project_id, user_id, role) VALUES ($1, $2, 'admin') RETURNING 1`, [p2, users.dave]);

console.log("\n# Comments / attachments");
await expectDenied("outsider cannot read comments", "dave", `SELECT * FROM public.task_comments`);
await expectDenied("outsider cannot read attachments", "dave", `SELECT * FROM public.task_attachments`);
await expectDenied("outsider cannot delete comments", "dave", `DELETE FROM public.task_comments RETURNING 1`);
await expectDenied("outsider cannot comment on foreign task", "dave",
  `INSERT INTO public.task_comments (task_id, user_id, user_name, content) VALUES ($1, $2, 'd', 'x') RETURNING 1`, [t2, users.dave]);
await expectDenied("member cannot forge comment author", "bob",
  `INSERT INTO public.task_comments (task_id, user_id, user_name, content) VALUES ($1, $2, 'alice', 'x') RETURNING 1`, [t2, users.alice]);
await expectRows("member can comment on own project task", "bob",
  `INSERT INTO public.task_comments (task_id, user_id, user_name, content) VALUES ($1, $2, 'bob', 'hi') RETURNING id`, 1, [t2, users.bob]);
await expectRows("admin reads comments of the workspace", "erin", `SELECT * FROM public.task_comments`, 2);

console.log("\n# Other tables");
await expectDenied("outsider cannot subscribe to foreign project", "dave",
  `INSERT INTO public.notification_subscribers (project_id, user_id) VALUES ($1, $2) RETURNING 1`, [p1, users.dave]);
await expectDenied("users cannot publish public templates", "dave",
  `INSERT INTO public.templates (name, is_public) VALUES ('phish', true) RETURNING 1`);
await expectDenied("users cannot change their profile email", "bob",
  `UPDATE public.profiles SET email = 'alice@test.dev' WHERE id = $1 RETURNING 1`, [users.bob]);
await expectRows("users can still change their name", "bob",
  `UPDATE public.profiles SET full_name = 'Bob' WHERE id = $1 RETURNING 1`, 1, [users.bob]);

console.log("\n# Invite acceptance (service_role)");
await sys(`INSERT INTO auth.users (id, email) VALUES ('f0000000-0000-0000-0000-000000000006', 'new@test.dev')`);
await expectRows("invited email can accept", "service",
  `SELECT * FROM public.accept_invite_token($1, 'f0000000-0000-0000-0000-000000000006')`, 1, [inv]);
const inv2 = (await sys(`INSERT INTO public.invite_tokens (workspace_id, email, role, invited_by) VALUES ($1, 'alice@test.dev', 'viewer', $2) RETURNING token`, [wsA, users.erin])).rows[0].token;
await as("service", `SELECT * FROM public.accept_invite_token($1, $2)`, [inv2, users.alice]);
const aliceRole = (await sys(`SELECT role FROM public.workspace_members WHERE workspace_id = $1 AND user_id = $2`, [wsA, users.alice])).rows[0].role;
if (aliceRole === "owner") { pass++; console.log("  ok   accepting an invite never downgrades an owner"); }
else { fail++; console.log(`  FAIL owner downgraded to ${aliceRole}`); }

console.log("\n# clone_project RPC");
{
  // WBS de 3 níveis em P2 (projeto do bob) + dependência + convite pendente
  const root = (await sys(`INSERT INTO public.tasks (project_id, stage_id, title, due_date, assignee_name, assignee_status)
    VALUES ($1, $2, 'R', '2026-10-10', 'Fulano', 'pending') RETURNING id`, [p2, s2])).rows[0].id;
  const child = (await sys(`INSERT INTO public.tasks (project_id, stage_id, title, parent_task_id)
    VALUES ($1, $2, 'C', $3) RETURNING id`, [p2, s2, root])).rows[0].id;
  const grand = (await sys(`INSERT INTO public.tasks (project_id, stage_id, title, parent_task_id)
    VALUES ($1, $2, 'G', $3) RETURNING id`, [p2, s2, child])).rows[0].id;
  await sys(`INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2)`, [grand, root]);
  const sourceCount = (await sys(`SELECT count(*)::int AS n FROM public.tasks WHERE project_id = $1`, [p2])).rows[0].n;

  const r = await expectRows("project member clones a project", "bob",
    `SELECT public.clone_project($1, 'Clone', '{"date_offset_days": 5, "keep_assignees": true}') AS id`, 1, [p2]);
  const cloneId = r?.rows[0]?.id;
  const tasks = (await sys(`SELECT id, title, parent_task_id, due_date::text AS due, assignee_name, created_by
    FROM public.tasks WHERE project_id = $1`, [cloneId])).rows;
  const by = Object.fromEntries(tasks.map((t) => [t.title, t]));
  const deps = (await sys(`SELECT count(*)::int AS n FROM public.task_dependencies d
    JOIN public.tasks t ON t.id = d.task_id WHERE t.project_id = $1`, [cloneId])).rows[0].n;
  const checks = [
    ["clone copies every task", tasks.length === sourceCount],
    ["clone keeps 3-level hierarchy",
      !!by.R && !!by.C && !!by.G && by.C.parent_task_id === by.R.id && by.G.parent_task_id === by.C.id],
    ["clone shifts dates", by.R?.due === "2026-10-15"],
    ["clone remaps dependencies", deps === 1],
    ["clone keeps pending-invite assignee", by.R?.assignee_name === "Fulano"],
    ["clone is owned by the caller", by.R?.created_by === users.bob],
  ];
  for (const [label, ok] of checks) {
    if (ok) { pass++; console.log(`  ok   ${label}`); } else { fail++; console.log(`  FAIL ${label}`); }
  }
  await expectRows("caller sees the cloned project", "bob", `SELECT id FROM public.projects WHERE id = $1`, 1, [cloneId]);
  await expectDenied("outsider cannot clone a foreign project", "dave",
    `SELECT public.clone_project($1, 'Roubo') AS id`, [p2]);
  await expectDenied("anon cannot call clone_project", "anon",
    `SELECT public.clone_project($1, 'x') AS id`, [p2]);
}

console.log("\n# Viewer read-only");
{
  // Fixtures extras (como sys, sem passar pela RLS):
  //   frank: member do workspace, 'viewer' em project_members de P1
  //   gus:   member do workspace, 'member' em project_members de P1
  //   hank:  member do workspace, criador de P3 (rebaixado a viewer no fim)
  //   carol: viewer do workspace, 'member' em project_members de P1
  Object.assign(users, {
    frank: "f1000000-0000-0000-0000-000000000007",
    gus: "a2000000-0000-0000-0000-000000000008",
    hank: "a3000000-0000-0000-0000-000000000009",
  });
  for (const n of ["frank", "gus", "hank"]) {
    await sys(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [users[n], email(n)]);
  }
  await sys(`INSERT INTO public.workspace_members (workspace_id, user_id, role) VALUES
    ($1, $2, 'member'), ($1, $3, 'member'), ($1, $4, 'member')`, [wsA, users.frank, users.gus, users.hank]);
  await sys(`INSERT INTO public.project_members (project_id, user_id, role) VALUES
    ($1, $2, 'viewer'), ($1, $3, 'member'), ($1, $4, 'member')`, [p1, users.frank, users.gus, users.carol]);
  const t1b = (await sys(`INSERT INTO public.tasks (project_id, stage_id, title) VALUES ($1, $2, 'T1b') RETURNING id`, [p1, s1])).rows[0].id;
  await sys(`INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2)`, [t1b, t1]);
  const p3 = (await sys(`INSERT INTO public.projects (workspace_id, name, created_by) VALUES ($1, 'P3 hank', $2) RETURNING id`, [wsA, users.hank])).rows[0].id;
  const s3 = (await sys(`INSERT INTO public.stages (project_id, name) VALUES ($1, 'To do') RETURNING id`, [p3])).rows[0].id;

  // Tentativas de escrita em P1 que um leitor não pode fazer
  const writeAttempts = (who, label) => [
    [`${label} cannot insert a task`,
      `INSERT INTO public.tasks (project_id, stage_id, title) VALUES ($1, $2, 'x') RETURNING 1`, [p1, s1]],
    [`${label} cannot update a task`,
      `UPDATE public.tasks SET title = 'x' WHERE id = $1 RETURNING 1`, [t1]],
    [`${label} cannot delete a task`,
      `DELETE FROM public.tasks WHERE id = $1 RETURNING 1`, [t1b]],
    [`${label} cannot insert a stage`,
      `INSERT INTO public.stages (project_id, name) VALUES ($1, 'x') RETURNING 1`, [p1]],
    [`${label} cannot update a stage`,
      `UPDATE public.stages SET name = 'x' WHERE id = $1 RETURNING 1`, [s1]],
    [`${label} cannot delete a stage`,
      `DELETE FROM public.stages WHERE id = $1 RETURNING 1`, [s1]],
    [`${label} cannot insert a dependency`,
      `INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2) RETURNING 1`, [t1, t1b]],
    [`${label} cannot update a dependency`,
      `UPDATE public.task_dependencies SET dependency_type = 'SS' WHERE task_id = $1 RETURNING 1`, [t1b]],
    [`${label} cannot delete a dependency`,
      `DELETE FROM public.task_dependencies WHERE task_id = $1 RETURNING 1`, [t1b]],
    [`${label} cannot log a stage transition`,
      `INSERT INTO public.stage_transitions (task_id, to_stage_id, moved_by) VALUES ($1, $2, $3) RETURNING 1`, [t1, s1, users[who]]],
    [`${label} cannot update the project`,
      `UPDATE public.projects SET name = 'x' WHERE id = $1 RETURNING 1`, [p1]],
  ];

  // Leitor do projeto (member do workspace, 'viewer' em project_members)
  await expectRows("project viewer reads the project's tasks", "frank",
    `SELECT id FROM public.tasks WHERE id IN ($1, $2)`, 2, [t1, t1b]);
  await expectRows("project viewer reads the project's dependencies", "frank",
    `SELECT id FROM public.task_dependencies WHERE task_id = $1`, 1, [t1b]);
  for (const [label, sql, params] of writeAttempts("frank", "project viewer")) {
    await expectDenied(label, "frank", sql, params);
  }
  await expectRows("project viewer can still comment (by design)", "frank",
    `INSERT INTO public.task_comments (task_id, user_id, user_name, content) VALUES ($1, $2, 'frank', 'ok') RETURNING id`, 1, [t1, users.frank]);

  // Viewer do workspace, mesmo com 'member' em project_members (ex.: via
  // auto-membership ao receber uma tarefa)
  await expectRows("workspace viewer with project role 'member' reads tasks", "carol",
    `SELECT id FROM public.tasks WHERE id IN ($1, $2)`, 2, [t1, t1b]);
  for (const [label, sql, params] of writeAttempts("carol", "workspace viewer (project member)")) {
    await expectDenied(label, "carol", sql, params);
  }
  await expectDenied("workspace viewer cannot create a project", "carol",
    `INSERT INTO public.projects (workspace_id, name) VALUES ($1, 'x') RETURNING id`, [wsA]);
  await expectDenied("workspace viewer cannot clone into the workspace", "carol",
    `SELECT public.clone_project($1, 'Cópia') AS id`, [p1]);

  // Membro do projeto ('member' em project_members) escreve
  await expectRows("project member inserts a task", "gus",
    `INSERT INTO public.tasks (project_id, stage_id, title) VALUES ($1, $2, 'G1') RETURNING id`, 1, [p1, s1]);
  await expectRows("project member updates a task", "gus",
    `UPDATE public.tasks SET title = 'T1 edited' WHERE id = $1 RETURNING 1`, 1, [t1]);
  await expectDenied("project member cannot move a task to a project he can't edit", "gus",
    `UPDATE public.tasks SET project_id = $1 WHERE id = $2 RETURNING 1`, [p2, t1]);
  const gs = await expectRows("project member inserts a stage", "gus",
    `INSERT INTO public.stages (project_id, name) VALUES ($1, 'Doing') RETURNING id`, 1, [p1]);
  await expectRows("project member updates a stage", "gus",
    `UPDATE public.stages SET name = 'Doing!' WHERE id = $1 RETURNING 1`, 1, [gs?.rows[0]?.id]);
  await expectRows("project member deletes a stage", "gus",
    `DELETE FROM public.stages WHERE id = $1 RETURNING 1`, 1, [gs?.rows[0]?.id]);
  await expectRows("project member updates a dependency", "gus",
    `UPDATE public.task_dependencies SET dependency_type = 'SS' WHERE task_id = $1 RETURNING 1`, 1, [t1b]);
  await expectRows("project member deletes a dependency", "gus",
    `DELETE FROM public.task_dependencies WHERE task_id = $1 RETURNING 1`, 1, [t1b]);
  await expectRows("project member inserts a dependency", "gus",
    `INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2) RETURNING 1`, 1, [t1b, t1]);
  await expectRows("project member logs a stage transition", "gus",
    `INSERT INTO public.stage_transitions (task_id, to_stage_id, moved_by) VALUES ($1, $2, $3) RETURNING 1`, 1, [t1, s1, users.gus]);
  await expectRows("project member updates the project", "gus",
    `UPDATE public.projects SET description = 'gus' WHERE id = $1 RETURNING 1`, 1, [p1]);
  await expectRows("project member deletes a task", "gus",
    `DELETE FROM public.tasks WHERE project_id = $1 AND title = 'G1' RETURNING 1`, 1, [p1]);

  // Admin do workspace e criador do projeto escrevem
  await expectRows("workspace admin updates a task", "erin",
    `UPDATE public.tasks SET priority = 'high' WHERE id = $1 RETURNING 1`, 1, [t1]);
  await expectRows("workspace admin inserts a stage", "erin",
    `INSERT INTO public.stages (project_id, name) VALUES ($1, 'Admin') RETURNING id`, 1, [p1]);
  await expectRows("workspace admin updates the project", "erin",
    `UPDATE public.projects SET description = 'erin' WHERE id = $1 RETURNING 1`, 1, [p1]);
  await expectRows("project creator inserts a task", "hank",
    `INSERT INTO public.tasks (project_id, stage_id, title) VALUES ($1, $2, 'H1') RETURNING id`, 1, [p3, s3]);
  await expectRows("project creator updates the project", "hank",
    `UPDATE public.projects SET name = 'P3!' WHERE id = $1 RETURNING 1`, 1, [p3]);
  const wsDave = (await sys(`SELECT id FROM public.workspaces WHERE owner_id = $1`, [users.dave])).rows[0].id;
  await expectDenied("project creator cannot move the project to a foreign workspace", "hank",
    `UPDATE public.projects SET workspace_id = $2 WHERE id = $1 RETURNING 1`, [p3, wsDave]);

  // Criador rebaixado a viewer do workspace perde a escrita, mantém a leitura
  await sys(`UPDATE public.workspace_members SET role = 'viewer' WHERE workspace_id = $1 AND user_id = $2`, [wsA, users.hank]);
  await expectRows("demoted creator still reads his project", "hank",
    `SELECT id FROM public.tasks WHERE project_id = $1`, 1, [p3]);
  await expectDenied("demoted creator cannot insert tasks", "hank",
    `INSERT INTO public.tasks (project_id, stage_id, title) VALUES ($1, $2, 'H2') RETURNING id`, [p3, s3]);
  await expectDenied("demoted creator cannot update the project", "hank",
    `UPDATE public.projects SET name = 'x' WHERE id = $1 RETURNING 1`, [p3]);
  await expectDenied("demoted creator cannot manage project members", "hank",
    `INSERT INTO public.project_members (project_id, user_id, role) VALUES ($1, $2, 'admin') RETURNING 1`, [p3, users.frank]);

  // Transições só em nome próprio
  await expectDenied("member cannot log a transition on behalf of someone else", "gus",
    `INSERT INTO public.stage_transitions (task_id, to_stage_id, moved_by) VALUES ($1, $2, $3) RETURNING 1`, [t1, s1, users.alice]);
  // Admin do workspace continua gerenciando membros de projeto
  await expectRows("workspace admin manages project members", "erin",
    `INSERT INTO public.project_members (project_id, user_id, role) VALUES ($1, $2, 'viewer') RETURNING 1`, 1, [p3, users.frank]);
}

console.log("\n# Realtime");
{
  const inPublication = (await sys(
    `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename`
  )).rows.map((r) => r.tablename);
  const expected = ["projects", "stages", "task_dependencies", "tasks"];
  if (JSON.stringify(inPublication) === JSON.stringify(expected)) { pass++; console.log("  ok   data tables are published to Realtime"); }
  else { fail++; console.log(`  FAIL published tables: ${inPublication.join(", ")}`); }
  // Tabelas sensíveis não podem ser publicadas (o Realtime as exporia)
  const leaked = inPublication.filter((t) => ["invite_tokens", "profiles", "task_attachments", "workspace_members"].includes(t));
  if (leaked.length === 0) { pass++; console.log("  ok   sensitive tables are not published"); }
  else { fail++; console.log(`  FAIL sensitive tables published: ${leaked.join(", ")}`); }
}

console.log("\n# Dependency cycles");
{
  const mk = async (title) =>
    (await sys(`INSERT INTO public.tasks (project_id, stage_id, title) VALUES ($1, $2, $3) RETURNING id`, [p2, s2, title])).rows[0].id;
  const [ta, tb, tc] = [await mk("CY-A"), await mk("CY-B"), await mk("CY-C")];
  // A depende de B, B depende de C
  await sys(`INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2), ($2, $3)`, [ta, tb, tc]);

  await expectDenied("self-dependency is rejected", "bob",
    `INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $1) RETURNING 1`, [ta]);
  await expectDenied("direct cycle is rejected (B depends on A)", "bob",
    `INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2) RETURNING 1`, [tb, ta]);
  await expectDenied("indirect cycle is rejected (C depends on A)", "bob",
    `INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2) RETURNING 1`, [tc, ta]);
  await expectRows("non-cyclic dependency is accepted (A depends on C)", "bob",
    `INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2) RETURNING 1`, 1, [ta, tc]);
  // B→C passa a B→A: como A depende de B, fecharia um ciclo
  const existing = (await sys(`SELECT count(*)::int AS n FROM public.task_dependencies WHERE task_id = $1 AND depends_on_task_id = $2`, [tb, tc])).rows[0].n;
  if (existing === 1) { pass++; console.log("  ok   fixture: B depends on C exists"); }
  else { fail++; console.log("  FAIL fixture B→C missing"); }
  await expectDenied("update that would close a cycle is rejected", "bob",
    `UPDATE public.task_dependencies SET depends_on_task_id = $3 WHERE task_id = $1 AND depends_on_task_id = $2 RETURNING 1`, [tb, tc, ta]);
  await expectDenied("cycle is rejected even for the service role", "service",
    `INSERT INTO public.task_dependencies (task_id, depends_on_task_id) VALUES ($1, $2) RETURNING 1`, [tc, tb]);
}

console.log("\n# Rate limit");
{
  const hits = [];
  for (let i = 0; i < 3; i++) {
    hits.push((await as("service", `SELECT public.rate_limit_hit('test:key', 2, 60) AS ok`)).rows[0].ok);
  }
  if (JSON.stringify(hits) === "[true,true,false]") { pass++; console.log("  ok   third call in the window is over the limit"); }
  else { fail++; console.log(`  FAIL rate limit hits: ${JSON.stringify(hits)}`); }
  await expectDenied("authenticated cannot call rate_limit_hit", "bob", `SELECT public.rate_limit_hit('x', 1, 60) AS ok`);
  await expectDenied("anon cannot call rate_limit_hit", "anon", `SELECT public.rate_limit_hit('x', 1, 60) AS ok`);
  await expectDenied("authenticated cannot read rate_limits", "bob", `SELECT * FROM public.rate_limits`);
}

console.log("\n# Edge Functions secret");
{
  await expectDenied("authenticated cannot read the edge functions secret", "bob",
    `SELECT public.edge_functions_auth_header() AS h`);
  await expectDenied("anon cannot read the edge functions secret", "anon",
    `SELECT public.edge_functions_auth_header() AS h`);
  const header = (await sys(`SELECT public.edge_functions_auth_header() AS h`)).rows[0].h;
  if (header === "Bearer ") { pass++; console.log("  ok   header falls back to empty without Vault"); }
  else { fail++; console.log(`  FAIL unexpected header without Vault`); }
  const usesHelper = (await sys(
    `SELECT count(*)::int AS n FROM pg_proc WHERE proname IN ('notify_stage_change','notify_task_assigned','notify_task_created')
       AND prosrc LIKE '%edge_functions_auth_header()%' AND prosrc NOT LIKE '%app.service_role_key%'`
  )).rows[0].n;
  if (usesHelper === 3) { pass++; console.log("  ok   notification triggers read the secret from the helper"); }
  else { fail++; console.log(`  FAIL only ${usesHelper}/3 triggers use the helper`); }
}

console.log("\n# Workspace deletion");
await expectRows("owner can delete workspace (cascade)", "alice",
  `DELETE FROM public.workspaces WHERE id = $1 RETURNING 1`, 1, [wsA]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
