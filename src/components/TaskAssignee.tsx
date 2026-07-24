"use client";

import * as React from "react";
import { UserCircle2 } from "lucide-react";
import { createSPAClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
};

// Cache global de profiles por workspace.
// Key = `list:${workspaceId}` → Profile[]
// Valor `null` significa "já tentamos e não havia membros".
const profileListCache = new Map<string, Profile[] | null>();

function getInitials(p: Profile): string {
  const base = p.full_name || p.email.split("@")[0];
  const parts = base.split(/[._\- ]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function getDisplayName(p: Profile): string {
  return p.full_name || p.email.split("@")[0];
}

// Exportado para invalidar após criar/editar/excluir tarefas
export function clearAssigneeCache() {
  profileListCache.clear();
}

const COLOR_CLASSES = [
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-pink-500/15 text-pink-700 dark:text-pink-300",
];

function colorFor(id: string): string {
  // Hash simples baseado no UUID
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) | 0;
  return COLOR_CLASSES[Math.abs(hash) % COLOR_CLASSES.length];
}

async function fetchWorkspaceProfiles(
  supabase: ReturnType<typeof createSPAClient>,
  workspaceId: string
): Promise<Profile[]> {
  // 1) Members do workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membersClient = supabase.from("workspace_members") as any;
  const { data: members } = await membersClient
    .select("user_id")
    .eq("workspace_id", workspaceId);

  const userIds = ((members || []) as Array<{ user_id: string }>).map((m) => m.user_id);
  if (!userIds.length) return [];

  // 2) Profiles correspondentes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profilesClient = supabase.from("profiles") as any;
  const { data: profs, error } = await profilesClient
    .select("id, email, full_name")
    .in("id", userIds);

  if (error) {
    console.error("[TaskAssignee] profile fetch error:", error);
    return [];
  }

  return (profs || []) as Profile[];
}

export function TaskAssignee({
  assigneeId,
  workspaceId,
  variant = "badge",
}: {
  assigneeId: string | null | undefined;
  workspaceId: string | null | undefined;
  variant?: "badge" | "avatar" | "full";
}) {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(Boolean(assigneeId) && Boolean(workspaceId));
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!assigneeId || !workspaceId) {
        setLoading(false);
        return;
      }

      const cacheKey = `list:${workspaceId}`;
      let list = profileListCache.get(cacheKey);

      if (list === undefined) {
        // Cache miss — fetch
        try {
          const supabase = createSPAClient();
          list = await fetchWorkspaceProfiles(supabase, workspaceId);
          profileListCache.set(cacheKey, list);
        } catch (err) {
          if (!cancelled) {
            console.error("[TaskAssignee] cache fetch failed:", err);
            setError(true);
            setLoading(false);
          }
          return;
        }
      }

      if (cancelled) return;

      const found = list?.find((p) => p.id === assigneeId) ?? null;
      setProfile(found);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [assigneeId, workspaceId]);

  // Sem assignee
  if (!assigneeId) {
    if (variant === "full") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
          <UserCircle2 className="h-3.5 w-3.5" />
          Sem responsável
        </div>
      );
    }
    return null;
  }

  // Loading
  if (loading) {
    return variant === "full" ? (
      <div className="h-5 w-24 bg-muted/60 rounded animate-pulse" />
    ) : null;
  }

  // Error durante fetch
  if (error) {
    return (
      <span
        title="Não foi possível carregar o responsável"
        className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-muted text-muted-foreground text-[10px] border border-dashed"
      >
        ?
      </span>
    );
  }

  // Profile não encontrado (ex: deletado)
  if (!profile) {
    if (variant === "full") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
          <UserCircle2 className="h-3.5 w-3.5" />
          Responsável removido
        </div>
      );
    }
    return null;
  }

  const initials = getInitials(profile);
  const name = getDisplayName(profile);
  const colorClass = colorFor(profile.id);

  if (variant === "badge") {
    return (
      <span
        title={`${name} (${profile.email})`}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${colorClass}`}
      >
        <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-current/20 text-[9px] leading-none font-semibold">
          {initials.charAt(0)}
        </span>
        <span className="max-w-[80px] truncate">{name}</span>
      </span>
    );
  }

  if (variant === "avatar") {
    return (
      <span
        title={`${name} (${profile.email})`}
        className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold ${colorClass}`}
      >
        {initials}
      </span>
    );
  }

  // full (com nome + email)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold ${colorClass}`}
      >
        {initials}
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground text-[10px]">
          {profile.email}
        </span>
      </div>
    </div>
  );
}