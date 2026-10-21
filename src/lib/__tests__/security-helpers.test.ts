/**
 * @jest-environment node
 */
import type { NextRequest } from "next/server";
import { safeRedirectPath } from "../utils";
import { hasValidBearerSecret } from "../server-secret";

function requestWithAuth(header?: string): NextRequest {
  const headers = new Headers();
  if (header) headers.set("authorization", header);
  return { headers } as unknown as NextRequest;
}

describe("safeRedirectPath", () => {
  it("keeps internal paths", () => {
    expect(safeRedirectPath("/app/kanban?project=1")).toBe("/app/kanban?project=1");
    expect(safeRedirectPath("/auth/invite/abc")).toBe("/auth/invite/abc");
  });

  it("falls back for missing or external destinations", () => {
    expect(safeRedirectPath(null)).toBe("/app");
    expect(safeRedirectPath("")).toBe("/app");
    expect(safeRedirectPath("https://evil.example")).toBe("/app");
    expect(safeRedirectPath("//evil.example")).toBe("/app");
    expect(safeRedirectPath("/\\evil.example")).toBe("/app");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/app");
  });

  it("uses a custom fallback", () => {
    expect(safeRedirectPath("https://evil.example", "/")).toBe("/");
  });
});

describe("hasValidBearerSecret", () => {
  it("accepts the matching bearer secret", () => {
    expect(hasValidBearerSecret(requestWithAuth("Bearer s3cret"), "s3cret")).toBe(true);
    expect(hasValidBearerSecret(requestWithAuth("bearer s3cret"), "s3cret")).toBe(true);
  });

  it("rejects wrong, missing or unconfigured secrets", () => {
    expect(hasValidBearerSecret(requestWithAuth("Bearer wrong"), "s3cret")).toBe(false);
    expect(hasValidBearerSecret(requestWithAuth("Bearer s3cret-longer"), "s3cret")).toBe(false);
    expect(hasValidBearerSecret(requestWithAuth(), "s3cret")).toBe(false);
    expect(hasValidBearerSecret(requestWithAuth("Bearer "), "s3cret")).toBe(false);
    expect(hasValidBearerSecret(requestWithAuth("Bearer anything"), undefined)).toBe(false);
    expect(hasValidBearerSecret(requestWithAuth("Bearer "), "")).toBe(false);
  });
});
