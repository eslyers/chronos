"use client";

import { isSupabaseConfigured } from "@/lib/supabase/mode";
import { signInWithPassword, signInWithGoogle } from "@/lib/auth/supabase-auth";
import { demoSignIn } from "@/lib/auth/demo-auth";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/app";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        demoSignIn(email, password);
        router.push(redirectTo);
        router.refresh();
        return;
      }

      const result = await signInWithPassword(email, password);
      if (!result.ok) throw new Error(result.error);
      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (!isSupabaseConfigured()) {
      setError("Login com Google requer Supabase configurado. Use email/senha no modo demo.");
      return;
    }
    if (typeof window !== "undefined" && redirectTo !== "/app") {
      const url = new URL(window.location.href);
      url.searchParams.set("redirect", redirectTo);
      window.history.replaceState({}, "", url.toString());
    }
    const result = await signInWithGoogle();
    if (!result.ok) {
      setError(result.error || "Erro ao iniciar login com Google");
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 transition-transform hover:scale-105">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20 text-white font-bold">
            <Clock className="h-5 w-5" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            CHRONOS
          </span>
        </Link>

        <h2 className="text-2xl font-extrabold tracking-tight pt-2">Acesse sua Conta</h2>

        <div className="flex items-center justify-center gap-2 pt-1">
          {isSupabaseConfigured() ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[11px]">
              <ShieldCheck className="h-3 w-3 mr-1" /> Conexão Segura SSL
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[11px]">
              🧪 Modo Demo — Qualquer e-mail/senha funciona
            </Badge>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            E-mail Corporativo
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.nome@empresa.com"
              className="pl-10 h-11 text-sm bg-card border-border/80 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-semibold text-foreground uppercase tracking-wider">
              Senha
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-blue-500 hover:underline font-medium"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              className="pl-10 h-11 text-sm bg-card border-border/80 focus:border-blue-500"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 font-semibold"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Entrar na Plataforma <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground font-medium">
            ou acesse com
          </span>
        </div>
      </div>

      {/* Google OAuth Option */}
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleLogin}
        className="w-full h-11 text-sm border-border/80 hover:bg-muted font-medium flex items-center justify-center gap-2"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        Continuar com Google
      </Button>

      {/* Footer Registration Link */}
      <p className="text-center text-xs text-muted-foreground pt-2">
        Ainda não possui uma conta?{" "}
        <Link href="/auth/register" className="text-blue-500 hover:underline font-bold">
          Criar conta gratuitamente
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}