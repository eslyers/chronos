"use client";
import { useState, useEffect } from "react";
import { createSPAClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { CheckCircle, Key } from "lucide-react";
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
    const supabase = createSPAClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setError("Link inválido ou expirado. Solicite nova redefinição.");
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
      const supabase = createSPAClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => router.push("/app"), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
        <h2 className="text-2xl font-bold">Senha redefinida!</h2>
        <p className="text-sm text-muted-foreground">
          Redirecionando para o app...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Key className="h-12 w-12 text-primary-600 mx-auto" />
        <h2 className="text-2xl font-bold">Criar nova senha</h2>
      </div>

      {error && validSession === false ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {validSession && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium mb-1.5">
              Nova senha
            </label>
            <Input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5">
              Confirmar nova senha
            </label>
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Mínimo 8 caracteres
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </form>
      )}
    </div>
  );
}
