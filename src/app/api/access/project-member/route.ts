// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/access/project-member
// Concede, altera ou revoga (role null) o acesso de um membro a um projeto
// (tabela project_members). Body: ProjectMemberChange.
// Segurança: requer owner/admin do workspace ou Master ADM; aplica
// projectAccessChangeError (o client service_role ignora RLS/triggers).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeAccessRequest,
  jsonError,
  loadWorkspaceMember,
  loadWorkspaceProject,
  readJsonBody,
  serverError,
  unwrap,
  uuidSchema,
  validationMessage,
} from "@/lib/access/server";
import { projectAccessChangeError } from "@/lib/access/rules";

export const runtime = "nodejs";

const ROUTE = "api/access/project-member";

const bodySchema = z.object({
  workspace_id: uuidSchema,
  project_id: uuidSchema,
  user_id: uuidSchema,
  role: z.enum(["admin", "member", "viewer"], {
    errorMap: () => ({ message: "Papel inválido para o projeto" }),
  }).nullable(),
});

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  const ctx = await authorizeAccessRequest(body?.workspace_id);
  if (ctx instanceof NextResponse) return ctx;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(validationMessage(parsed.error), 400);
  const { project_id, user_id, role } = parsed.data;
  const { admin, caller, workspace } = ctx;

  try {
    const [member, project] = await Promise.all([
      loadWorkspaceMember(admin, workspace.id, user_id),
      loadWorkspaceProject(admin, workspace.id, project_id),
    ]);

    const ruleError = projectAccessChangeError({ caller, member, project, newRole: role });
    if (ruleError) return jsonError(ruleError, project ? 409 : 404);

    if (role === null) {
      unwrap(
        "project_members (revogar)",
        await admin.from("project_members").delete().eq("project_id", project_id).eq("user_id", user_id)
      );
    } else {
      unwrap(
        "project_members (conceder)",
        await admin
          .from("project_members")
          .upsert({ project_id, user_id, role }, { onConflict: "project_id,user_id" })
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(ROUTE, err);
  }
}
