// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/access/workspace-member
// Altera o papel de um membro no workspace ou o remove (role null).
// Ao remover, apaga também os project_members dele nos projetos do workspace
// (senão has_project_access continuaria liberando esses projetos).
// Não mexe em auth.users. Body: WorkspaceMemberChange.
// Segurança: requer owner/admin do workspace ou Master ADM; aplica
// workspaceRoleChangeError (o client service_role ignora RLS/triggers).
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorizeAccessRequest,
  chunk,
  fetchAllPages,
  jsonError,
  loadWorkspaceMember,
  readJsonBody,
  serverError,
  unwrap,
  uuidSchema,
  validationMessage,
  type AnyClient,
} from "@/lib/access/server";
import { workspaceRoleChangeError } from "@/lib/access/rules";

export const runtime = "nodejs";

const ROUTE = "api/access/workspace-member";

const bodySchema = z.object({
  workspace_id: uuidSchema,
  user_id: uuidSchema,
  role: z.enum(["owner", "admin", "member", "viewer"], {
    errorMap: () => ({ message: "Papel inválido para o workspace" }),
  }).nullable(),
});

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  const ctx = await authorizeAccessRequest(body?.workspace_id);
  if (ctx instanceof NextResponse) return ctx;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(validationMessage(parsed.error), 400);
  const { user_id, role } = parsed.data;
  const { admin, caller, user, workspace } = ctx;

  try {
    const target = await loadWorkspaceMember(admin, workspace.id, user_id);
    if (!target) return jsonError("O usuário não é membro deste workspace", 404);

    const ownersRes = await admin
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("role", "owner");
    unwrap("workspace_members (contagem de donos)", ownersRes);
    const count: number | null = ownersRes.count;

    const ruleError = workspaceRoleChangeError({
      caller,
      isSelf: user.id === user_id,
      targetRole: target.role,
      newRole: role,
      ownerCount: count ?? 0,
    });
    if (ruleError) return jsonError(ruleError, 409);

    if (role === null) {
      // Concessões primeiro: se a remoção do vínculo falhar depois, o usuário
      // fica com menos acesso, nunca com acesso a mais.
      await removeProjectGrants(admin, workspace.id, user_id);
      unwrap(
        "workspace_members (remover)",
        await admin.from("workspace_members").delete().eq("workspace_id", workspace.id).eq("user_id", user_id)
      );
    } else if (role !== target.role) {
      unwrap(
        "workspace_members (alterar papel)",
        await admin
          .from("workspace_members")
          .update({ role })
          .eq("workspace_id", workspace.id)
          .eq("user_id", user_id)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(ROUTE, err);
  }
}

/** Remove as linhas de project_members do usuário nos projetos do workspace. */
async function removeProjectGrants(admin: AnyClient, workspaceId: string, userId: string) {
  const projects = await fetchAllPages<{ id: string }>("projects (ids)", () =>
    admin.from("projects").select("id").eq("workspace_id", workspaceId).order("id", { ascending: true })
  );
  for (const ids of chunk(projects.map((p) => p.id))) {
    unwrap(
      "project_members (remover do workspace)",
      await admin.from("project_members").delete().eq("user_id", userId).in("project_id", ids)
    );
  }
}
