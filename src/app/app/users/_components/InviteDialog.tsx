"use client";

import * as React from "react";
import {
  X,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  User,
  Eye,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkspaceRole } from "../_lib/members";
import { cn } from "@/lib/utils";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (params: { email: string; role: WorkspaceRole; sendEmail: boolean }) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

const ROLES: { value: WorkspaceRole; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    value: "admin",
    label: "Admin",
    description: "Gerencia projetos e membros",
    icon: Shield,
  },
  {
    value: "member",
    label: "Membro",
    description: "Cria e edita tarefas",
    icon: User,
  },
  {
    value: "viewer",
    label: "Visualizador",
    description: "Apenas leitura",
    icon: Eye,
  },
];

export function InviteDialog({ open, onOpenChange, onInvite }: InviteDialogProps) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<WorkspaceRole>("member");
  const [sendEmail, setSendEmail] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ success: boolean; error?: string } | null>(null);

  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("member");
      setSendEmail(true);
      setResult(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setResult({ success: false, error: "Email inválido" });
      return;
    }
    setLoading(true);
    setResult(null);
    const res = await onInvite({ email, role, sendEmail });
    setResult(res);
    setLoading(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full max-w-md rounded-2xl border border-border/60 shadow-2xl",
          "bg-card/95 backdrop-blur-xl",
          "animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300"
        )}
      >
        {/* Glow accent top */}
        <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">Convidar Membro</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Envie um convite por email
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-zinc-500/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-border/50 mx-6" />

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Email do convidado
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@empresa.com"
              required
              autoFocus
              disabled={loading}
              className="h-10 bg-card/60 border-border/60 focus-visible:ring-blue-500/40 focus-visible:border-blue-500/60"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Pode ser alguém que ainda não tem conta — o email ficará vinculado ao aceitar.
            </p>
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Papel no workspace
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((r) => {
                const Icon = r.icon;
                const isSelected = role === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    disabled={loading}
                    className={cn(
                      "relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-150",
                      isSelected
                        ? "border-blue-500/50 bg-blue-500/10 ring-1 ring-blue-500/30"
                        : "border-border/60 bg-card/40 hover:border-border hover:bg-card/60"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        isSelected ? "text-blue-400" : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs font-semibold leading-none",
                        isSelected ? "text-blue-400" : "text-foreground"
                      )}
                    >
                      {r.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {r.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Send email toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => !loading && setSendEmail((v) => !v)}
              className={cn(
                "relative h-5 w-9 rounded-full border transition-colors duration-200 cursor-pointer flex-shrink-0",
                sendEmail
                  ? "border-blue-500 bg-blue-500"
                  : "border-border bg-zinc-800"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
                  sendEmail ? "translate-x-4" : "translate-x-0"
                )}
              />
            </div>
            <div>
              <span className="text-sm font-medium text-foreground">
                Enviar email de convite
              </span>
              <p className="text-xs text-muted-foreground">
                {sendEmail ? "Email será disparado via Brevo" : "Apenas gera o link — compartilhe manualmente"}
              </p>
            </div>
          </label>

          {/* Result feedback */}
          {result?.success && (
            <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-300 font-medium">
                Convite gerado com sucesso! {sendEmail ? "Email enviado via Brevo." : "Compartilhe o link manualmente."}
              </p>
            </div>
          )}

          {result && !result.success && (
            <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/25 p-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300 font-medium">{result.error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar convite
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
