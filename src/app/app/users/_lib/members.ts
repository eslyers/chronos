// ─────────────────────────────────────────────────────────────
// CHRONOS — Members data layer (demo + production ready)
// Demo: localStorage
// Production: Supabase (workspace_members + profiles + invite_tokens)
// ─────────────────────────────────────────────────────────────

import { isSupabaseConfigured } from "@/lib/supabase/mode";
import { createSPAClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";
export type MemberStatus = "active" | "invited";

export interface Member {
  id: string;
  workspace_id: string;
  user_id?: string; // só existe pra active (não pra invited)
  email: string;
  full_name?: string | null;
  role: WorkspaceRole;
  status: MemberStatus;
  invited_by?: string;
  invited_at?: string;
  accepted_at?: string;
  last_active_at?: string;
  avatar_color?: string;
}

export interface InviteToken {
  token: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  invited_by: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  created_at: string;
}

// ── Demo storage helpers ─────────────────────────────────────

const DEMO_MEMBERS_KEY = "chronos:demo:members";
const DEMO_INVITES_KEY = "chronos:demo:invites";
const DEMO_WORKSPACE_KEY = "chronos:demo:workspace";

export function getDemoWorkspaceId(): string {
  if (typeof window === "undefined") return "demo-workspace";
  let id = window.localStorage.getItem(DEMO_WORKSPACE_KEY);
  if (!id) {
    id = `ws-demo-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(DEMO_WORKSPACE_KEY, id);
  }
  return id;
}

export function getDemoCurrentUser(): { id: string; email: string; role: WorkspaceRole } {
  if (typeof window === "undefined") return { id: "demo-user", email: "demo@chronos.local", role: "owner" };
  const stored = window.localStorage.getItem("chronos:demo:current-user");
  if (stored) return JSON.parse(stored);
  // Owner padrão do demo
  const owner = { id: "demo-owner", email: "owner@chronos.local", role: "owner" as const };
  window.localStorage.setItem("chronos:demo:current-user", JSON.stringify(owner));
  return owner;
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ── Demo CRUD ────────────────────────────────────────────────

export const demoMembers: {
  list: (workspaceId: string) => Member[];
  create: (member: Member) => void;
  update: (id: string, patch: Partial<Member>) => void;
  remove: (id: string) => void;
  seedIfEmpty: (workspaceId: string, ownerId: string) => void;
} = {
  list: (workspaceId) => {
    const all = readJSON<Member[]>(DEMO_MEMBERS_KEY, []);
    return all.filter((m) => m.workspace_id === workspaceId);
  },
  create: (member) => {
    const all = readJSON<Member[]>(DEMO_MEMBERS_KEY, []);
    all.push(member);
    writeJSON(DEMO_MEMBERS_KEY, all);
  },
  update: (id, patch) => {
    const all = readJSON<Member[]>(DEMO_MEMBERS_KEY, []);
    const idx = all.findIndex((m) => m.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...patch };
      writeJSON(DEMO_MEMBERS_KEY, all);
    }
  },
  remove: (id) => {
    const all = readJSON<Member[]>(DEMO_MEMBERS_KEY, []);
    writeJSON(DEMO_MEMBERS_KEY, all.filter((m) => m.id !== id));
  },
  seedIfEmpty: (workspaceId, ownerId) => {
    const all = readJSON<Member[]>(DEMO_MEMBERS_KEY, []);
    if (all.length > 0) return;
    const owner: Member = {
      id: `m-${Math.random().toString(36).slice(2, 10)}`,
      workspace_id: workspaceId,
      user_id: ownerId,
      email: "owner@chronos.local",
      full_name: "Owner (demo)",
      role: "owner",
      status: "active",
      avatar_color: "#f97316",
    };
    writeJSON(DEMO_MEMBERS_KEY, [owner]);
  },
};

export const demoInvites: {
  list: (workspaceId: string) => InviteToken[];
  create: (invite: InviteToken) => void;
  revoke: (token: string) => void;
} = {
  list: (workspaceId) => {
    const all = readJSON<InviteToken[]>(DEMO_INVITES_KEY, []);
    return all.filter((i) => i.workspace_id === workspaceId);
  },
  create: (invite) => {
    const all = readJSON<InviteToken[]>(DEMO_INVITES_KEY, []);
    all.push(invite);
    writeJSON(DEMO_INVITES_KEY, all);
  },
  revoke: (token) => {
    const all = readJSON<InviteToken[]>(DEMO_INVITES_KEY, []);
    const idx = all.findIndex((i) => i.token === token);
    if (idx >= 0) {
      all[idx].status = "revoked";
      writeJSON(DEMO_INVITES_KEY, all);
    }
  },
};

// ── Production (Supabase) ────────────────────────────────────

export const supabaseMembers: {
  list: (workspaceId: string) => Promise<Member[]>;
  pendingInvites: (workspaceId: string) => Promise<InviteToken[]>;
  revokeInvite: (token: string) => Promise<{ ok: boolean; error?: string }>;
} = {
  list: async (workspaceId) => {
    const supabase: AnyClient = createSPAClient();
    // Workspace members + profiles via join
    const { data, error } = await supabase
      .from("workspace_members")
      .select(`
        user_id,
        role,
        joined_at,
        profiles:profiles (id, email, full_name, avatar_color, last_active_at)
      `)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("[members] load error:", error);
      return [];
    }

    return (data || []).map((row: { user_id: string; role: string; joined_at: string; profiles: { email: string; full_name: string | null; avatar_color: string; last_active_at: string } | null }): Member => ({
      id: row.user_id,
      workspace_id: workspaceId,
      user_id: row.user_id,
      email: row.profiles?.email ?? "(sem email)",
      full_name: row.profiles?.full_name ?? null,
      role: row.role as WorkspaceRole,
      status: "active",
      invited_at: row.joined_at,
      avatar_color: row.profiles?.avatar_color ?? undefined,
      last_active_at: row.profiles?.last_active_at,
    }));
  },
  pendingInvites: async (workspaceId) => {
    const supabase: AnyClient = createSPAClient();
    const { data, error } = await supabase
      .from("invite_tokens")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[members] invites load error:", error);
      return [];
    }
    return (data || []) as InviteToken[];
  },
  revokeInvite: async (token) => {
    const supabase: AnyClient = createSPAClient();
    const { error } = await supabase
      .from("invite_tokens")
      .update({ status: "revoked", updated_at: new Date().toISOString() })
      .eq("token", token);
    return { ok: !error, error: error?.message };
  },
};

// ── Unified facade ───────────────────────────────────────────

export async function loadMembers(workspaceId: string): Promise<Member[]> {
  if (isSupabaseConfigured()) {
    return supabaseMembers.list(workspaceId);
  }
  // Demo mode
  const me = getDemoCurrentUser();
  demoMembers.seedIfEmpty(workspaceId, me.id);
  return demoMembers.list(workspaceId);
}

export async function loadPendingInvites(workspaceId: string): Promise<InviteToken[]> {
  if (isSupabaseConfigured()) {
    return supabaseMembers.pendingInvites(workspaceId);
  }
  return demoInvites.list(workspaceId).filter((i) => i.status === "pending");
}
