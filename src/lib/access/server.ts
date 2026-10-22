// ─────────────────────────────────────────────────────────────
// CHRONOS — Administração de acessos: utilitários do servidor
// Autenticação/autorização comum às rotas /api/access/*, respostas de erro
// padronizadas e leitura paginada (PostgREST limita respostas a 1000 linhas).
// As rotas usam o client service_role, que NÃO passa pelos triggers/RLS que
// protegem papéis no banco — por isso toda regra de rules.ts é aplicada aqui.
// ─────────────────────────────────────────────────────────────
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServerAdminClient } from "@/lib/supabase/serverAdminClient";
import { isMasterAdminEmail } from "@/lib/auth/master-admin";
import { canManageWorkspace, type CallerContext } from "./rules";
import type { AccessWorkspace, WorkspaceRole } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyClient = any;

/** Tamanho da página nas leituras paginadas (limite padrão do PostgREST). */
export const PAGE_SIZE = 1000;
/** Máximo de ids por filtro .in() (evita URLs gigantes). */
export const IN_CHUNK_SIZE = 100;

export const uuidSchema = z
  .string({ required_error: "Identificador obrigatório", invalid_type_error: "Identificador inválido" })
  .uuid("Identificador inválido");

export interface AccessRequestContext {
  admin: AnyClient;
  user: User;
  caller: CallerContext;
  isMasterAdmin: boolean;
  workspace: AccessWorkspace;
}

/** Erro de banco: registra os detalhes no log e devolve mensagem genérica. */
export class AccessDbError extends Error {
  constructor(public readonly context: string, public readonly details: unknown) {
    super(`Erro de banco em ${context}`);
    this.name = "AccessDbError";
  }
}

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function serverError(route: string, err: unknown) {
  if (err instanceof AccessDbError) {
    console.error(`[${route}] ${err.message}:`, err.details);
  } else {
    console.error(`[${route}] Erro interno:`, err);
  }
  return jsonError("Erro interno ao processar a solicitação. Tente novamente.", 500);
}

/** Lança AccessDbError se a resposta do Supabase trouxe erro; senão devolve data. */
export function unwrap<T>(context: string, res: { data: T; error: unknown }): T {
  if (res.error) throw new AccessDbError(context, res.error);
  return res.data;
}

/** Lê todas as linhas de uma consulta, página a página, via .range(). */
export async function fetchAllPages<T>(
  context: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: () => any
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = unwrap<T[] | null>(context, await build().range(from, from + PAGE_SIZE - 1)) ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export function chunk<T>(items: T[], size = IN_CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Lê o corpo JSON da requisição; null se não for um objeto JSON válido. */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

/** Primeira mensagem de erro de validação do zod. */
export function validationMessage(error: z.ZodError): string {
  return error.errors[0]?.message ?? "Dados inválidos";
}

/**
 * Autentica o solicitante e verifica se ele pode administrar o workspace
 * (owner/admin do workspace ou Master ADM). Devolve o contexto da requisição
 * ou uma NextResponse de erro (400/401/403/404/500) pronta para retornar.
 */
export async function authorizeAccessRequest(
  workspaceId: unknown
): Promise<AccessRequestContext | NextResponse> {
  const route = "api/access";
  try {
    // ── 1. Autenticação (sessão do usuário) ──
    const userClient = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) return jsonError("Não autenticado", 401);

    // ── 2. Validação do workspace_id ──
    const parsedId = uuidSchema.safeParse(workspaceId);
    if (!parsedId.success) return jsonError("workspace_id inválido ou ausente", 400);
    const wsId = parsedId.data;

    // ── 3. Client service_role (obrigatório: sem ele as regras não se aplicam) ──
    let admin: AnyClient;
    try {
      admin = await createServerAdminClient();
    } catch (err) {
      return serverError(route, err);
    }

    // Master ADM: sempre pelo email da sessão autenticada, nunca por profiles.email
    const isMasterAdmin = isMasterAdminEmail(user.email);

    // ── 4. Papel do solicitante + existência do workspace ──
    const [membershipRes, workspaceRes] = await Promise.all([
      admin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", wsId)
        .eq("user_id", user.id)
        .maybeSingle(),
      admin.from("workspaces").select("id, name, owner_id").eq("id", wsId).maybeSingle(),
    ]);
    const membership = unwrap<{ role: WorkspaceRole } | null>("workspace_members (solicitante)", membershipRes);
    const workspace = unwrap<AccessWorkspace | null>("workspaces", workspaceRes);

    const caller: CallerContext = { role: membership?.role ?? null, isMasterAdmin };
    // 403 antes do 404: quem não administra não descobre se o workspace existe
    if (!canManageWorkspace(caller)) {
      return jsonError("Acesso restrito: apenas donos e admins do workspace podem gerenciar acessos.", 403);
    }
    if (!workspace) return jsonError("Workspace não encontrado", 404);

    return { admin, user, caller, isMasterAdmin, workspace };
  } catch (err) {
    return serverError(route, err);
  }
}

/** Membro do workspace (papel), ou undefined se não for membro. */
export async function loadWorkspaceMember(
  admin: AnyClient,
  workspaceId: string,
  userId: string
): Promise<{ user_id: string; role: WorkspaceRole } | undefined> {
  const row = unwrap<{ user_id: string; role: WorkspaceRole } | null>(
    "workspace_members",
    await admin
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle()
  );
  return row ?? undefined;
}

/** Projeto, somente se pertencer ao workspace informado. */
export async function loadWorkspaceProject(
  admin: AnyClient,
  workspaceId: string,
  projectId: string
): Promise<{ id: string; created_by: string | null } | undefined> {
  const row = unwrap<{ id: string; created_by: string | null } | null>(
    "projects",
    await admin
      .from("projects")
      .select("id, created_by")
      .eq("id", projectId)
      .eq("workspace_id", workspaceId)
      .maybeSingle()
  );
  return row ?? undefined;
}
