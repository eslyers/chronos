"use client";

import * as React from "react";
import { X, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkspaceRole } from "../_lib/members";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (params: { email: string; role: WorkspaceRole; sendEmail: boolean }) => Promise<{
    success: boolean;
    error?: string;
  }>;
}

export function InviteDialog({ open, onOpenChange, onInvite }: InviteDialogProps) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<WorkspaceRole>("member");
  const [sendEmail, setSendEmail] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{ success: boolean; error?: string; message?: string } | null>(null);

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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Convidar membro</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">Email do convidado</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@empresa.com"
              required
              autoFocus
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Pode adicionar quem ainda não tem conta. Se aceitar o convite, o email já fica vinculado.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Papel</label>
            <div className="grid grid-cols-3 gap-2">
              {(["admin", "member", "viewer"] as WorkspaceRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  disabled={loading}
                  className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                    role === r
                      ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  {r === "admin" ? "Admin" : r === "member" ? "Membro" : "Visualizador"}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-500"
            />
            <span>Enviar email de convite (recomendado)</span>
          </label>

          {result && result.success && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Convite gerado! {sendEmail ? "Email enviado." : "Compartilhe o link manualmente."}
              </p>
            </div>
          )}

          {result && !result.success && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3">
              <p className="text-sm text-red-700 dark:text-red-300">{result.error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar convite"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
