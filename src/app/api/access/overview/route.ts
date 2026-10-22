// ─────────────────────────────────────────────────────────────
// CHRONOS API: GET /api/access/overview?workspace_id=…
// Visão completa de acessos do workspace: membros (com perfis), projetos
// (todos os status), concessões de project_members e convites pendentes.
// O Master ADM recebe também a lista de todos os workspaces (seletor).
// Segurança: requer owner/admin do workspace ou Master ADM.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { isMasterAdminEmail } from "@/lib/auth/master-admin";
import {
  authorizeAccessRequest,
  chunk,
  fetchAllPages,
  serverError,
  type AnyClient,
} from "@/lib/access/server";
import type {
  AccessGrant,
  AccessInvite,
  AccessMember,
  AccessOverview,
  AccessProject,
  AccessWorkspace,
  WorkspaceRole,
} from "@/lib/access/types";

export const runtime = "nodejs";

const ROUTE = "api/access/overview";

interface MemberRow {
  user_id: string;
  role: WorkspaceRole;
}

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
}

export async function GET(request: NextRequest) {
  const workspaceId = new URL(request.url).searchParams.get("workspace_id");
  const ctx = await authorizeAccessRequest(workspaceId);
  if (ctx instanceof NextResponse) return ctx;

  const { admin, user, caller, isMasterAdmin, workspace } = ctx;
  try {
    const [members, projects, invites, workspaces] = await Promise.all([
      loadMembers(admin, workspace.id),
      fetchAllPages<AccessProject>("projects", () =>
        admin
          .from("projects")
          .select("id, name, color, status, created_by, created_at")
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
      ),
      fetchAllPages<AccessInvite>("invite_tokens", () =>
        admin
          .from("invite_tokens")
          .select("email, role, expires_at")
          .eq("workspace_id", workspace.id)
          .eq("status", "pending")
          .gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: true })
      ),
      // Só o Master ADM enxerga (e alterna entre) todos os workspaces
      isMasterAdmin
        ? fetchAllPages<AccessWorkspace>("workspaces (todos)", () =>
            admin
              .from("workspaces")
              .select("id, name, owner_id")
              .order("name", { ascending: true })
              .order("id", { ascending: true })
          )
        : Promise.resolve(undefined),
    ]);

    const grants = await loadGrants(
      admin,
      projects.map((p) => p.id)
    );

    const overview: AccessOverview = {
      workspace,
      ...(workspaces ? { workspaces } : {}),
      caller: { user_id: user.id, role: caller.role, is_master_admin: isMasterAdmin },
      members,
      projects,
      grants,
      invites,
    };
    return NextResponse.json(overview);
  } catch (err) {
    return serverError(ROUTE, err);
  }
}

/** Membros do workspace com email/nome do perfil (fallback: auth.users). */
async function loadMembers(admin: AnyClient, workspaceId: string): Promise<AccessMember[]> {
  const rows = await fetchAllPages<MemberRow>("workspace_members", () =>
    admin
      .from("workspace_members")
      .select("user_id, role, joined_at")
      .eq("workspace_id", workspaceId)
      .order("joined_at", { ascending: true })
      .order("user_id", { ascending: true })
  );
  if (rows.length === 0) return [];

  const profiles = new Map<string, ProfileRow>();
  for (const ids of chunk(rows.map((r) => r.user_id))) {
    const page = await fetchAllPages<ProfileRow>("profiles", () =>
      admin.from("profiles").select("id, email, full_name").in("id", ids).order("id", { ascending: true })
    );
    for (const p of page) profiles.set(p.id, p);
  }

  return Promise.all(
    rows.map(async (row) => {
      const profile = profiles.get(row.user_id);
      let email = profile?.email ?? null;
      let fullName = profile?.full_name ?? null;

      // Perfil sem email (contas antigas): busca no auth.users, só para esses casos
      if (!email && admin?.auth?.admin?.getUserById) {
        try {
          const { data } = await admin.auth.admin.getUserById(row.user_id);
          if (data?.user) {
            email = data.user.email ?? null;
            fullName = fullName || data.user.user_metadata?.full_name || data.user.user_metadata?.name || null;
          }
        } catch {
          // Segue com o que tem
        }
      }

      return {
        user_id: row.user_id,
        email: email || "(sem email)",
        full_name: fullName,
        role: row.role,
        is_master_admin: isMasterAdminEmail(email),
      };
    })
  );
}

/** Linhas de project_members dos projetos, em lotes de ids e paginadas. */
async function loadGrants(admin: AnyClient, projectIds: string[]): Promise<AccessGrant[]> {
  const grants: AccessGrant[] = [];
  for (const ids of chunk(projectIds)) {
    const page = await fetchAllPages<AccessGrant>("project_members", () =>
      admin
        .from("project_members")
        .select("project_id, user_id, role")
        .in("project_id", ids)
        .order("project_id", { ascending: true })
        .order("user_id", { ascending: true })
    );
    grants.push(...page);
  }
  return grants;
}
