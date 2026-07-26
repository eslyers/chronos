"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings,
  ExternalLink,
  Filter,
  X,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  due_soon: { label: "Prazo próximo", icon: <Clock className="h-3 w-3" />, color: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  overdue: { label: "Tarefa atrasada", icon: <AlertCircle className="h-3 w-3" />, color: "bg-red-500/10 text-red-500 border-red-500/30" },
  stage_change: { label: "Mudou de etapa", icon: <CheckCircle2 className="h-3 w-3" />, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  assigned: { label: "Tarefa atribuída", icon: <Bell className="h-3 w-3" />, color: "bg-purple-500/10 text-purple-500 border-purple-500/30" },
  mention: { label: "Mencionado", icon: <Bell className="h-3 w-3" />, color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30" },
  stale_task: { label: "Tarefa parada", icon: <Clock className="h-3 w-3" />, color: "bg-slate-500/10 text-slate-500 border-slate-500/30" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30" },
  sent: { label: "Enviado", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  failed: { label: "Falhou", color: "bg-red-500/10 text-red-500 border-red-500/30" },
  read: { label: "Lido", color: "bg-slate-500/10 text-slate-500 border-slate-500/30" },
};

const CHANNEL_ICONS: Record<string, string> = {
  telegram: "📱 Telegram",
  email: "📧 E-mail (Brevo)",
  push: "🔔 Push",
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
    "Notificação de Sistema";

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

  const filtered = notifications.filter((n) => {
    if (filterType && n.type !== filterType) return false;
    if (filterStatus && n.status !== filterStatus) return false;
    return true;
  });

  const counts = notifications.reduce(
    (acc, n) => {
      acc[n.status] = (acc[n.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const hasFilters = filterType || filterStatus;

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                CENTRAL DE NOTIFICAÇÕES
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
              <Bell className="h-7 w-7 text-blue-500" />
              Central de Notificações & Alertas
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Acompanhe o histórico de alertas por E-mail (Brevo) e Telegram e gerencie suas regras de notificação.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button asChild variant="outline" className="h-11 border-border/80 font-semibold hover:bg-muted">
              <Link href="/app/settings">
                <Settings className="mr-2 h-4 w-4 text-blue-500" />
                Preferências de Alertas
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(STATUS_LABELS).map(([key, info]) => (
          <Card
            key={key}
            className={`p-5 border-border/80 bg-card cursor-pointer transition-all duration-200 ${
              filterStatus === key ? "ring-2 ring-blue-500 border-blue-500 bg-blue-500/5" : "hover:border-blue-500/30"
            }`}
            onClick={() => setFilterStatus(filterStatus === key ? null : key)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{info.label}</p>
                <p className="text-3xl font-extrabold mt-1.5">{counts[key] ?? 0}</p>
              </div>
              <Badge variant="outline" className={`px-2.5 py-1 text-xs font-semibold ${info.color}`}>
                <Bell className="h-3 w-3 mr-1 inline" /> {key}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      {error && (
        <Card className="border-red-500/40 bg-red-500/10 p-4">
          <p className="text-xs font-bold text-red-500">⚠️ {error}</p>
        </Card>
      )}

      {/* Filter Toolbar */}
      <Card className="p-4 border-border/80 bg-card shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Filtrar por Tipo:</span>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setFilterType(null);
                setFilterStatus(null);
              }}
            >
              <X className="h-3.5 w-3.5 mr-1" /> Limpar Filtros
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(TYPE_LABELS).map(([key, info]) => (
            <Badge
              key={key}
              variant="outline"
              className={`cursor-pointer px-3 py-1 text-xs font-semibold transition-all ${
                filterType === key
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                  : info.color
              }`}
              onClick={() => setFilterType(filterType === key ? null : key)}
            >
              <span className="mr-1.5">{info.icon}</span>
              {info.label}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Notifications List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
            <Bell className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Carregando central de notificações...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 p-8">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
              <ShieldCheck className="h-10 w-10" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight">Nenhuma notificação encontrada</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Os alertas enviados por e-mail ou disparados pelo sistema aparecerão nesta lista.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/80 bg-card shadow-xl overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y divide-border/60">
              {filtered.map((n) => {
                const typeInfo = TYPE_LABELS[n.type] ?? {
                  label: n.type,
                  icon: <Bell className="h-3 w-3" />,
                  color: "bg-muted text-muted-foreground",
                };
                const statusInfo = STATUS_LABELS[n.status] ?? {
                  label: n.status,
                  color: "bg-muted text-muted-foreground",
                };
                const { title, subtitle } = formatPayload(n);

                return (
                  <li
                    key={n.id}
                    className="p-5 hover:bg-muted/30 transition-colors group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/20">
                        {typeInfo.icon}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-foreground leading-tight">
                            {title}
                          </h4>
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${typeInfo.color}`}>
                            {typeInfo.label}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-bold ${statusInfo.color}`}>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground font-mono">
                          {subtitle}
                        </p>

                        {n.channels && n.channels.length > 0 && (
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                            <span>Canal:</span>
                            {n.channels.map((ch) => (
                              <span key={ch} className="font-medium text-foreground bg-muted/50 px-2 py-0.5 rounded">
                                {CHANNEL_ICONS[ch] ?? ch}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <span className="text-xs text-muted-foreground font-mono">
                        {timeAgo(n.created_at)}
                      </span>

                      {n.project_id && (
                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <Link
                            href={
                              n.task_id
                                ? `/app/projects/${n.project_id}?task=${n.task_id}`
                                : `/app/projects/${n.project_id}`
                            }
                            title="Ver detalhes"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
