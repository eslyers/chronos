"use client";
import React, { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useGlobal } from "@/lib/context/GlobalContext";
import { createSPAClient } from "@/lib/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";
import type { Profile, Subscriber } from "@/components/settings/types";
import { SettingsHeader } from "@/components/settings/SettingsHeader";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PasswordSection } from "@/components/settings/PasswordSection";
import { TelegramSection } from "@/components/settings/TelegramSection";
import { ProjectNotificationsSection } from "@/components/settings/ProjectNotificationsSection";

export default function SettingsPage() {
  const { user, refreshUser } = useGlobal();
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
                `no Supabase Dashboard (ver docs/notes/SUPABASE-FIX-SETTINGS.md). Detalhes: ${createErr.message}`
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

  async function handleSaveProfile() {
    if (!user || !profile) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const supabase = createSPAClient();
      const updatedName = profile.full_name?.trim() || null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profErr } = await (supabase.from("profiles") as any)
        .update({ full_name: updatedName })
        .eq("id", user.id);

      if (profErr) throw profErr;

      // Atualizar também user_metadata no auth
      await supabase.auth.updateUser({
        data: {
          full_name: updatedName,
          name: updatedName,
        },
      });

      await refreshUser();
      setSuccess("Nome do perfil atualizado com sucesso!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar perfil");
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
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
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
    <div className="space-y-8 max-w-4xl animate-fadeIn pb-12">
      {/* Executive Header Banner */}
      <SettingsHeader />

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
      <ProfileSection
        profile={profile}
        onFullNameChange={(value) => setProfile({ ...profile, full_name: value })}
        onSave={handleSaveProfile}
        loading={loading}
      />

      {/* Password */}
      <PasswordSection
        newPassword={newPassword}
        onNewPasswordChange={setNewPassword}
        confirmPassword={confirmPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handlePasswordChange}
        loading={loading}
      />

      {/* Telegram */}
      <TelegramSection
        chatId={profile.telegram_chat_id}
        onChatIdChange={(value) => setProfile({ ...profile, telegram_chat_id: value })}
        onSave={handleSaveTelegram}
        onTest={handleTestTelegram}
        loading={loading}
        testing={testingTelegram}
      />

      {/* Notification Preferences por Projeto */}
      <ProjectNotificationsSection
        projects={projects}
        subscribers={subscribers}
        loading={loading}
        onPrefChange={toggleSubscriberPref}
      />
    </div>
  );
}
