"use client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Administração de acessos
// Exclusiva para donos/admins do workspace e Master ADM. Aba "Acessos"
// (matriz usuários × projetos) e aba "Projetos" (dono, arquivar, excluir).
// O Master ADM pode escolher outro workspace no seletor do cabeçalho —
// isso muda só o workspace administrado nesta tela, não o ativo do usuário.
// ─────────────────────────────────────────────────────────────
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, Clock, FolderKanban, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGlobalToast } from "@/components/ui/toast-notification";
import { useGlobal } from "@/lib/context/GlobalContext";
import { getDataLayer } from "@/lib/data/data-provider";
import type { AccessWorkspace } from "@/lib/access/types";
import { useAccessAdmin } from "./_lib/useAccessAdmin";
import { AccessMatrix } from "./_components/AccessMatrix";
import { ProjectsTable } from "./_components/ProjectsTable";
import { PendingInvites } from "./_components/PendingInvites";

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, workspaceRole, isWorkspaceAdmin, isMasterAdmin } = useGlobal();
  const { addToast } = useGlobalToast();
  const supabaseMode = React.useMemo(() => getDataLayer() === "supabase", []);

  const allowed = isWorkspaceAdmin || isMasterAdmin;
  // O papel chega depois do usuário; só decide o redirecionamento quando ele é conhecido
  const roleKnown = isMasterAdmin || workspaceRole !== null;

  const redirected = React.useRef(false);
  React.useEffect(() => {
    if (authLoading || redirected.current) return;
    if (!user || (roleKnown && !allowed)) {
      redirected.current = true;
      addToast({
        variant: "warning",
        title: "Acesso restrito",
        description: "A administração de acessos é exclusiva para donos e administradores do workspace.",
      });
      router.replace("/app");
    }
  }, [authLoading, user, roleKnown, allowed, addToast, router]);

  // Workspace ativo do usuário (mesma resolução da página Usuários)
  const [activeWsId, setActiveWsId] = React.useState<string | null>(null);
  const [wsLookupError, setWsLookupError] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!supabaseMode || !allowed || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const { getCurrentWorkspaceId } = await import("@/lib/data/supabase-data");
        const found = await getCurrentWorkspaceId();
        if (cancelled) return;
        if (found) setActiveWsId(found);
        else setWsLookupError("Nenhum workspace encontrado para o seu usuário.");
      } catch (err) {
        if (!cancelled) setWsLookupError(err instanceof Error ? err.message : "Falha ao identificar o workspace.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseMode, allowed, user]);

  // Seletor do Master ADM: estado local, não altera o workspace ativo
  const [selectedWsId, setSelectedWsId] = React.useState<string | null>(null);
  const workspaceId = selectedWsId ?? activeWsId;

  const admin = useAccessAdmin(workspaceId, { enabled: supabaseMode && allowed });
  const { overview } = admin;

  // Mantém a lista de workspaces enquanto o próximo carrega
  const [workspaces, setWorkspaces] = React.useState<AccessWorkspace[] | null>(null);
  React.useEffect(() => {
    if (overview?.workspaces) setWorkspaces(overview.workspaces);
  }, [overview?.workspaces]);

  const sortedWorkspaces = React.useMemo(
    () => workspaces && [...workspaces].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })),
    [workspaces]
  );

  if (!authLoading && user && roleKnown && !allowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-fadeIn">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <div className="text-center max-w-md px-4">
          <h2 className="text-xl font-bold text-foreground">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mt-1.5">
            A administração é exclusiva para donos e administradores do workspace. Redirecionando para o Dashboard...
          </p>
        </div>
      </div>
    );
  }

  const activeProjects = overview?.projects.filter((p) => p.status !== "archived").length ?? 0;

  return (
    <div className="space-y-6 animate-fadeIn pb-12 px-1 sm:px-0 min-w-0">
      {/* Cabeçalho */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-5 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="min-w-0">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
              ADMINISTRAÇÃO
            </Badge>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
              <ShieldCheck className="h-7 w-7 text-blue-500 shrink-0" />
              Administração
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Defina quem acessa cada projeto, ajuste papéis no workspace e gerencie donos, arquivamento e exclusão de
              projetos.
            </p>
          </div>

          {sortedWorkspaces && sortedWorkspaces.length > 0 && (
            <div className="flex flex-col gap-1.5 shrink-0 w-full lg:w-72">
              <span id="ws-selector-label" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
                Workspace administrado
              </span>
              <Select
                value={workspaceId ?? undefined}
                onValueChange={(v) => setSelectedWsId(v)}
              >
                <SelectTrigger aria-labelledby="ws-selector-label" className="h-10 bg-card">
                  <SelectValue placeholder="Escolha um workspace" />
                </SelectTrigger>
                <SelectContent>
                  {sortedWorkspaces.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                      {ws.id === activeWsId ? " (ativo)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {!supabaseMode ? (
        <EmptyState
          icon={ShieldCheck}
          variant="card"
          title="Disponível apenas com Supabase configurado"
          description="A administração de acessos usa as permissões reais do banco. No modo demonstração, membros e convites podem ser simulados na página Usuários."
          actionLabel="Ir para Usuários"
          actionIcon={Users}
          onAction={() => router.push("/app/users")}
        />
      ) : wsLookupError && !workspaceId ? (
        <ErrorCard message={wsLookupError} />
      ) : admin.error && !overview ? (
        <ErrorCard message={admin.error} onRetry={admin.reload} />
      ) : !overview ? (
        <AdminSkeleton />
      ) : (
        <>
          {/* Indicadores */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
            <StatCard label="Membros" value={overview.members.length} icon={Users} tone="blue" />
            <StatCard label="Projetos ativos" value={activeProjects} icon={FolderKanban} tone="emerald" />
            <StatCard label="Convites pendentes" value={overview.invites.length} icon={Clock} tone="amber" />
          </div>

          <Tabs defaultValue="acessos" className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <TabsList className="h-10 rounded-lg">
                <TabsTrigger value="acessos" className="rounded-md text-xs sm:text-sm font-semibold">
                  Acessos
                </TabsTrigger>
                <TabsTrigger value="projetos" className="rounded-md text-xs sm:text-sm font-semibold">
                  Projetos
                </TabsTrigger>
              </TabsList>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground"
                onClick={() => admin.reload()}
                disabled={admin.loading}
                aria-label="Recarregar dados"
              >
                <RefreshCw className={admin.loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                <span className="hidden sm:inline">Recarregar</span>
              </Button>
            </div>

            <TabsContent value="acessos" className="mt-4">
              <Card className="border-border/80 bg-card shadow-xl p-4 sm:p-6 space-y-8 min-w-0">
                <AccessMatrix
                  overview={overview}
                  pendingKeys={admin.pendingKeys}
                  onChangeProjectMember={admin.changeProjectMember}
                  onChangeWorkspaceRole={(userId, role) => admin.changeWorkspaceMember({ user_id: userId, role })}
                  onRemoveMember={(userId) => admin.changeWorkspaceMember({ user_id: userId, role: null })}
                />
                <PendingInvites invites={overview.invites} />
              </Card>
            </TabsContent>

            <TabsContent value="projetos" className="mt-4">
              <Card className="border-border/80 bg-card shadow-xl p-4 sm:p-6 min-w-0">
                <ProjectsTable overview={overview} pendingKeys={admin.pendingKeys} onAction={admin.runProjectAction} />
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

const TONES = {
  blue: "bg-blue-500/10 text-blue-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  amber: "bg-amber-500/10 text-amber-500",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
}) {
  return (
    <Card className="p-4 sm:p-5 border-border/80 bg-card shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function ErrorCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={AlertTriangle}
      variant="card"
      title="Não foi possível carregar a administração"
      description={message}
      actionLabel={onRetry ? "Tentar novamente" : undefined}
      actionIcon={RefreshCw}
      onAction={onRetry}
    />
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando acessos">
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[92px] rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-10 w-48 rounded-lg" />
      <Card className="border-border/80 bg-card p-4 sm:p-6 space-y-3">
        <Skeleton className="h-9 w-full sm:w-72" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-14 w-[210px] shrink-0" />
            <Skeleton className="h-14 flex-1" />
          </div>
        ))}
      </Card>
    </div>
  );
}
