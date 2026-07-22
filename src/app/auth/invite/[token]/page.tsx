"use client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — /auth/invite/[token]
// Landing page pra quem clicou no link do email de convite.
// Mostra "Você foi convidado pro workspace X" + form de criar conta
// pré-preenchido com o email do convite. Ao aceitar:
//   1. Faz signUpWithPassword (cria user no Supabase auth.users)
//   2. Chama RPC accept_invite_token(p_token, p_user_id) via admin client
//      (a função RPC server-side adiciona o user em workspace_members)
//   3. Redireciona pro /app
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import { signUpWithPassword } from "@/lib/auth/supabase-auth";
import { createSPAClient } from "@/lib/supabase/client";

// ── Tipos ──────────────────────────────────────────────────────
interface InviteInfo {
  email: string;
  workspace_id: string;
  workspace_name: string;
  role: "admin" | "member" | "viewer";
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  invited_by_name: string | null;
  invited_by_email: string;
}

const ROLE_LABEL: Record<InviteInfo["role"], string> = {
  admin: "Admin",
  member: "Membro",
  viewer: "Visualizador",
};

const ROLE_DESC: Record<InviteInfo["role"], string> = {
  admin: "Pode convidar, criar e editar tudo no workspace",
  member: "Pode criar e editar tarefas, mas não gerenciar membros",
  viewer: "Pode apenas visualizar tarefas e cronogramas",
};

function InvitePageInner({ token }: { token: string }) {
  const router = useRouter();

  // ── Estado do convite (carregado server-side via serverAction) ──
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Form de signup ──
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // ── Carregar info do convite ─────────────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoadError(
        "Sistema em modo demo. Convites só funcionam com Supabase configurado."
      );
      setLoadingInvite(false);
      return;
    }

    let cancelled = false;

    async function loadInvite() {
      try {
        // Server-side fetch via POST pra evitar expor admin key
        const res = await fetch(`/api/invites/lookup?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (cancelled) return;

        if (!res.ok || !json.invite) {
          setLoadError(json.error || "Convite não encontrado");
        } else {
          setInvite(json.invite);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error ? err.message : "Erro ao carregar convite"
          );
        }
      } finally {
        if (!cancelled) setLoadingInvite(false);
      }
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── Aceitar convite: signUp + RPC ─────────────────────────────
  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setFormError(null);

    if (password.length < 8) {
      setFormError("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("As senhas não coincidem");
      return;
    }

    setSubmitting(true);

    try {
      // ── 1. Criar conta no Supabase auth ──
      const signUpResult = await signUpWithPassword(invite.email, password, name);
      if (!signUpResult.ok) throw new Error(signUpResult.error);

      // Aguardar sessão ser criada (signUp com auto-confirm retorna sessão)
      const supabase = createSPAClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        throw new Error(
          "Conta criada, mas sessão não foi estabelecida. Verifique se email precisa confirmar antes de entrar."
        );
      }

      // ── 2. Aceitar o convite (chama RPC accept_invite_token) ──
      const acceptRes = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, user_id: userId }),
      });
      const acceptJson = await acceptRes.json();
      if (!acceptRes.ok) {
        throw new Error(acceptJson.error || "Falha ao aceitar convite");
      }

      // ── 3. Sucesso: redirecionar pro /app ──
      router.push("/app");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao aceitar convite");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: loading ──────────────────────────────────────────
  if (loadingInvite) {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">⏳</div>
        <p className="text-sm text-muted-foreground">Carregando convite…</p>
      </div>
    );
  }

  // ── Render: erro de convite ──────────────────────────────────
  if (loadError || !invite) {
    return (
      <div className="space-y-6 text-center">
        <div className="text-5xl">❌</div>
        <h2 className="text-2xl font-semibold">Convite inválido</h2>
        <Alert variant="destructive">
          <AlertDescription>{loadError || "Convite não encontrado"}</AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          O link pode ter expirado ou já ter sido usado.
        </p>
        <Link
          href="/auth/login"
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          Ir para login
        </Link>
      </div>
    );
  }

  // ── Render: convite expirado/revocado ─────────────────────────
  if (invite.status !== "pending") {
    const statusLabel: Record<string, { emoji: string; msg: string }> = {
      accepted: { emoji: "✅", msg: "Este convite já foi aceito. Faça login para entrar." },
      revoked: { emoji: "🚫", msg: "Este convite foi revogado pelo administrador." },
      expired: { emoji: "⏰", msg: "Este convite expirou. Peça um novo ao administrador." },
    };
    const info = statusLabel[invite.status] ?? statusLabel.expired!;
    return (
      <div className="space-y-6 text-center">
        <div className="text-5xl">{info.emoji}</div>
        <h2 className="text-2xl font-semibold">Convite {invite.status}</h2>
        <p className="text-sm text-muted-foreground">{info.msg}</p>
        <Link
          href="/auth/login"
          className="text-sm text-primary-600 hover:text-primary-500"
        >
          Ir para login
        </Link>
      </div>
    );
  }

  // ── Render: form de signup ──────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold">
          <span className="text-3xl">🕐</span>
          <span>CHRONOS</span>
        </Link>
        <p className="text-sm text-muted-foreground">Você foi convidado para um workspace</p>
      </div>

      {/* Card de info do convite */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <div className="flex items-center gap-3">
          <div className="text-3xl">📨</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{invite.workspace_name}</p>
            <p className="text-xs text-muted-foreground">
              Convidado por {invite.invited_by_name || invite.invited_by_email.split("@")[0]}
            </p>
          </div>
          <span
            className={
              "text-xs px-2 py-1 rounded font-medium " +
              (invite.role === "admin"
                ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                : invite.role === "member"
                ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                : "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300")
            }
          >
            {ROLE_LABEL[invite.role]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{ROLE_DESC[invite.role]}</p>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleAccept} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={invite.email}
            disabled
            className="bg-muted"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Seu nome <span className="text-muted-foreground">(opcional)</span>
          </label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como você quer ser chamado"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">
            Senha
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium mb-1.5"
          >
            Confirmar senha
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Aceitando convite…" : "Aceitar convite e criar conta"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href={`/auth/login?email=${encodeURIComponent(invite.email)}`}
          className="text-primary-600 hover:text-primary-500 font-medium"
        >
          Faça login
        </Link>{" "}
        — o convite será aplicado automaticamente após o login.
      </p>
    </div>
  );
}

// useParams / dynamic route: Suspense boundary obrigatório no Next.js 15
export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  return (
    <Suspense fallback={<div className="p-4 text-muted-foreground">Carregando…</div>}>
      <InvitePageInner token={token} />
    </Suspense>
  );
}