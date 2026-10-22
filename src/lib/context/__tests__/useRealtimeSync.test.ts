import { renderHook } from "@testing-library/react";

type Handler = (payload: unknown) => void;
const handlers: Record<string, Handler> = {};
let statusCallback: (status: string) => void = () => {};
const removeChannel = jest.fn();
const createChannel = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createSPAClient: () => ({
    channel: (name: string) => {
      createChannel(name);
      const channel = {
        on: (_type: string, filter: { table: string }, cb: Handler) => {
          handlers[filter.table] = cb;
          return channel;
        },
        subscribe: (cb: (status: string) => void) => {
          statusCallback = cb;
          return channel;
        },
      };
      return channel;
    },
    removeChannel,
  }),
}));

import { useRealtimeSync } from "../useRealtimeSync";

beforeEach(() => {
  Object.keys(handlers).forEach((k) => delete handlers[k]);
  removeChannel.mockClear();
  createChannel.mockClear();
});

describe("useRealtimeSync", () => {
  it("não abre canal quando desabilitado (modo demo)", () => {
    renderHook(() => useRealtimeSync({ enabled: false, onChange: jest.fn(), onReconnect: jest.fn() }));
    expect(createChannel).not.toHaveBeenCalled();
  });

  it("assina as quatro tabelas de dados e repassa os eventos normalizados", () => {
    const onChange = jest.fn();
    renderHook(() => useRealtimeSync({ enabled: true, onChange, onReconnect: jest.fn() }));

    expect(Object.keys(handlers).sort()).toEqual(["projects", "stages", "task_dependencies", "tasks"]);

    handlers.tasks({ eventType: "UPDATE", new: { id: "t1" }, old: { id: "t1" } });
    handlers.tasks({ eventType: "DELETE", new: {}, old: { id: "t1" } });
    handlers.projects({ eventType: "INSERT", new: { id: "p1" }, old: {} });

    expect(onChange).toHaveBeenNthCalledWith(1, { table: "tasks", eventType: "UPDATE", new: { id: "t1" }, old: { id: "t1" } });
    // DELETE não traz linha nova; INSERT não traz linha antiga
    expect(onChange).toHaveBeenNthCalledWith(2, { table: "tasks", eventType: "DELETE", new: null, old: { id: "t1" } });
    expect(onChange).toHaveBeenNthCalledWith(3, { table: "projects", eventType: "INSERT", new: { id: "p1" }, old: null });
  });

  it("recarrega os dados só ao reconectar depois de uma queda", () => {
    const onReconnect = jest.fn();
    renderHook(() => useRealtimeSync({ enabled: true, onChange: jest.fn(), onReconnect }));

    statusCallback("SUBSCRIBED"); // primeira conexão
    expect(onReconnect).not.toHaveBeenCalled();

    statusCallback("SUBSCRIBED"); // reinscrição sem queda
    expect(onReconnect).not.toHaveBeenCalled();

    statusCallback("CHANNEL_ERROR");
    statusCallback("SUBSCRIBED");
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("remove o canal ao desmontar e usa sempre os callbacks mais recentes", () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender, unmount } = renderHook(
      ({ onChange }) => useRealtimeSync({ enabled: true, onChange, onReconnect: jest.fn() }),
      { initialProps: { onChange: first } }
    );
    rerender({ onChange: second });
    expect(createChannel).toHaveBeenCalledTimes(1); // trocar o callback não recria o canal

    handlers.tasks({ eventType: "INSERT", new: { id: "t2" }, old: {} });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });
});
