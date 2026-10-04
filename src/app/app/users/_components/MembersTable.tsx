"use client";

import * as React from "react";
import { Trash2, Shield, ShieldAlert, User as UserIcon, Eye, Mail, Clock, Copy, Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Member, InviteToken, WorkspaceRole } from "../_lib/members";

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
  viewer: "Visualizador",
};

const ROLE_ICONS: Record<WorkspaceRole, React.ComponentType<{ className?: string }>> = {
  owner: Shield,
  admin: ShieldAlert,
  member: UserIcon,
  viewer: Eye,
};

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  owner: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  admin: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  member: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  viewer: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
};

function getInitials(m: { full_name?: string | null; email: string }): string {
  const name = m.full_name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (m.email && m.email !== "(sem email)") {
    const userPart = m.email.split("@")[0];
    const parts = userPart.split(/[._\-]/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return userPart.slice(0, 2).toUpperCase();
  }
  return "U";
}

interface MembersTableProps {
  members: Member[];
  invites: InviteToken[];
  isOwner: boolean;
  isMasterAdmin?: boolean;
  currentUserId?: string;
  currentUserEmail?: string;
  onRemove: (id: string) => void;
  onRevokeInvite: (token: string) => void;
  onResendInvite: (token: string) => void;
  onUpdateRole?: (id: string, newRole: WorkspaceRole) => void;
}

export function MembersTable({
  members,
  invites,
  isOwner,
  isMasterAdmin = false,
  currentUserId,
  currentUserEmail,
  onRemove,
  onRevokeInvite,
  onResendInvite,
  onUpdateRole,
}: MembersTableProps) {
  const [removeTarget, setRemoveTarget] = React.useState<Member | null>(null);
  const [revokeTarget, setRevokeTarget] = React.useState<InviteToken | null>(null);
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null);

  function handleCopyInviteLink(token: string) {
    const url = `${window.location.origin}/auth/invite/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  }

  if (members.length === 0 && invites.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Nenhum membro ainda.</p>
        <p className="text-xs mt-1">Convide alguém para começar.</p>
      </div>
    );
  }

  const canManageRoles = isOwner || isMasterAdmin;

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
              const RoleIcon = ROLE_ICONS[m.role] || UserIcon;
              const initials = getInitials(m);
              const isTargetMaster =
                m.is_master_admin || m.email.toLowerCase() === "eslyers@gmail.com";
              const isMe =
                (currentUserId && m.user_id === currentUserId) ||
                (currentUserEmail && m.email.toLowerCase() === currentUserEmail.toLowerCase());

              return (
                <tr key={m.id} className="border-t hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isTargetMaster
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/30"
                            : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {isTargetMaster ? <Crown className="h-4 w-4" /> : initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold leading-tight text-foreground">
                            {m.full_name || (m.email !== "(sem email)" ? m.email.split("@")[0] : "Usuário")}
                          </p>
                          {isMe && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              você
                            </Badge>
                          )}
                          {isTargetMaster && (
                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0 flex items-center gap-1 font-semibold">
                              <Crown className="h-2.5 w-2.5" />
                              Master Adm
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isTargetMaster ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm">
                        <Crown className="h-3 w-3" />
                        Proprietário (Master)
                      </span>
                    ) : canManageRoles && !isMe ? (
                      <Select
                        value={m.role}
                        onValueChange={(val) => onUpdateRole?.(m.id, val as WorkspaceRole)}
                      >
                        <SelectTrigger className="w-[145px] h-8 text-xs font-medium bg-card/60 border-border/80 hover:bg-muted/50 transition-all rounded-lg shadow-sm">
                          <SelectValue placeholder="Selecione papel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />
                              <span>Administrador</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="member">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-3.5 w-3.5 text-sky-400" />
                              <span>Membro</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="h-3.5 w-3.5 text-zinc-400" />
                              <span>Visualizador</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[m.role]}`}
                      >
                        <RoleIcon className="h-3 w-3" />
                        {ROLE_LABELS[m.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    >
                      Ativo
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {m.invited_at ? new Date(m.invited_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isMe && !isTargetMaster && canManageRoles && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRemoveTarget(m);
                        }}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Remover membro do workspace"
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
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[invite.role]}`}
                  >
                    {ROLE_LABELS[invite.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  expira {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyInviteLink(invite.token)}
                      className="h-8 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-500/10 gap-1.5"
                      title="Copiar link direto do convite para a área de transferência"
                    >
                      {copiedToken === invite.token ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-emerald-500 font-semibold">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar link</span>
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onResendInvite(invite.token)}
                      className="h-8 text-xs hover:bg-muted"
                      title="Reenviar convite por email"
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
