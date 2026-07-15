import { createSPAClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Supabase Auth (substitui demo-auth quando Supabase tá configurado)
// ─────────────────────────────────────────────────────────────

export async function signInWithPassword(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSPAClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSPAClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: name ? { name } : undefined,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut(): Promise<void> {
  const supabase = createSPAClient();
  await supabase.auth.signOut();
}

export async function getSession(): Promise<{
  user: { id: string; email: string; name?: string } | null;
}> {
  const supabase = createSPAClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return { user: null };
  const user = data.session.user;
  return {
    user: {
      id: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.name as string | undefined) ?? undefined,
    },
  };
}

export async function signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
  const supabase = createSPAClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
