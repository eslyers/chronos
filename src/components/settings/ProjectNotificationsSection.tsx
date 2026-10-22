"use client";

import { Mail, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subscriber } from "@/components/settings/types";

type BooleanPref =
  | "telegram_enabled"
  | "email_enabled"
  | "notify_on_assigned"
  | "notify_on_stage_change"
  | "notify_on_due_soon"
  | "notify_on_overdue";

// Canais
const CHANNEL_PREFS: { field: BooleanPref; label: string }[] = [
  { field: "telegram_enabled", label: "📱 Telegram" },
  { field: "email_enabled", label: "📧 Email" },
];

// Tipos de evento
const EVENT_PREFS: { field: BooleanPref; label: string }[] = [
  { field: "notify_on_assigned", label: "📥 Quando me atribuírem tarefa" },
  { field: "notify_on_stage_change", label: "🔄 Quando tarefa muda de etapa" },
  { field: "notify_on_due_soon", label: "⏰ Tarefa perto de vencer" },
  { field: "notify_on_overdue", label: "🔴 Tarefa atrasada" },
];

interface ProjectNotificationsSectionProps {
  projects: { id: string; name: string }[];
  subscribers: Record<string, Subscriber>;
  loading: boolean;
  onPrefChange: (projectId: string, field: keyof Subscriber, value: boolean | number | string) => void;
}

export function ProjectNotificationsSection({
  projects,
  subscribers,
  loading,
  onPrefChange,
}: ProjectNotificationsSectionProps) {
  const renderPref = (projectId: string, sub: Subscriber | undefined, { field, label }: { field: BooleanPref; label: string }) => (
    <label key={field} className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={sub?.[field] ?? true}
        onChange={(e) =>
          onPrefChange(projectId, field, e.target.checked)
        }
        className="h-4 w-4 rounded border-gray-300"
        disabled={loading}
      />
      <span className="text-sm">{label}</span>
    </label>
  );

  return (
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
                    {CHANNEL_PREFS.map((pref) => renderPref(proj.id, sub, pref))}
                  </div>

                  {/* Tipos de evento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                    {EVENT_PREFS.map((pref) => renderPref(proj.id, sub, pref))}
                  </div>

                  {/* Due soon hours */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm">Alertar tarefas vencendo em</label>
                    <Select
                      value={String(sub?.due_soon_hours ?? 24)}
                      onValueChange={(val) =>
                        onPrefChange(proj.id, "due_soon_hours", parseInt(val))
                      }
                      disabled={loading}
                    >
                      <SelectTrigger className="w-[180px] h-8 text-xs font-medium border-border/80 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hora</SelectItem>
                        <SelectItem value="3">3 horas</SelectItem>
                        <SelectItem value="6">6 horas</SelectItem>
                        <SelectItem value="12">12 horas</SelectItem>
                        <SelectItem value="24">24 horas (1 dia)</SelectItem>
                        <SelectItem value="48">48 horas (2 dias)</SelectItem>
                        <SelectItem value="72">72 horas (3 dias)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
