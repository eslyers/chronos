// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/access/project
// Ações administrativas sobre um projeto do workspace (body: ProjectAction):
//   archive  → status 'archived'
//   activate → status 'active'
//   delete   → exclui o projeto (cascata: etapas, tarefas, dependências, membros)
//   transfer → novo dono (created_by + project_members 'owner'); o dono
//              anterior passa de 'owner' para 'admin' e mantém o acesso
// Segurança: requer owner/admin do workspace ou Master ADM; o projeto precisa
// pertencer ao workspace informado; aplica projectTransferError.
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
import { projectTransferError } from "@/lib/access/rules";

export const runtime = "nodejs";

const ROUTE = "api/access/project";

const base = z.object({ workspace_id: uuidSchema, project_id: uuidSchema });
const bodySchema = z.discriminatedUnion(
  "action",
  [
    base.extend({ action: z.literal("archive") }),
    base.extend({ action: z.literal("activate") }),
    base.extend({ action: z.literal("delete") }),
    base.extend({ action: z.literal("transfer"), new_owner_id: uuidSchema }),
  ],
  { errorMap: () => ({ message: "Ação inválida" }) }
);

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  const ctx = await authorizeAccessRequest(body?.workspace_id);
  if (ctx instanceof NextResponse) return ctx;

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(validationMessage(parsed.error), 400);
  const input = parsed.data;
  const { admin, caller, workspace } = ctx;

  try {
    const project = await loadWorkspaceProject(admin, workspace.id, input.project_id);
    if (!project) return jsonError("Projeto não encontrado neste workspace", 404);

    switch (input.action) {
      case "archive":
      case "activate": {
        const status = input.action === "archive" ? "archived" : "active";
        unwrap(
          `projects (${input.action})`,
          await admin
            .from("projects")
            .update({ status })
            .eq("id", project.id)
            .eq("workspace_id", workspace.id)
        );
        break;
      }

      case "delete": {
        unwrap(
          "projects (excluir)",
          await admin.from("projects").delete().eq("id", project.id).eq("workspace_id", workspace.id)
        );
        break;
      }

      case "transfer": {
        const newOwner = await loadWorkspaceMember(admin, workspace.id, input.new_owner_id);
        const ruleError = projectTransferError({ caller, project, newOwner });
        if (ruleError) return jsonError(ruleError, 409);

        const previousOwner = project.created_by;
        unwrap(
          "projects (transferir)",
          await admin
            .from("projects")
            .update({ created_by: input.new_owner_id })
            .eq("id", project.id)
            .eq("workspace_id", workspace.id)
        );
        unwrap(
          "project_members (novo dono)",
          await admin
            .from("project_members")
            .upsert(
              { project_id: project.id, user_id: input.new_owner_id, role: "owner" },
              { onConflict: "project_id,user_id" }
            )
        );
        // Dono anterior: continua com acesso como 'admin' do projeto se ainda
        // for membro do workspace (sem linha em project_members ele perderia o
        // acesso, já que era o created_by que o garantia)
        if (previousOwner && previousOwner !== input.new_owner_id) {
          const previousMember = await loadWorkspaceMember(admin, workspace.id, previousOwner);
          if (previousMember) {
            unwrap(
              "project_members (dono anterior)",
              await admin
                .from("project_members")
                .upsert(
                  { project_id: project.id, user_id: previousOwner, role: "admin" },
                  { onConflict: "project_id,user_id" }
                )
            );
          } else {
            unwrap(
              "project_members (dono anterior)",
              await admin.from("project_members").delete().eq("project_id", project.id).eq("user_id", previousOwner)
            );
          }
        }
        break;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(ROUTE, err);
  }
}
