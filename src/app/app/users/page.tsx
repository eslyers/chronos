"use client";

import * as React from "react";
import { Users, Mail, Loader2, ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import { MembersTable } from "./_components/MembersTable";
import { InviteDialog } from "./_components/InviteDialog";
import {
  loadMembers,
  loadPendingInvites,
  demoMembers,
  demoInvites,
  getDemoWorkspaceId,
  getDemoCurrentUser,
  type Member,
  type InviteToken,
  type WorkspaceRole,
} from "./_lib/members";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export default function UsersPage() {
  const supabaseMode = React.useMemo(() => isSupabaseConfigured(), []);
  const [loading, setLoading] = React.useState(true);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [invites, setInvites] = React.useState<InviteToken[]>([]);
  const [workspaceId, setWorkspaceId] = React.useState<string>("");
  const [currentUserRole, setCurrentUserRole] = React.useState<WorkspaceRole>("owner");
  const [inviteDialogOpen, setInviteDialogOpen] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      let wsId = workspaceId;
      if (!supabaseMode) {
        wsId = getDemoWorkspaceId();
        setWorkspaceId(wsId);
        setCurrentUserRole(getDemoCurrentUser().role);
      }
      const [m, i] = await Promise.all([loadMembers(wsId), loadPendingInvites(wsId)]);
      setMembers(m);
      setInvites(i);
    } finally {
      setLoading(false);
    }
  }, [supabaseMode, workspaceId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  // Achar workspace_id do user logado via Supabase (modo produção)
  React.useEffect(() => {
    if (!supabaseMode) return;
    (async () => {
      const { createSPAClient } = await import("@/lib/supabase/client");
      const supabase: AnyClient = createSPAClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ws } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (ws) {
        setWorkspaceId(ws.workspace_id);
        setCurrentUserRole(ws.role);
      }
    })();
  }, [supabaseMode]);

  // ── Invite handler ─────────────────────────────────────────
  async function handleInvite({ email, role, sendEmail }: { email: string; role: WorkspaceRole; sendEmail: boolean }) {
    const me = getDemoCurrentUser();
    const token = `inv-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    try {
      if (supabaseMode) {
        // Chamar API de invite (cria token + manda email via Brevo)
        const res = await fetch("/api/users/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role, workspace_id: workspaceId, send_email: sendEmail }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error || "Erro ao convidar" };
      } else {
        // Demo: inserir direto no localStorage
        demoInvites.create({
          token,
          workspace_id: workspaceId,
          email,
          role,
          invited_by: me.id,
          status: "pending",
          expires_at: expiresAt,
          created_at: createdAt,
        });
        // Simular envio de email no demo (log no console)
        if (sendEmail) {
          console.info(`[demo] Email "simulado" enviado pra ${email}: invite url /auth/invite/${token}`);
        }
      }

      await reload();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erro" };
    }
  }

  async function handleRemove(id: string) {
    if (!supabaseMode) {
      demoMembers.remove(id);
      await reload();
    } else {
      // TODO: API DELETE /api/users/:id
      alert("Remoção via Supabase pendente (precisa de API)");
    }
  }

  async function handleRevokeInvite(token: string) {
    if (!supabaseMode) {
      demoInvites.revoke(token);
    } else {
      const { createSPAClient } = await import("@/lib/supabase/client");
      const supabase: AnyClient = createSPAClient();
      await supabase.from("invite_tokens").update({ status: "revoked" }).eq("token", token);
    }
    await reload();
  }

  async function handleResendInvite(token: string) {
    const invite = invites.find((i) => i.token === token);
    if (!invite) return;
    if (supabaseMode) {
      // TODO: chamar API de reenvio
      alert("Reenvio via Supabase pendente");
    } else {
      console.info(`[demo] Reenvio simulado: ${invite.email} → /auth/invite/${token}`);
    }
  }

  const isOwner = currentUserRole === "owner";
  const memberCount = members.length;
  const pendingCount = invites.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/app" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 sm:h-7 sm:w-7" />
              Equipe
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Gerencie quem pode acessar este workspace e qual papel cada um tem.
          </p>
        </div>

        {isOwner && (
          <Button onClick={() => setInviteDialogOpen(true)} className="bg-blue-500 hover:bg-blue-600">
            <Mail className="h-4 w-4 mr-2" />
            Convidar
          </Button>
        )}
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Total de membros" value={memberCount} color="default" />
        <StatBox label="Convites pendentes" value={pendingCount} color={pendingCount > 0 ? "yellow" : "default"} />
        <StatBox label="Seu papel" value={currentUserRole === "owner" ? "Dono" : currentUserRole === "admin" ? "Admin" : currentUserRole === "member" ? "Membro" : "Visualizador"} color={isOwner ? "yellow" : "default"} />
      </div>

      {/* Demo mode alert */}
      {!supabaseMode && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Modo demonstração</AlertTitle>
          <AlertDescription>
            Os dados ficam só no <strong>localStorage</strong> deste navegador. Quando você plugar as chaves do
            Supabase (anon key + URL), a tela passa a usar a tabela <code>workspace_members</code> +{" "}
            <code>invite_tokens</code> automaticamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MembersTable
          members={members}
          invites={invites}
          isOwner={isOwner}
          onRemove={handleRemove}
          onRevokeInvite={handleRevokeInvite}
          onResendInvite={handleResendInvite}
        />
      )}

      <InviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} onInvite={handleInvite} />
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string | number; color: "default" | "yellow" }) {
  const colors = {
    default: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
    yellow: "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300",
  };
  return (
    <div className={`rounded-lg p-4 ${colors[color]}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-xl font-semibold capitalize mt-0.5">{value}</p>
    </div>
  );
}
