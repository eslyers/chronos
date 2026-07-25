"use client";

import { useState } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import Link from "next/link";
import { CheckCircle, AlertCircle, Clock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [demoNotice, setDemoNotice] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        setDemoNotice(true);
        return;
      }

      const supabase = createSPAClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao enviar e-mail de redefinição.");
    } finally {
      setLoading(false);
    }
  }

  if (demoNotice) {
    return (
      <div className="text-center space-y-4 animate-fadeIn">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mx-auto font-bold text-2xl">
          🧪
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">Modo Demo Ativo</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          No modo de demonstração local, <strong>não é necessário redefinir a senha</strong>. Você pode fazer login imediatamente com qualquer e-mail e senha!
        </p>
        <div className="pt-4">
          <Button asChild className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold">
            <Link href="/auth/login">Ir para a Tela de Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4 animate-fadeIn">
        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-extrabold tracking-tight">Verifique seu e-mail</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Enviamos um link oficial de redefinição de senha para <strong className="text-foreground">{email}</strong>.
        </p>
        <div className="pt-4">
          <Button asChild variant="outline" className="w-full h-11">
            <Link href="/auth/login">Voltar para o Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2.5 transition-transform hover:scale-105">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20 text-white font-bold">
            <Clock className="h-5 w-5" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
            CHRONOS
          </span>
        </Link>

        <h2 className="text-2xl font-extrabold tracking-tight pt-2">Redefinir Senha</h2>
        <p className="text-sm text-muted-foreground">
          Enviaremos um link de instrução para a sua caixa de entrada
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-foreground uppercase tracking-wider">
            Seu E-mail Cadastrado
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
              placeholder="voce@empresa.com"
              className="pl-10 h-11 text-sm bg-card border-border/80 focus:border-blue-500"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 font-semibold"
        >
          {loading ? "Enviando e-mail..." : "Enviar link de redefinição"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground pt-2">
        Lembrou a senha?{" "}
        <Link href="/auth/login" className="text-blue-500 hover:underline font-bold">
          Voltar ao Login
        </Link>
      </p>
    </div>
  );
}
