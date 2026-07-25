"use client";

import { useState, useEffect } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/mode";
import { useRouter } from "next/navigation";
import { CheckCircle, Key, Lock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setValidSession(true);
      return;
    }
    const supabase = createSPAClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setError("Link inválido ou expirado. Solicite uma nova redefinição.");
        setValidSession(false);
      } else {
        setValidSession(true);
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const supabase = createSPAClient();
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
      }
      setSuccess(true);
      setTimeout(() => router.push("/app"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4 animate-fadeIn">
        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-extrabold tracking-tight">Senha Redefinida!</h2>
        <p className="text-sm text-muted-foreground">
          Redirecionando para o painel...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mx-auto font-bold mb-2">
          <Key className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight">Criar Nova Senha</h2>
        <p className="text-sm text-muted-foreground">
          Escolha uma senha forte de no mínimo 8 caracteres
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs font-medium">{error}</AlertDescription>
        </Alert>
      )}

      {validSession && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="block text-xs font-semibold uppercase tracking-wider">
              Nova Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                className="pl-10 h-11 text-sm bg-card border-border/80 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-wider">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
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
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
              </span>
            ) : (
              "Salvar Nova Senha"
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
