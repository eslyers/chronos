import { act, renderHook } from "@testing-library/react";
import type { Project } from "@/lib/context/DataContext";
import {
  buildCreateProjectInput,
  templateToStageDrafts,
  useProjectForm,
  type TemplateOption,
} from "../useProjectForm";

const createProject = jest.fn();
const updateProject = jest.fn();
jest.mock("@/lib/context/DataContext", () => ({
  useData: () => ({ createProject, updateProject }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const project = (over: Partial<Project> = {}): Project => ({
  id: "p1",
  workspace_id: "ws1",
  owner_id: "u1",
  name: "Fechamento",
  description: null,
  color: "#123456",
  status: "active",
  start_date: "2026-10-01",
  target_date: "2026-10-31",
  progress: 0,
  track_time: false,
  created_at: "",
  updated_at: "",
  ...over,
});

const template: TemplateOption = {
  id: "tpl1",
  name: "Template",
  icon: null,
  stages: [
    { name: "A", color: "#111", sort_order: 0 },
    { name: "B", color: "#222", sort_order: 1, wip_limit: 3, is_done: true },
  ],
};

describe("templateToStageDrafts", () => {
  it("maps template stages to drafts with defaults", () => {
    const drafts = templateToStageDrafts(template);
    expect(drafts).toEqual([
      { localId: expect.any(String), name: "A", color: "#111", wip_limit: null, is_done: false },
      { localId: expect.any(String), name: "B", color: "#222", wip_limit: 3, is_done: true },
    ]);
    expect(drafts[0].localId).toMatch(/^tpl-tpl1-0-/);
  });
});

describe("buildCreateProjectInput", () => {
  const data = { name: "X" };

  it("adds the stage source for each mode", () => {
    expect(buildCreateProjectInput(data, "default", [], "")).toEqual({ name: "X" });
    expect(buildCreateProjectInput(data, "empty", [], "")).toEqual({ name: "X", useDefaultStages: false });
    expect(buildCreateProjectInput(data, "template", [], "tpl1")).toEqual({ name: "X", templateId: "tpl1" });
    expect(buildCreateProjectInput(data, "template", [], "")).toEqual({ name: "X" });
    const custom = buildCreateProjectInput(
      data,
      "custom",
      [{ localId: "l1", name: "S", color: "#000", wip_limit: null, is_done: false }],
      ""
    );
    expect(custom.customStages).toHaveLength(1);
    expect(custom.customStages?.[0]).toMatchObject({ name: "S", color: "#000" });
  });
});

describe("useProjectForm reset guard", () => {
  it("fills from the project on open and does not reset while typing when the object is recreated", () => {
    const onOpenChange = jest.fn();
    const { result, rerender } = renderHook((props: { open: boolean; project: Project | null }) =>
      useProjectForm({ ...props, onOpenChange }),
      { initialProps: { open: true, project: project() } }
    );
    expect(result.current.name).toBe("Fechamento");
    expect(result.current.trackTime).toBe(false);

    act(() => result.current.setName("Digitando"));
    // Mesmo id, objeto novo (refresh do DataContext): mantém o que foi digitado
    rerender({ open: true, project: project({ name: "Outro" }) });
    expect(result.current.name).toBe("Digitando");

    // Outro projeto: reinicializa
    rerender({ open: true, project: project({ id: "p2", name: "Segundo" }) });
    expect(result.current.name).toBe("Segundo");

    // Fechar e reabrir: reinicializa
    act(() => result.current.setName("Sujo"));
    rerender({ open: false, project: project({ id: "p2", name: "Segundo" }) });
    rerender({ open: true, project: project({ id: "p2", name: "Segundo" }) });
    expect(result.current.name).toBe("Segundo");
  });
});
