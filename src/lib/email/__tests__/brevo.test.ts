/**
 * @jest-environment node
 */
import { sendEmail, readBrevoResponse } from "../brevo";

const payload = { to: "pessoa@empresa.com", subject: "Convite", html: "<p>oi</p>" };

function mockFetch(status: number, body: string) {
  global.fetch = jest.fn().mockResolvedValue(new Response(body, { status })) as unknown as typeof fetch;
}

describe("sendEmail (Brevo)", () => {
  const env = process.env;
  beforeEach(() => {
    process.env = { ...env, BREVO_API_KEY: "test-key" };
  });
  afterAll(() => {
    process.env = env;
  });

  it("retorna o messageId quando o Brevo aceita o envio", async () => {
    mockFetch(201, JSON.stringify({ messageId: "<abc@brevo>" }));
    await expect(sendEmail(payload)).resolves.toEqual({ success: true, id: "<abc@brevo>" });
  });

  it("devolve o motivo legível quando o Brevo recusa (ex.: IP não autorizado)", async () => {
    mockFetch(401, JSON.stringify({ code: "unauthorized", message: "We have detected you are using an unrecognised IP address" }));
    const result = await sendEmail(payload);
    expect(result.success).toBe(false);
    expect(result.error).toBe(
      "Brevo recusou o envio (HTTP 401, unauthorized): We have detected you are using an unrecognised IP address"
    );
  });

  it("não quebra com resposta que não é JSON", async () => {
    mockFetch(502, "<html>Bad Gateway</html>");
    const result = await sendEmail(payload);
    expect(result.success).toBe(false);
    expect(result.error).toContain("HTTP 502");
    expect(result.error).toContain("Bad Gateway");
  });

  it("falha sem chamar a API quando a chave não está configurada", async () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.RESEND_API_KEY;
    global.fetch = jest.fn() as unknown as typeof fetch;
    await expect(sendEmail(payload)).resolves.toEqual({ success: false, error: "BREVO_API_KEY não configurada" });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("readBrevoResponse", () => {
  it("usa o statusText quando não há corpo", async () => {
    const result = await readBrevoResponse(new Response("", { status: 429, statusText: "Too Many Requests" }));
    expect(result).toEqual({ ok: false, error: "Brevo recusou o envio (HTTP 429): Too Many Requests" });
  });
});
