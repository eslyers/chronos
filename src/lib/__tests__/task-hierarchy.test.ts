import { orderTasksParentsFirst, collectDescendantIds } from "../task-hierarchy";

const t = (id: string, parent: string | null = null) => ({ id, parent_task_id: parent });

describe("orderTasksParentsFirst", () => {
  it("puts every parent before its children at any depth", () => {
    // Neto aparece antes do pai e do avô no array de origem
    const tasks = [t("grandchild", "child"), t("child", "root"), t("other"), t("root")];
    const ids = orderTasksParentsFirst(tasks).map((x) => x.id);
    expect(ids.indexOf("root")).toBeLessThan(ids.indexOf("child"));
    expect(ids.indexOf("child")).toBeLessThan(ids.indexOf("grandchild"));
    expect(ids).toHaveLength(4);
  });

  it("treats tasks whose parent is missing as roots", () => {
    const ids = orderTasksParentsFirst([t("a", "missing"), t("b", "a")]).map((x) => x.id);
    expect(ids).toEqual(["a", "b"]);
  });

  it("keeps nodes caught in a cycle instead of dropping them", () => {
    const ids = orderTasksParentsFirst([t("x", "y"), t("y", "x"), t("z")]).map((x) => x.id);
    expect(ids.sort()).toEqual(["x", "y", "z"]);
  });
});

describe("collectDescendantIds", () => {
  it("returns the task and all of its descendants", () => {
    const tasks = [t("root"), t("a", "root"), t("b", "a"), t("c", "b"), t("sibling")];
    expect([...collectDescendantIds("root", tasks)].sort()).toEqual(["a", "b", "c", "root"]);
    expect([...collectDescendantIds("b", tasks)].sort()).toEqual(["b", "c"]);
  });
});
