"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  X,
  Loader2,
  UserPlus,
  Shield,
  Trash2,
  User,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Project } from "@/lib/context/DataContext";
import {
  fetchProjectMembers,
  addProjectMember,
  removeProjectMember,
  type ProjectMember,
} from "@/lib/data/supabase-data";
import { loadMembers, type Member } from "@/app/app/users/_lib/members";
import { useGlobalToast } from "@/components/ui/toast-notification";

interface ProjectMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project | null;
}

const ROLE_LABELS: Record<string, { label: string; desc: string; badge: string }> = {
  owner: {
    label: "Criador",
    desc: "Proprietário do projeto",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  admin: {
    label: "Admin",
    desc: "Pode gerenciar etapas, membros e configurações",
    badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
  },
  member: {
    label: "Membro",
    desc: "Pode criar, atualizar tarefas e apontar horas",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  viewer: {
    label: "Visualizador",
    desc: "Acesso somente leitura",
    badge: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  },
};

export function ProjectMembersDialog({
  open,
  onOpenChange,
  project,
}: ProjectMembersDialogProps) {
  const { addToast } = useGlobalToast();

  const [loading, setLoading] = useState(true);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "member" | "viewer">("member");
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Carregar dados de membros
  useEffect(() => {
    if (!open || !project) return;
    let cancelled = false;

    async function loadData() {
      if (!project) return;
      setLoading(true);
      try {
        const [pMembers, wsMembers] = await Promise.all([
          fetchProjectMembers(project.id),
          loadMembers(project.workspace_id),
        ]);
        if (!cancelled) {
          setProjectMembers(pMembers);
          setWorkspaceMembers(wsMembers);
        }
      } catch (err) {
        console.error("Erro ao carregar membros do projeto:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [open, project]);

  if (!open || !project) return null;

  // Membros do workspace que ainda não estão no projeto
  const availableWorkspaceMembers = workspaceMembers.filter(
    (wm) => wm.user_id && !projectMembers.some((pm) => pm.user_id === wm.user_id)
  );

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !selectedUserId) return;

    setSubmitting(true);
    try {
      const res = await addProjectMember(project.id, selectedUserId, selectedRole);
      if (!res.ok) {
        throw new Error(res.error || "Falha ao adicionar membro");
      }

      addToast({
        variant: "success",
        title: "Membro adicionado",
        description: "O usuário agora tem acesso ao projeto e seus dados.",
      });

      // Recarrega lista
      const updated = await fetchProjectMembers(project.id);
      setProjectMembers(updated);
      setSelectedUserId("");
    } catch (err: unknown) {
      addToast({
        variant: "error",
        title: "Erro ao adicionar",
        description: err instanceof Error ? err.message : "Não foi possível conceder acesso ao usuário.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!project) return;
    setRemovingId(userId);

    try {
      const res = await removeProjectMember(project.id, userId);
      if (!res.ok) {
        throw new Error(res.error || "Falha ao remover membro");
      }

      addToast({
        variant: "info",
        title: "Acesso revogado",
        description: "O usuário foi removido da lista de membros do projeto.",
      });

      setProjectMembers((prev) => prev.filter((pm) => pm.user_id !== userId));
    } catch (err: unknown) {
      addToast({
        variant: "error",
        title: "Erro ao revogar",
        description: err instanceof Error ? err.message : "Não foi possível remover o membro do projeto.",
      });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Acesso ao Projeto</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: project.color }}
                />
                <span className="font-medium text-foreground">{project.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Banner explicativo */}
          <div className="rounded-lg border border-border/80 bg-muted/30 p-3.5 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Controle de Visibilidade</p>
              <p>
                Apenas os membros adicionados abaixo podem visualizar este projeto no Dashboard,
                Kanban, Timeline e Calendário.
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                * Administradores e donos do workspace mantêm visão executiva para governança.
              </p>
            </div>
          </div>

          {/* Form para adicionar novo membro */}
          <form onSubmit={handleAddMember} className="space-y-3 p-4 rounded-xl border border-border/80 bg-card/60">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Adicionar Colega ao Projeto
            </h3>

            {availableWorkspaceMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">
                Todos os membros ativos do workspace já possuem acesso a este projeto.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div className="sm:col-span-2">
                  <Select
                    value={selectedUserId}
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger className="h-9 text-xs font-medium bg-background border-border/80 shadow-sm">
                      <SelectValue placeholder="Selecione um membro do workspace..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWorkspaceMembers.map((m) => {
                        const uid = m.user_id || m.id;
                        if (!uid) return null;
                        return (
                          <SelectItem key={uid} value={uid}>
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                              <span className="truncate">{m.full_name ? `${m.full_name} (${m.email})` : m.email}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={selectedRole}
                    onValueChange={(val) => setSelectedRole(val as "admin" | "member" | "viewer")}
                  >
                    <SelectTrigger className="h-9 text-xs font-medium bg-background border-border/80 shadow-sm">
                      <SelectValue placeholder="Papel..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-sky-400" />
                          <span>Membro</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3.5 w-3.5 text-purple-400" />
                          <span>Admin</span>
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
                </div>

                <div className="sm:col-span-3 pt-1">
                  <Button
                    type="submit"
                    disabled={!selectedUserId || submitting}
                    className="w-full text-xs font-semibold h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Concedendo Acesso...
                      </span>
                    ) : (
                      "Conceder Acesso ao Projeto"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          {/* Lista de membros do projeto */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Membros Atuais ({projectMembers.length})</span>
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Carregando membros do projeto...
              </div>
            ) : projectMembers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                Nenhum membro cadastrado individualmente ainda.
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-card/60 overflow-hidden">
                {projectMembers.map((member) => {
                  const roleMeta = ROLE_LABELS[member.role] || ROLE_LABELS.member;
                  const isOwner = member.role === "owner" || member.user_id === project.owner_id;
                  const isRemoving = removingId === member.user_id;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3.5 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: member.avatar_color || "#3b82f6" }}
                        >
                          {(member.full_name || member.email || "U")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {member.full_name || member.email}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${roleMeta.badge}`}
                          title={roleMeta.desc}
                        >
                          {roleMeta.label}
                        </span>

                        {!isOwner && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.user_id)}
                            disabled={isRemoving}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Revogar acesso deste projeto"
                          >
                            {isRemoving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3.5 border-t border-border/80 bg-muted/20">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
