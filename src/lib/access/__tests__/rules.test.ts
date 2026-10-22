import {
  canEditProject,
  effectiveAccess,
  projectAccessChangeError,
  projectTransferError,
  workspaceRoleChangeError,
} from "../rules";
import type { AccessGrant } from "../types";

const owner = { role: "owner" as const, isMasterAdmin: false };
const admin = { role: "admin" as const, isMasterAdmin: false };
const member = { role: "member" as const, isMasterAdmin: false };
const master = { role: null, isMasterAdmin: true };

describe("workspaceRoleChangeError", () => {
  const base = { isSelf: false, targetRole: "member" as const, newRole: "admin" as const, ownerCount: 1 };

  it("admin promove membro a admin", () => {
    expect(workspaceRoleChangeError({ ...base, caller: admin })).toBeNull();
  });
  it("membro comum não gerencia ninguém", () => {
    expect(workspaceRoleChangeError({ ...base, caller: member })).toMatch(/administradores/);
  });
  it("ninguém altera o próprio papel", () => {
    expect(workspaceRoleChangeError({ ...base, caller: owner, isSelf: true })).toMatch(/próprio papel/);
  });
  it("só dono ou Master ADM mexe no papel de dono", () => {
    expect(workspaceRoleChangeError({ ...base, caller: admin, newRole: "owner" })).toMatch(/dono/);
    expect(workspaceRoleChangeError({ ...base, caller: admin, targetRole: "owner", newRole: null, ownerCount: 2 })).toMatch(/dono/);
    expect(workspaceRoleChangeError({ ...base, caller: owner, newRole: "owner" })).toBeNull();
    expect(workspaceRoleChangeError({ ...base, caller: master, newRole: "owner" })).toBeNull();
  });
  it("não deixa o workspace sem dono", () => {
    expect(workspaceRoleChangeError({ ...base, caller: master, targetRole: "owner", newRole: "admin", ownerCount: 1 })).toMatch(/ao menos um dono/);
    expect(workspaceRoleChangeError({ ...base, caller: owner, targetRole: "owner", newRole: null, ownerCount: 2 })).toBeNull();
  });
});

describe("effectiveAccess / canEditProject", () => {
  const project = { id: "p1", created_by: "creator" };
  const grants: AccessGrant[] = [
    { project_id: "p1", user_id: "editor", role: "member" },
    { project_id: "p1", user_id: "reader", role: "viewer" },
    { project_id: "p1", user_id: "ws-viewer", role: "member" },
  ];

  it("calcula o acesso efetivo", () => {
    expect(effectiveAccess({ user_id: "a", role: "admin" }, project, grants)).toEqual({ kind: "workspace-admin" });
    expect(effectiveAccess({ user_id: "creator", role: "member" }, project, grants)).toEqual({ kind: "owner" });
    expect(effectiveAccess({ user_id: "editor", role: "member" }, project, grants)).toEqual({ kind: "grant", role: "member" });
    expect(effectiveAccess({ user_id: "x", role: "member" }, project, grants)).toEqual({ kind: "none" });
  });

  it("leitura não edita, nem no projeto nem no workspace", () => {
    expect(canEditProject({ user_id: "editor", role: "member" }, project, grants)).toBe(true);
    expect(canEditProject({ user_id: "reader", role: "member" }, project, grants)).toBe(false);
    expect(canEditProject({ user_id: "ws-viewer", role: "viewer" }, project, grants)).toBe(false);
    expect(canEditProject({ user_id: "x", role: "member" }, project, grants)).toBe(false);
    expect(canEditProject({ user_id: "creator", role: "member" }, project, grants)).toBe(true);
  });
});

describe("projectAccessChangeError / projectTransferError", () => {
  const project = { id: "p1", created_by: "creator" };

  it("concede acesso a um membro comum", () => {
    expect(projectAccessChangeError({ caller: admin, member: { user_id: "u", role: "member" }, project, newRole: "viewer" })).toBeNull();
  });
  it("recusa admins do workspace, o dono do projeto e não-membros", () => {
    expect(projectAccessChangeError({ caller: admin, member: { user_id: "u", role: "admin" }, project, newRole: "member" })).toMatch(/todos os projetos/);
    expect(projectAccessChangeError({ caller: admin, member: { user_id: "creator", role: "member" }, project, newRole: null })).toMatch(/Transferir dono/);
    expect(projectAccessChangeError({ caller: admin, member: undefined, project, newRole: "member" })).toMatch(/não é membro/);
    expect(projectAccessChangeError({ caller: member, member: { user_id: "u", role: "member" }, project, newRole: "member" })).toMatch(/administradores/);
  });
  it("transfere só para membro que pode editar", () => {
    expect(projectTransferError({ caller: master, project, newOwner: { user_id: "u", role: "member" } })).toBeNull();
    expect(projectTransferError({ caller: admin, project, newOwner: { user_id: "u", role: "viewer" } })).toMatch(/Leitura/);
    expect(projectTransferError({ caller: admin, project, newOwner: { user_id: "creator", role: "member" } })).toMatch(/já é o dono/);
  });
});
