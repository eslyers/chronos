"use client";

import * as React from "react";
import { Trash2, Shield, User as UserIcon, Eye, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Member, InviteToken, WorkspaceRole } from "../_lib/members";

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
};

const ROLE_ICONS: Record<WorkspaceRole, React.ComponentType<{ className?: string }>> = {
  owner: Shield,
  admin: Shield,
  member: UserIcon,
  viewer: Eye,
};

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  admin: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  member: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  viewer: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
};

function getInitials(m: { full_name?: string | null; email: string }): string {
  const base = m.full_name || m.email.split("@")[0];
  const parts = base.split(/[._\- ]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

interface MembersTableProps {
  members: Member[];
  invites: InviteToken[];
  isOwner: boolean;
  onRemove: (id: string) => void;
  onRevokeInvite: (token: string) => void;
  onResendInvite: (token: string) => void;
}

export function MembersTable({ members, invites, isOwner, onRemove, onRevokeInvite, onResendInvite }: MembersTableProps) {
  const [removeTarget, setRemoveTarget] = React.useState<Member | null>(null);
  const [revokeTarget, setRevokeTarget] = React.useState<InviteToken | null>(null);

  if (members.length === 0 && invites.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum membro ainda.</p>
        <p className="text-xs mt-1">Convide alguém para começar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Pessoa</th>
            <th className="px-4 py-3 text-left">Papel</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Entrou em</th>
            <th className="px-4 py-3 text-right w-10"></th>
          </tr>
        </thead>
        <tbody>
          {/* Owners / Admins / Members ativos */}
          {members.map((m) => {
            const RoleIcon = ROLE_ICONS[m.role];
            const initials = getInitials(m);
            const isMe = m.role === "owner";

            return (
              <tr key={m.id} className="border-t hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-semibold">
                      {initials}
                    </div>
                    <div>
                      <p className="font-medium leading-tight">
                        {m.full_name || m.email.split("@")[0]}
                        {isMe && <span className="ml-2 text-xs text-muted-foreground">(você)</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[m.role]}`}>
                    <RoleIcon className="h-3 w-3" />
                    {ROLE_LABELS[m.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                    Ativo
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {m.invited_at ? new Date(m.invited_at).toLocaleDateString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {!isMe && isOwner && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRemoveTarget(m);
                      }}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      title="Remover membro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}

          {/* Convites pendentes */}
          {invites.map((invite) => (
            <tr key={invite.token} className="border-t bg-blue-50/30 dark:bg-blue-950/10">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-semibold">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium leading-tight">{invite.email}</p>
                    <p className="text-xs text-muted-foreground italic">aguardando aceitar</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[invite.role]}`}>
                  {ROLE_LABELS[invite.role]}
                </span>
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20">
                  <Clock className="h-3 w-3 mr-1" />
                  Pendente
                </Badge>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                expira {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onResendInvite(invite.token)}
                    className="h-8 text-xs"
                    title="Reenviar convite"
                  >
                    Reenviar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRevokeTarget(invite);
                    }}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Revogar convite"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title={`Remover ${removeTarget?.email}?`}
        description="A pessoa perderá acesso ao workspace. Pode ser convidada novamente depois."
        variant="destructive"
        confirmText="Remover"
        onConfirm={() => {
          if (removeTarget) onRemove(removeTarget.id);
        }}
      />
      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
        title={`Revogar convite para ${revokeTarget?.email}?`}
        description="O token de convite será invalidado. A pessoa precisará de um novo convite."
        variant="destructive"
        confirmText="Revogar"
        onConfirm={() => {
          if (revokeTarget) onRevokeInvite(revokeTarget.token);
        }}
      />
    </>
  );
}
