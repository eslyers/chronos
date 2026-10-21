import { buildAssigneePayload } from "@/lib/task-assignee";

describe("buildAssigneePayload", () => {
  it("membro: guarda só o id (nome fica NULL)", () => {
    expect(buildAssigneePayload("member", "user-1", "Fulano")).toEqual({
      assignee_id: "user-1",
      assignee_name: null,
      assignee_status: null,
    });
  });

  it("membro sem id: sem responsável", () => {
    expect(buildAssigneePayload("member", "", "Fulano")).toEqual({
      assignee_id: null,
      assignee_name: null,
      assignee_status: null,
    });
  });

  it("externo: nome aparado + status pending", () => {
    expect(buildAssigneePayload("custom", "user-1", "  ana@empresa.com ")).toEqual({
      assignee_id: null,
      assignee_name: "ana@empresa.com",
      assignee_status: "pending",
    });
  });

  it("externo em branco: sem responsável (nunca status sem nome)", () => {
    expect(buildAssigneePayload("custom", null, "   ")).toEqual({
      assignee_id: null,
      assignee_name: null,
      assignee_status: null,
    });
  });
});
