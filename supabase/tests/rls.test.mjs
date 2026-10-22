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

for (const f of files) {
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

console.log("\n# Workspace deletion");
await expectRows("owner can delete workspace (cascade)", "alice",
  `DELETE FROM public.workspaces WHERE id = $1 RETURNING 1`, 1, [wsA]);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
