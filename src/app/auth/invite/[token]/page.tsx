"use client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — /auth/invite/[token]
// Landing page para usuários convidados.
// Exibe os detalhes do workspace e convite, permitindo que o usuário
// crie/defina sua senha de acesso e entre diretamente no sistema.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState, use, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import { createSPAClient } from "@/lib/supabase/client";
import { Building2, Eye, EyeOff, Lock, User, ArrowRight } from "lucide-react";

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
  admin: "Pode gerenciar tarefas, etapas e cronograma",
  member: "Pode interagir no kanban, atualizar tarefas e apontamentos",
  viewer: "Pode apenas visualizar tarefas e cronogramas",
};

function InvitePageInner({ token }: { token: string }) {
  const router = useRouter();

  // ── Estado do convite ──
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── Form de definição de senha ──
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  // ── Aceitar convite: definir senha + login automático ───────
  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    if (!invite) return;
    setFormError(null);

    if (password.length < 8) {
      setFormError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("As senhas não coincidem. Digite a mesma senha em ambos os campos.");
      return;
    }

    setSubmitting(true);

    try {
      // 1. Cria conta ou atualiza credenciais + aceita convite via admin server-side
      const acceptRes = await fetch("/api/invites/accept-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email: invite.email,
          password,
          name: name.trim() || undefined,
        }),
      });
      const acceptJson = await acceptRes.json();

      if (!acceptRes.ok) {
        throw new Error(acceptJson.error || "Falha ao aceitar convite");
      }

      // 2. Limpar qualquer sessão antiga no browser antes de autenticar
      const supabase = createSPAClient();
      await supabase.auth.signOut().catch(() => {});

      // 3. SignIn client-side com as credenciais recém-definidas
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invite.email,
        password,
      });

      if (signInError) {
        // Redireciona para o login caso a sessão automática requeira autenticação manual
        router.push(`/auth/login?email=${encodeURIComponent(invite.email)}`);
        return;
      }

      // 4. Redirecionar para o painel principal
      router.push("/app");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao configurar senha e entrar");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: loading ──────────────────────────────────────────
  if (loadingInvite) {
    return (
      <div className="text-center space-y-4 py-12">
        <div className="text-4xl animate-bounce">⏳</div>
        <p className="text-sm text-muted-foreground">Carregando detalhes do convite…</p>
      </div>
    );
  }

  // ── Render: erro de convite ──────────────────────────────────
  if (loadError || !invite) {
    return (
      <div className="space-y-6 text-center py-6">
        <div className="text-5xl">❌</div>
        <h2 className="text-2xl font-bold tracking-tight">Convite não localizado</h2>
        <Alert variant="destructive">
          <AlertDescription>{loadError || "Convite não encontrado"}</AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          O link pode estar incorreto, ter expirado ou sido revogado.
        </p>
        <Button asChild variant="outline">
          <Link href="/auth/login">Ir para tela de login</Link>
        </Button>
      </div>
    );
  }

  // ── Render: convite expirado ou revogado ──────────────────────
  if (invite.status !== "pending") {
    const statusLabel: Record<string, { emoji: string; title: string; msg: string }> = {
      accepted: {
        emoji: "✅",
        title: "Convite já aceito",
        msg: "Este convite já foi ativado anteriormente. Faça login para acessar o workspace.",
      },
      revoked: {
        emoji: "🚫",
        title: "Convite cancelado",
        msg: "Este convite foi revogado pelo administrador do workspace.",
      },
      expired: {
        emoji: "⏰",
        title: "Convite expirado",
        msg: "O prazo deste convite expirou. Solicite um novo link ao gestor do workspace.",
      },
    };
    const info = statusLabel[invite.status] ?? statusLabel.expired!;
    return (
      <div className="space-y-6 text-center py-6">
        <div className="text-5xl">{info.emoji}</div>
        <h2 className="text-2xl font-bold tracking-tight">{info.title}</h2>
        <p className="text-sm text-muted-foreground">{info.msg}</p>
        <Button asChild className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white">
          <Link href={`/auth/login?email=${encodeURIComponent(invite.email)}`}>
            Acessar com Login
          </Link>
        </Button>
      </div>
    );
  }

  // ── Render: Formulário para Criar Senha e Logar ───────────────
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
          <span className="text-3xl">🕐</span>
          <span>CHRONOS</span>
        </Link>
        <h2 className="text-xl font-bold text-foreground">Você foi convidado para colaborar</h2>
        <p className="text-sm text-muted-foreground">Crie sua senha de acesso para ativar sua conta</p>
      </div>

      {/* Card com dados do workspace e remetente */}
      <div className="rounded-xl border border-border/80 bg-card/70 p-4.5 space-y-3.5 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500 font-bold text-xl">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate text-base">{invite.workspace_name}</p>
            <p className="text-xs text-muted-foreground">
              Convidado por {invite.invited_by_name || invite.invited_by_email.split("@")[0]}
            </p>
          </div>
          <span
            className={
              "text-xs px-2.5 py-1 rounded-full font-medium shrink-0 " +
              (invite.role === "admin"
                ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                : invite.role === "member"
                ? "bg-orange-500/15 text-orange-700 dark:text-orange-300"
                : "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300")
            }
          >
            {ROLE_LABEL[invite.role]}
          </span>
        </div>

        <div className="text-xs text-muted-foreground/90 border-t border-border/40 pt-3">
          <p>{ROLE_DESC[invite.role]}</p>
        </div>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Formulário de criação de senha */}
      <form onSubmit={handleAccept} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Email Convidado
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            value={invite.email}
            disabled
            className="bg-muted/70 text-muted-foreground cursor-not-allowed font-medium"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Seu Nome <span className="text-muted-foreground/70 normal-case font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Como deseja ser chamado"
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Crie sua Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
              minLength={8}
              className="pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5"
          >
            Confirme sua Senha
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a senha novamente"
              minLength={8}
              className="pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showConfirmPassword ? "Ocultar senha" : "Ver senha"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-medium py-2.5 shadow-sm transition-all"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Ativando conta e entrando…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Criar Senha e Entrar no Workspace
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground pt-2">
        Já possui conta ativa e lembra sua senha?{" "}
        <Link
          href={`/auth/login?email=${encodeURIComponent(invite.email)}`}
          className="text-orange-600 dark:text-orange-400 hover:underline font-semibold"
        >
          Fazer login diretamente
        </Link>
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
    <Suspense fallback={<div className="p-4 text-center text-sm text-muted-foreground">Carregando…</div>}>
      <InvitePageInner token={token} />
    </Suspense>
  );
}