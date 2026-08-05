"use client";

import * as React from "react";
import { Users, Mail, Info, ShieldCheck, UserCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import { MembersTable } from "./_components/MembersTable";
import { InviteDialog } from "./_components/InviteDialog";
import { ToastContainer, useToast } from "@/components/ui/toast-notification";
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
  const { toasts, addToast, dismiss } = useToast();

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

  async function handleInvite({ email, role, sendEmail }: { email: string; role: WorkspaceRole; sendEmail: boolean }) {
    const me = getDemoCurrentUser();
    const token = `inv-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    try {
      if (supabaseMode) {
        const res = await fetch("/api/users/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role, workspace_id: workspaceId, send_email: sendEmail }),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error || "Erro ao convidar" };
      } else {
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
      // TODO: implement remove member API
      addToast({ variant: "info", title: "Em breve", description: "Remoção de membros via API será implementada em breve." });
    }
  }

  async function handleRevokeInvite(token: string) {
    try {
      if (!supabaseMode) {
        demoInvites.revoke(token);
      } else {
        const { createSPAClient } = await import("@/lib/supabase/client");
        const supabase: AnyClient = createSPAClient();
        const { error } = await supabase.from("invite_tokens").update({ status: "revoked" }).eq("token", token);
        if (error) throw new Error(error.message);
      }
      await reload();
      addToast({ variant: "success", title: "Convite revogado", description: "O token foi invalidado com sucesso." });
    } catch (err) {
      addToast({ variant: "error", title: "Erro ao revogar", description: err instanceof Error ? err.message : "Tente novamente." });
    }
  }

  async function handleResendInvite(token: string) {
    const invite = invites.find((i) => i.token === token);
    if (!invite) return;

    if (!supabaseMode) {
      console.info(`[demo] Reenvio simulado: ${invite.email} → /auth/invite/${token}`);
      addToast({ variant: "info", title: "Modo demonstração", description: `Email simulado para ${invite.email}` });
      return;
    }

    // supabaseMode: chama a API que usa Brevo
    try {
      const res = await fetch("/api/invites/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast({ variant: "error", title: "Falha ao reenviar", description: data.error || "Tente novamente." });
        return;
      }
      await reload();
      addToast({ variant: "success", title: "Convite reenviado!", description: `Email enviado para ${invite.email} via Brevo.` });
    } catch (err) {
      addToast({ variant: "error", title: "Erro de conexão", description: err instanceof Error ? err.message : "Tente novamente." });
    }
  }

  const isOwner = currentUserRole === "owner";
  const memberCount = members.length;
  const pendingCount = invites.length;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                GESTÃO DE EQUIPE & ACESSO
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
              <Users className="h-7 w-7 text-blue-500" />
              Gestão de Equipe & Membros
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Gerencie os usuários do workspace, atribua papéis operacionais e envie convites por e-mail.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isOwner && (
              <Button onClick={() => setInviteDialogOpen(true)} className="h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md shadow-blue-500/20">
                <Mail className="h-4 w-4 mr-2" />
                Convidar Novo Membro
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Membros Ativos</p>
              <p className="text-3xl font-extrabold mt-1.5">{memberCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 font-bold">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Convites Pendentes</p>
              <p className="text-3xl font-extrabold mt-1.5">{pendingCount}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 font-bold">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-border/80 bg-card shadow-sm hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Seu Papel no Workspace</p>
              <p className="text-2xl font-extrabold mt-1.5 capitalize text-emerald-500">
                {currentUserRole === "owner" ? "Proprietário (Owner)" : currentUserRole === "admin" ? "Administrador" : currentUserRole === "member" ? "Membro Operacional" : "Visualizador"}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {!supabaseMode && (
        <Alert className="border-blue-500/30 bg-blue-500/5">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="font-bold text-foreground">Modo Demonstração Ativo</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground mt-1">
            Os membros e convites estão simulados no <strong>localStorage</strong>. Ao integrar com o Supabase, a gestão utilizará as tabelas <code>workspace_members</code> e <code>invite_tokens</code> em tempo real.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Carregando lista de membros da equipe...
          </p>
        </div>
      ) : (
        <Card className="border-border/80 bg-card shadow-xl overflow-hidden p-6">
          <MembersTable
            members={members}
            invites={invites}
            isOwner={isOwner}
            onRemove={handleRemove}
            onRevokeInvite={handleRevokeInvite}
            onResendInvite={handleResendInvite}
          />
        </Card>
      )}

      <InviteDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} onInvite={handleInvite} />
    </div>
  );
}
