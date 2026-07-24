"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings,
  Loader2,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createSPAClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  type: string;
  status: string;
  channels: string[];
  payload: Record<string, unknown>;
  created_at: string;
  sent_at: string | null;
  read_at: string | null;
  task_id: string | null;
  project_id: string | null;
};

const TYPE_LABELS: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  due_soon: { label: "Prazo próximo", icon: <Clock className="h-3 w-3" />, color: "bg-blue-500/10 text-blue-700" },
  overdue: { label: "Tarefa atrasada", icon: <AlertCircle className="h-3 w-3" />, color: "bg-red-500/10 text-red-700" },
  stage_change: { label: "Mudou de etapa", icon: <CheckCircle2 className="h-3 w-3" />, color: "bg-blue-500/10 text-blue-700" },
  assigned: { label: "Tarefa atribuída", icon: <Bell className="h-3 w-3" />, color: "bg-purple-500/10 text-purple-700" },
  mention: { label: "Mencionado", icon: <Bell className="h-3 w-3" />, color: "bg-indigo-500/10 text-indigo-700" },
  stale_task: { label: "Tarefa parada", icon: <Clock className="h-3 w-3" />, color: "bg-slate-500/10 text-slate-700" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-700" },
  sent: { label: "Enviado", color: "bg-emerald-500/10 text-emerald-700" },
  failed: { label: "Falhou", color: "bg-red-500/10 text-red-700" },
  read: { label: "Lido", color: "bg-slate-500/10 text-slate-700" },
};

const CHANNEL_ICONS: Record<string, string> = {
  telegram: "📱",
  email: "📧",
  push: "🔔",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatPayload(n: Notification): { title: string; subtitle: string } {
  const p = n.payload as Record<string, string | number>;
  const baseTitle =
    (p.title as string) ||
    (p.task_title as string) ||
    "Notificação";

  const project = (p.project as string) || (p.project_name as string);
  const subtitleParts: string[] = [];
  if (project) subtitleParts.push(`📁 ${project}`);

  if (n.type === "stage_change" && p.old_stage && p.new_stage) {
    subtitleParts.push(`🎯 ${p.old_stage} → ${p.new_stage}`);
  } else if (n.type === "due_soon" && p.hours_until_due !== undefined) {
    const h = Number(p.hours_until_due);
    if (h === 0) subtitleParts.push("🔴 VENCE HOJE");
    else if (h === 24) subtitleParts.push("🟠 Vence amanhã");
    else subtitleParts.push(`🟡 Vence em ${h}h`);
  } else if (n.type === "assigned" && p.priority) {
    subtitleParts.push(`⚡ ${p.priority}`);
  } else if (n.type === "overdue") {
    subtitleParts.push("🔴 Atrasada");
  }

  if (p.due_date) {
    const d = new Date(p.due_date as string);
    subtitleParts.push(`📅 ${d.toLocaleDateString("pt-BR")}`);
  }

  return {
    title: baseTitle,
    subtitle: subtitleParts.join(" • ") || "—",
  };
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createSPAClient();
        const { data, error: e } = await supabase
          .from("notifications")
          .select("id, type, status, channels, payload, created_at, sent_at, read_at, task_id, project_id")
          .order("created_at", { ascending: false })
          .limit(100);
        if (e) throw e;
        setNotifications((data ?? []) as Notification[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar notificações");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filtrar
  const filtered = notifications.filter((n) => {
    if (filterType && n.type !== filterType) return false;
    if (filterStatus && n.status !== filterStatus) return false;
    return true;
  });

  // Agrupar por status pra ter resumo no topo
  const counts = notifications.reduce(
    (acc, n) => {
      acc[n.status] = (acc[n.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const hasFilters = filterType || filterStatus;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">
            Histórico de alertas e preferências
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/app/settings">
            <Settings className="mr-2 h-4 w-4" />
            Configurar
          </Link>
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid gap-3 md:grid-cols-4">
        {Object.entries(STATUS_LABELS).map(([key, info]) => (
          <Card
            key={key}
            className={filterStatus === key ? "ring-2 ring-primary" : "cursor-pointer hover:bg-muted/30 transition-colors"}
            onClick={() => setFilterStatus(filterStatus === key ? null : key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{info.label}</p>
                  <p className="text-2xl font-bold mt-1">{counts[key] ?? 0}</p>
                </div>
                <div className={`px-2 py-1 rounded-full ${info.color}`}>
                  <Bell className="h-3 w-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros por tipo */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Filtrar por tipo:</span>
        {Object.entries(TYPE_LABELS).map(([key, info]) => (
          <Badge
            key={key}
            variant={filterType === key ? "default" : "outline"}
            className={`cursor-pointer ${filterType === key ? "" : info.color}`}
            onClick={() => setFilterType(filterType === key ? null : key)}
          >
            {info.icon}
            <span className="ml-1">{info.label}</span>
          </Badge>
        ))}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterType(null); setFilterStatus(null); }}>
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Lista de notificações */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="py-4 text-sm text-red-600">
            ⚠️ {error}
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-sky-500/10 mb-4">
              <Bell className="h-10 w-10 text-sky-600" />
            </div>
            <h2 className="text-2xl font-semibold">Nenhuma notificação ainda</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              O backend de envio automático (Telegram + Email via Edge Functions)
              será ativado quando você tiver tarefas com prazos definidos.
            </p>
            <div className="mt-6 text-xs text-muted-foreground max-w-md text-left space-y-2 bg-muted/30 rounded-lg p-4">
              <p className="font-semibold">Como funciona:</p>
              <p>• Tarefas com prazo recebem alertas em <strong>3, 1, 0 dias</strong> antes</p>
              <p>• Tarefas atrasadas recebem alerta <strong>diário às 09:00</strong></p>
              <p>• Movimentação entre stages gera notificação em tempo real</p>
              <p>• Configurável por projeto (opt-out individual)</p>
              <p>• Canais: <strong>Telegram</strong> (bot + chat_id) e <strong>Email</strong> (Resend)</p>
            </div>
            <Button asChild className="mt-6">
              <Link href="/app/projects">
                Ir para projetos
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Filter className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma notificação corresponde aos filtros
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => { setFilterType(null); setFilterStatus(null); }}>
              Limpar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
            <CardDescription>
              {filtered.length} de {notifications.length} notificações
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {filtered.map((n) => {
              const typeInfo = TYPE_LABELS[n.type] ?? {
                label: n.type,
                icon: <Bell className="h-3 w-3" />,
                color: "bg-slate-500/10 text-slate-700",
              };
              const statusInfo = STATUS_LABELS[n.status] ?? {
                label: n.status,
                color: "bg-slate-500/10 text-slate-700",
              };
              const { title, subtitle } = formatPayload(n);
              const isClickable = !!n.task_id && !!n.project_id;

              const Content = (
                <>
                  <div className={`p-2 rounded-full ${typeInfo.color} flex-shrink-0`}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm truncate">{title}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </Badge>
                      {n.channels.map((ch) => (
                        <span key={ch} className="text-xs" title={ch}>
                          {CHANNEL_ICONS[ch] || ch}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                  {isClickable && (
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </>
              );

              if (isClickable) {
                return (
                  <Link
                    key={n.id}
                    href={`/app/projects/${n.project_id}`}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {Content}
                  </Link>
                );
              }
              return (
                <div key={n.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {Content}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
