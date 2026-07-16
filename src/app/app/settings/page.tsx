"use client";
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPAClient } from "@/lib/supabase/client";
import { User, Key, CheckCircle, Bell, Send, Loader2, Clock, Mail } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  telegram_chat_id: string | null;
  telegram_username: string | null;
  timezone: string;
  notify_by_email: boolean;
  notify_by_telegram: boolean;
}

interface Subscriber {
  project_id: string;
  telegram_enabled: boolean;
  email_enabled: boolean;
  notify_on_stage_change: boolean;
  notify_on_due_soon: boolean;
  notify_on_overdue: boolean;
  notify_on_assigned: boolean;
  due_soon_hours: number;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

export default function SettingsPage() {
  const { user } = useGlobal();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [subscribers, setSubscribers] = useState<Record<string, Subscriber>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  // Carregar profile + projects + subscribers
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadError(null);
      const supabase = createSPAClient();

      try {
        // 1. Profile (RLS permite SELECT do próprio profile)
        const { data: existing, error: profileErr } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileErr) {
          throw new Error(`Erro ao ler perfil: ${profileErr.message}`);
        }

        let p: Profile | null = (existing as Profile | null) ?? null;

        // Auto-criar profile stub se não existir (requer migration
        // 20260716000000_fix_profile_insert_policies.sql aplicada)
        if (!p) {
          const stub = {
            id: user.id,
            email: user.email ?? "",
            full_name: null,
            timezone: "America/Sao_Paulo",
            notify_by_email: true,
            notify_by_telegram: true,
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const profilesClient = supabase.from("profiles") as any;
          const { data: created, error: createErr } = await profilesClient
            .insert(stub)
            .select("*")
            .single();

          if (createErr) {
            throw new Error(
              `Não foi possível criar seu perfil (RLS bloqueou INSERT). ` +
                `Aplique a migration 20260716000000_fix_profile_insert_policies.sql ` +
                `no Supabase Dashboard. Detalhes: ${createErr.message}`
            );
          }
          if (created) p = created as Profile;
        }
        setProfile(p);

        // 2. Projects do user
        const { data: projs, error: projErr } = await supabase
          .from("projects")
          .select("id, name")
          .order("name");
        if (projErr) {
          throw new Error(`Erro ao listar projetos: ${projErr.message}`);
        }
        setProjects(projs || []);

        // 3. Subscriber prefs por projeto
        const { data: subs, error: subsErr } = await supabase
          .from("notification_subscribers")
          .select("*")
          .eq("user_id", user.id);
        if (subsErr) {
          throw new Error(
            `Erro ao ler preferências de notificação: ${subsErr.message}`
          );
        }

        const map: Record<string, Subscriber> = {};
        ((subs || []) as unknown as Subscriber[]).forEach((s) => {
          map[s.project_id] = s;
        });
        setSubscribers(map);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Erro ao carregar configurações";
        console.error("[Settings] load error:", err);
        setLoadError(msg);
      }
    })();
  }, [user, retryNonce]);

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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
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
    if (!user || !profile) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createSPAClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("profiles") as any)
        .update({ telegram_chat_id: profile.telegram_chat_id })
        .eq("id", user.id);
      if (error) throw error;
      setSuccess("Telegram Chat ID salvo no perfil!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  async function handleTestTelegram() {
    if (!profile?.telegram_chat_id) {
      setError("Preencha o Chat ID primeiro");
      return;
    }
    setTestingTelegram(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: profile.telegram_chat_id }),
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

  async function toggleSubscriberPref(
    projectId: string,
    field: keyof Subscriber,
    value: boolean | number | string
  ) {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = createSPAClient();
      const existing = subscribers[projectId];

      const payload = {
        user_id: user.id,
        project_id: projectId,
        telegram_enabled: existing?.telegram_enabled ?? true,
        email_enabled: existing?.email_enabled ?? true,
        notify_on_stage_change: existing?.notify_on_stage_change ?? true,
        notify_on_due_soon: existing?.notify_on_due_soon ?? true,
        notify_on_overdue: existing?.notify_on_overdue ?? true,
        notify_on_assigned: existing?.notify_on_assigned ?? true,
        due_soon_hours: existing?.due_soon_hours ?? 24,
        quiet_hours_start: existing?.quiet_hours_start ?? null,
        quiet_hours_end: existing?.quiet_hours_end ?? null,
        telegram_chat_id: profile?.telegram_chat_id ?? null,
        [field]: value,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("notification_subscribers") as any)
        .upsert(payload, { onConflict: "project_id,user_id" });

      if (error) throw error;

      setSubscribers((prev) => ({
        ...prev,
        [projectId]: { ...(prev[projectId] || ({} as Subscriber)), [field]: value },
      }));
      setSuccess(`Preferência salva!`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  if (loadError) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">Conta, notificações e integrações</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            <div className="font-semibold mb-1">
              Não foi possível carregar as configurações
            </div>
            <div className="text-sm mb-3 whitespace-pre-wrap">{loadError}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRetryNonce((n) => n + 1)}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">
          Carregando configurações...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
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
          <CardDescription>Informações da sua conta (salvas no Supabase)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="mt-1 text-sm">{profile.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <p className="mt-1 text-sm">{profile.full_name || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Timezone</label>
              <p className="mt-1 text-sm">{profile.timezone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">User ID</label>
              <p className="mt-1 text-xs font-mono truncate">{profile.id}</p>
            </div>
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
              value={profile.telegram_chat_id || ""}
              onChange={(e) =>
                setProfile({ ...profile, telegram_chat_id: e.target.value })
              }
              placeholder="Ex: 123456789"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Pra descobrir: abra o Telegram → procure <span className="font-mono">@userinfobot</span> → mande /start.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveTelegram} disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestTelegram}
              disabled={testingTelegram || !profile.telegram_chat_id}
            >
              <Send className="mr-2 h-4 w-4" />
              {testingTelegram ? "Enviando..." : "Enviar teste"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences por Projeto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Preferências de notificação por projeto
          </CardTitle>
          <CardDescription>
            Configure quando você quer receber alertas em cada projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Você ainda não tem projetos. Crie um em /app/projects pra configurar notificações.
            </p>
          ) : (
            <div className="space-y-6">
              {projects.map((proj) => {
                const sub = subscribers[proj.id];
                return (
                  <div key={proj.id} className="border rounded-lg p-4 space-y-3">
                    <div className="font-semibold text-base">{proj.name}</div>

                    {/* Canais */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sub?.telegram_enabled ?? true}
                          onChange={(e) =>
                            toggleSubscriberPref(proj.id, "telegram_enabled", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300"
                          disabled={loading}
                        />
                        <span className="text-sm">📱 Telegram</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sub?.email_enabled ?? true}
                          onChange={(e) =>
                            toggleSubscriberPref(proj.id, "email_enabled", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300"
                          disabled={loading}
                        />
                        <span className="text-sm">📧 Email</span>
                      </label>
                    </div>

                    {/* Tipos de evento */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sub?.notify_on_assigned ?? true}
                          onChange={(e) =>
                            toggleSubscriberPref(proj.id, "notify_on_assigned", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300"
                          disabled={loading}
                        />
                        <span className="text-sm">📥 Quando me atribuírem tarefa</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sub?.notify_on_stage_change ?? true}
                          onChange={(e) =>
                            toggleSubscriberPref(proj.id, "notify_on_stage_change", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300"
                          disabled={loading}
                        />
                        <span className="text-sm">🔄 Quando tarefa muda de etapa</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sub?.notify_on_due_soon ?? true}
                          onChange={(e) =>
                            toggleSubscriberPref(proj.id, "notify_on_due_soon", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300"
                          disabled={loading}
                        />
                        <span className="text-sm">⏰ Tarefa perto de vencer</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sub?.notify_on_overdue ?? true}
                          onChange={(e) =>
                            toggleSubscriberPref(proj.id, "notify_on_overdue", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-gray-300"
                          disabled={loading}
                        />
                        <span className="text-sm">🔴 Tarefa atrasada</span>
                      </label>
                    </div>

                    {/* Due soon hours */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <label className="text-sm">Alertar tarefas vencendo em</label>
                      <select
                        value={sub?.due_soon_hours ?? 24}
                        onChange={(e) =>
                          toggleSubscriberPref(proj.id, "due_soon_hours", parseInt(e.target.value))
                        }
                        className="border rounded px-2 py-1 text-sm bg-background"
                        disabled={loading}
                      >
                        <option value={1}>1 hora</option>
                        <option value={3}>3 horas</option>
                        <option value={6}>6 horas</option>
                        <option value={12}>12 horas</option>
                        <option value={24}>24 horas (1 dia)</option>
                        <option value={48}>48 horas (2 dias)</option>
                        <option value={72}>72 horas (3 dias)</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
