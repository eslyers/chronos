/**
 * @jest-environment node
 */
const rpc = jest.fn();
jest.mock("@/lib/supabase/serverAdminClient", () => ({
  createServerAdminClient: async () => ({ rpc }),
}));

import { NextRequest } from "next/server";
import { clientIp, enforceRateLimit } from "../rate-limit";

const rule = { scope: "invite", limit: 2, windowSeconds: 60 };
const req = (headers: Record<string, string> = {}) =>
  new NextRequest("https://chronos.test/api/x", { headers });

beforeEach(() => rpc.mockReset());

describe("enforceRateLimit", () => {
  it("segue (null) enquanto o banco diz que está dentro do limite", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await expect(enforceRateLimit(req(), rule, "u1")).resolves.toBeNull();
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", { p_key: "invite:user:u1", p_limit: 2, p_window_seconds: 60 });
  });

  it("responde 429 com Retry-After quando o limite estoura", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const res = await enforceRateLimit(req(), rule, "u1");
    expect(res?.status).toBe(429);
    expect(res?.headers.get("Retry-After")).toBe("60");
    expect((await res!.json()).error).toMatch(/Muitas tentativas/);
  });

  it("sem usuário, limita pelo IP do cliente", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await enforceRateLimit(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), rule);
    expect(rpc.mock.calls[0][1].p_key).toBe("invite:ip:203.0.113.7");
  });

  it("falha aberta se o banco der erro (não derruba a rota)", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "function does not exist" } });
    await expect(enforceRateLimit(req(), rule, "u1")).resolves.toBeNull();
    rpc.mockRejectedValue(new Error("network"));
    await expect(enforceRateLimit(req(), rule, "u1")).resolves.toBeNull();
  });
});

describe("clientIp", () => {
  it("usa x-real-ip ou 'unknown' quando não há x-forwarded-for", () => {
    expect(clientIp(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(req())).toBe("unknown");
  });
});
