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


function LoginPageInner() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Captura ?redirect=/app/projects/xxx?task=yyy do middleware
  const redirectTo = searchParams.get("redirect") || "/app";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Modo DEMO (sem Supabase): qualquer email/senha funciona
      if (!isSupabaseConfigured()) {
        demoSignIn(email, password);
        router.push(redirectTo);
        router.refresh();
        return;
      }

      // Modo PRODUÇÃO: Supabase real via helper
      const result = await signInWithPassword(email, password);
      if (!result.ok) throw new Error(result.error);
      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Erro ao fazer login"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (!isSupabaseConfigured()) {
      setError("Login com Google requer Supabase configurado. Use email/senha no modo demo.");
      return;
    }
    // Passa o redirectTo via URL pro supabase-auth.ts pegar
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
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-2xl font-bold"
        >
          <span className="text-3xl">🕐</span>
          <span>CHRONOS</span>
        </Link>
        <p className="text-sm text-muted-foreground">
          {isSupabaseConfigured()
            ? "Entre para gerenciar seus cronogramas"
            : "🧪 Modo demo — qualquer email/senha funciona"}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com"
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
          />
        </div>

        <div className="flex items-center justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-500"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            ou continue com
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={!isSupabaseConfigured()}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/auth/register" className="text-primary-600 hover:text-primary-500 font-medium">
          Crie agora
        </Link>
      </p>
    </div>
  );
}

// useSearchParams() exige Suspense boundary no Next.js 15
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-4 text-muted-foreground">Carregando…</div>}>
      <LoginPageInner />
    </Suspense>
  );
}