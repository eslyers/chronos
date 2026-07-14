"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import { demoGetSession, demoSignOut } from "@/lib/auth/demo-auth";

type AppUser = {
  email: string;
  id: string;
  registered_at: Date;
};

interface GlobalContextType {
  loading: boolean;
  user: AppUser | null;
  signOut: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);

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
      }
      setLoading(false);
      return;
    }

    // Modo PRODUÇÃO: usa Supabase
    const supabase = createSPAClient();

    async function loadUser() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser) {
          setUser({
            email: authUser.email!,
            id: authUser.id,
            registered_at: new Date(authUser.created_at),
          });
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email!,
          id: session.user.id,
          registered_at: new Date(session.user.created_at),
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    if (!isSupabaseConfigured()) {
      demoSignOut();
      setUser(null);
      window.location.href = "/";
      return;
    }
    const supabase = createSPAClient();
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/";
  }

  return (
    <GlobalContext.Provider value={{ loading, user, signOut }}>
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