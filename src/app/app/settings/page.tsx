"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPAClient } from "@/lib/supabase/client";
import { User, Key, CheckCircle, Bell, Send } from "lucide-react";

export default function SettingsPage() {
  const { user } = useGlobal();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!user) return;
    const stored = window.localStorage.getItem(`chronos:telegram:${user.id}`);
    if (stored) setTelegramChatId(stored);
  }, [user]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }
    if (newPassword.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createSPAClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      setSuccess("Senha atualizada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveTelegram() {
    if (!user) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      window.localStorage.setItem(
        `chronos:telegram:${user.id}`,
        telegramChatId
      );
      // TODO: quando a tabela profiles for criada em Sprint 5,
      // salvar no Supabase ao invés de localStorage
      setSuccess("Telegram Chat ID salvo!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  async function handleTestTelegram() {
    setTestingTelegram(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: telegramChatId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro");
      setSuccess("Mensagem de teste enviada! Verifique seu Telegram.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao enviar teste");
    } finally {
      setTestingTelegram(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Conta, notificações e integrações</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil
          </CardTitle>
          <CardDescription>Informações da sua conta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">User ID</label>
            <p className="mt-1 text-sm font-mono">{user?.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="mt-1 text-sm">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Membro desde
            </label>
            <p className="mt-1 text-sm">
              {user?.registered_at
                ? new Date(user.registered_at).toLocaleDateString("pt-BR")
                : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Senha
          </CardTitle>
          <CardDescription>Atualize sua senha de acesso</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium mb-1.5">
                Nova senha
              </label>
              <Input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5">
                Confirmar nova senha
              </label>
              <Input
                type="password"
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Atualizando..." : "Atualizar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Telegram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Telegram
          </CardTitle>
          <CardDescription>
            Receba notificações de prazos e transições direto no Telegram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div>
            <label htmlFor="chat-id" className="block text-sm font-medium mb-1.5">
              Telegram Chat ID
            </label>
            <Input
              id="chat-id"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Ex: 123456789"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Para descobrir seu chat ID: abra o Telegram, procure por{" "}
              <span className="font-mono">@userinfobot</span> e mande /start.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveTelegram} disabled={loading}>
              Salvar
            </Button>
            <Button
              variant="outline"
              onClick={handleTestTelegram}
              disabled={testingTelegram || !telegramChatId}
            >
              <Send className="mr-2 h-4 w-4" />
              {testingTelegram ? "Enviando..." : "Enviar teste"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
