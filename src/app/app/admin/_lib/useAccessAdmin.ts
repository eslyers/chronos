"use client";

// ─────────────────────────────────────────────────────────────
// CHRONOS — Hook de dados da administração de acessos
// Lê GET /api/access/overview e envia as mutações para as três rotas
// POST do contrato (src/lib/access/types.ts).
//
// Atualização otimista: cada mutação vira uma "operação pendente"
// aplicada por cima do último overview vindo do servidor. Em caso de
// erro a operação é descartada (rollback) e o erro do servidor vira
// toast; em caso de sucesso ela é incorporada ao overview local e a
// tela relê o servidor em segundo plano. Como as operações são
// idempotentes, mutações concorrentes não desfazem umas às outras.
// ─────────────────────────────────────────────────────────────
import * as React from "react";
import { useGlobalToast } from "@/components/ui/toast-notification";
import type {
  AccessOverview,
  ProjectAction,
  ProjectMemberChange,
  WorkspaceMemberChange,
} from "@/lib/access/types";
import {
  applyProjectAction,
  applyProjectMemberChange,
  applyWorkspaceMemberChange,
} from "./access-matrix";

export const ACCESS_ENDPOINTS = {
  overview: "/api/access/overview",
  projectMember: "/api/access/project-member",
  workspaceMember: "/api/access/workspace-member",
  project: "/api/access/project",
} as const;

/** Remove workspace_id (o hook usa o do overview carregado), preservando uniões. */
type WithoutWorkspace<T> = T extends unknown ? Omit<T, "workspace_id"> : never;

export type ProjectMemberInput = WithoutWorkspace<ProjectMemberChange>;
export type WorkspaceMemberInput = WithoutWorkspace<WorkspaceMemberChange>;
export type ProjectActionInput = WithoutWorkspace<ProjectAction>;

interface PendingOp {
  id: number;
  /** Identifica o alvo (célula, membro, projeto) para exibir "salvando". */
  key: string;
  apply: (o: AccessOverview) => AccessOverview;
}

interface MutationMessages {
  errorTitle: string;
  successTitle?: string;
  successDescription?: string;
}

export function cellKey(projectId: string, userId: string) {
  return `cell:${projectId}:${userId}`;
}
export function memberKey(userId: string) {
  return `member:${userId}`;
}
export function projectKey(projectId: string) {
  return `project:${projectId}`;
}

async function readJson(res: Response): Promise<{ error?: string } & Record<string, unknown>> {
  try {
    const data = await res.json();
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export function useAccessAdmin(workspaceId: string | null, opts: { enabled?: boolean } = {}) {
  const enabled = opts.enabled ?? true;
  const { addToast } = useGlobalToast();
  const [base, setBase] = React.useState<AccessOverview | null>(null);
  const [ops, setOps] = React.useState<PendingOp[]>([]);
  const [loading, setLoading] = React.useState<boolean>(enabled && !!workspaceId);
  const [error, setError] = React.useState<string | null>(null);
  const requestSeq = React.useRef(0);
  const opSeq = React.useRef(0);

  const load = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!enabled || !workspaceId) return;
      const req = ++requestSeq.current;
      if (!silent) setLoading(true);
      try {
        const res = await fetch(
          `${ACCESS_ENDPOINTS.overview}?workspace_id=${encodeURIComponent(workspaceId)}`,
          { cache: "no-store" }
        );
        const data = await readJson(res);
        if (!res.ok || data.error) {
          throw new Error(data.error || `Falha ao carregar os acessos (HTTP ${res.status})`);
        }
        if (req !== requestSeq.current) return; // resposta obsoleta
        setBase(data as unknown as AccessOverview);
        setError(null);
      } catch (err) {
        if (req !== requestSeq.current) return;
        // Releitura em segundo plano que falhou mantém os dados atuais
        if (silent) console.warn("[useAccessAdmin] Falha ao reler overview:", err);
        else setError(errorMessage(err, "Falha ao carregar os acessos"));
      } finally {
        if (req === requestSeq.current) setLoading(false);
      }
    },
    [enabled, workspaceId]
  );

  // Troca de workspace: descarta o estado anterior e carrega o novo
  React.useEffect(() => {
    setBase(null);
    setOps([]);
    setError(null);
    if (!enabled || !workspaceId) {
      requestSeq.current++;
      setLoading(false);
      return;
    }
    load();
  }, [enabled, workspaceId, load]);

  const overview = React.useMemo(
    () => (base ? ops.reduce((acc, op) => op.apply(acc), base) : null),
    [base, ops]
  );

  const pendingKeys = React.useMemo(() => new Set(ops.map((o) => o.key)), [ops]);

  const mutate = React.useCallback(
    async (
      endpoint: string,
      payload: Record<string, unknown>,
      key: string,
      apply: (o: AccessOverview) => AccessOverview,
      messages: MutationMessages
    ): Promise<boolean> => {
      const wsId = base?.workspace.id;
      if (!wsId) return false;
      const id = ++opSeq.current;
      setOps((prev) => [...prev, { id, key, apply }]);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: wsId, ...payload }),
        });
        const data = await readJson(res);
        if (!res.ok || data.error) {
          throw new Error(data.error || `Falha na operação (HTTP ${res.status})`);
        }
        // Confirmado: incorpora ao overview local e relê o servidor
        setBase((b) => (b && b.workspace.id === wsId ? apply(b) : b));
        setOps((prev) => prev.filter((o) => o.id !== id));
        if (messages.successTitle) {
          addToast({ variant: "success", title: messages.successTitle, description: messages.successDescription });
        }
        void load({ silent: true });
        return true;
      } catch (err) {
        // Rollback: descarta a operação otimista
        setOps((prev) => prev.filter((o) => o.id !== id));
        addToast({
          variant: "error",
          title: messages.errorTitle,
          description: errorMessage(err, "Tente novamente."),
        });
        return false;
      }
    },
    [base?.workspace.id, addToast, load]
  );

  const changeProjectMember = React.useCallback(
    (change: ProjectMemberInput) =>
      mutate(
        ACCESS_ENDPOINTS.projectMember,
        { ...change },
        cellKey(change.project_id, change.user_id),
        (o) => applyProjectMemberChange(o, { ...change, workspace_id: o.workspace.id }),
        { errorTitle: "Não foi possível alterar o acesso" }
      ),
    [mutate]
  );

  const changeWorkspaceMember = React.useCallback(
    (change: WorkspaceMemberInput) =>
      mutate(
        ACCESS_ENDPOINTS.workspaceMember,
        { ...change },
        memberKey(change.user_id),
        (o) => applyWorkspaceMemberChange(o, { ...change, workspace_id: o.workspace.id }),
        change.role === null
          ? {
              errorTitle: "Não foi possível remover o membro",
              successTitle: "Membro removido",
              successDescription: "O usuário perdeu o acesso ao workspace e aos projetos.",
            }
          : { errorTitle: "Não foi possível alterar o papel", successTitle: "Papel atualizado" }
      ),
    [mutate]
  );

  const runProjectAction = React.useCallback(
    (action: ProjectActionInput) => {
      const titles: Record<ProjectAction["action"], MutationMessages> = {
        archive: { errorTitle: "Não foi possível arquivar", successTitle: "Projeto arquivado" },
        activate: { errorTitle: "Não foi possível reativar", successTitle: "Projeto reativado" },
        delete: { errorTitle: "Não foi possível excluir", successTitle: "Projeto excluído" },
        transfer: { errorTitle: "Não foi possível transferir", successTitle: "Dono do projeto alterado" },
      };
      return mutate(
        ACCESS_ENDPOINTS.project,
        { ...action },
        projectKey(action.project_id),
        (o) => applyProjectAction(o, { ...action, workspace_id: o.workspace.id } as ProjectAction),
        titles[action.action]
      );
    },
    [mutate]
  );

  const reload = React.useCallback(() => load(), [load]);

  return {
    overview,
    loading,
    error,
    reload,
    pendingKeys,
    changeProjectMember,
    changeWorkspaceMember,
    runProjectAction,
  };
}

export type AccessAdminApi = ReturnType<typeof useAccessAdmin>;
