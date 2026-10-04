"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import { getSession as supabaseGetSession, signOut as supabaseSignOut } from "@/lib/auth/supabase-auth";
import { demoGetSession, demoSignOut } from "@/lib/auth/demo-auth";

type AppUser = {
  email: string;
  id: string;
  registered_at: Date;
};

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export const MASTER_ADMIN_EMAIL = "eslyers@gmail.com";

interface GlobalContextType {
  loading: boolean;
  user: AppUser | null;
  workspaceRole: WorkspaceRole | null;
  isWorkspaceAdmin: boolean;
  isMasterAdmin: boolean;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);

  const isMasterAdmin = user?.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
  const isWorkspaceAdmin = isMasterAdmin || workspaceRole === "owner" || workspaceRole === "admin";

  const fetchRole = React.useCallback(async (uid: string) => {
    if (!isSupabaseConfigured()) {
      try {
        const { getDemoCurrentUser } = await import("@/app/app/users/_lib/members");
        const demoUser = getDemoCurrentUser();
        setWorkspaceRole(demoUser.role);
      } catch {
        setWorkspaceRole("owner");
      }
      return;
    }

    try {
      const { getCurrentWorkspaceId } = await import("@/lib/data/supabase-data");
      const wsId = await getCurrentWorkspaceId();
      if (!wsId) return;

      const supabase = createSPAClient();
      const { data: ws } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", wsId)
        .eq("user_id", uid)
        .maybeSingle();

      const memberRecord = ws as { role?: string } | null;
      if (memberRecord?.role) {
        setWorkspaceRole(memberRecord.role as WorkspaceRole);
      } else {
        setWorkspaceRole("member");
      }
    } catch (err) {
      console.error("[GlobalContext] Error loading user role:", err);
      setWorkspaceRole("member");
    }
  }, []);

  useEffect(() => {
    // Modo DEMO: usa sessão do localStorage
    if (!isSupabaseConfigured()) {
      const session = demoGetSession();
      if (session) {
        setUser({
          email: session.user.email,
          id: session.user.id,
          registered_at: new Date(session.user.created_at),
        });
        fetchRole(session.user.id);
      }
      setLoading(false);
      return;
    }

    // Modo PRODUÇÃO: usa Supabase Auth
    const supabase = createSPAClient();

    async function loadUser() {
      try {
        const { user: authUser } = await supabaseGetSession();
        if (authUser) {
          setUser({
            email: authUser.email,
            id: authUser.id,
            registered_at: new Date(),
          });
          await fetchRole(authUser.id);
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Listener para mudança de auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email!,
          id: session.user.id,
          registered_at: new Date(session.user.created_at),
        });
        fetchRole(session.user.id);
      } else {
        setUser(null);
        setWorkspaceRole(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const refreshRole = React.useCallback(async () => {
    if (user?.id) {
      await fetchRole(user.id);
    }
  }, [user?.id, fetchRole]);

  async function signOut() {
    if (!isSupabaseConfigured()) {
      demoSignOut();
      setUser(null);
      setWorkspaceRole(null);
      window.location.href = "/";
      return;
    }
    await supabaseSignOut();
    setUser(null);
    setWorkspaceRole(null);
    window.location.href = "/";
  }

  return (
    <GlobalContext.Provider
      value={{
        loading,
        user,
        workspaceRole,
        isWorkspaceAdmin,
        isMasterAdmin,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
}

export const useGlobal = () => {
  const context = useContext(GlobalContext);
  if (context === undefined) {
    throw new Error("useGlobal must be used within a GlobalProvider");
  }
  return context;
};
