// Overview de exemplo usado pelos testes da administração de acessos.
import type { AccessOverview } from "@/lib/access/types";

export function makeOverview(extra: Partial<AccessOverview> = {}): AccessOverview {
  return {
    workspace: { id: "ws1", name: "Contabilidade", owner_id: "u-owner" },
    caller: { user_id: "u-admin", role: "admin", is_master_admin: false },
    members: [
      { user_id: "u-view", email: "vera@ex.com", full_name: "Vera Leitura", role: "viewer", is_master_admin: false },
      { user_id: "u-mem", email: "mario@ex.com", full_name: "Mário Membro", role: "member", is_master_admin: false },
      { user_id: "u-owner", email: "olga@ex.com", full_name: "Olga Dona", role: "owner", is_master_admin: false },
      { user_id: "u-admin", email: "ana@ex.com", full_name: "Ana Admin", role: "admin", is_master_admin: false },
      { user_id: "u-master", email: "master@ex.com", full_name: null, role: "member", is_master_admin: true },
    ],
    projects: [
      { id: "p2", name: "Orçamento 2027", color: "#22c55e", status: "active", created_by: "u-owner", created_at: "2026-01-02" },
      { id: "p1", name: "Fechamento Mensal", color: "#3b82f6", status: "active", created_by: "u-mem", created_at: "2026-01-01" },
      { id: "p3", name: "Legado", color: null, status: "archived", created_by: null, created_at: "2025-01-01" },
    ],
    grants: [
      { project_id: "p2", user_id: "u-mem", role: "member" },
      { project_id: "p1", user_id: "u-view", role: "admin" },
    ],
    invites: [{ email: "novo@ex.com", role: "member", expires_at: "2099-01-01T00:00:00Z" }],
    ...extra,
  };
}
