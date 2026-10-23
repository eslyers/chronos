import {
  attachmentTooLargeMessage,
  buildAttachmentPath,
  isSafeAttachmentHref,
  MAX_ATTACHMENT_BYTES,
  sanitizeFileName,
} from "../attachments-storage";

describe("attachments-storage", () => {
  it("monta o caminho na pasta da tarefa com nome seguro", () => {
    expect(buildAttachmentPath("t1", "Relatório Março/2026 (final).pdf", "u1")).toBe(
      "t1/u1-Relatorio_Marco_2026_final_.pdf"
    );
  });

  it("não permite subir de pasta nem nome vazio", () => {
    expect(sanitizeFileName("../../segredo.txt")).toBe("segredo.txt");
    expect(sanitizeFileName("///")).toBe("arquivo");
    expect(sanitizeFileName("a".repeat(300) + ".pdf").length).toBe(100);
  });

  it("só libera links de protocolos seguros", () => {
    expect(isSafeAttachmentHref("https://x.supabase.co/storage/v1/object/sign/a")).toBe(true);
    expect(isSafeAttachmentHref("data:application/pdf;base64,AAA")).toBe(true);
    expect(isSafeAttachmentHref("blob:https://app/123")).toBe(true);
    expect(isSafeAttachmentHref("javascript:alert(1)")).toBe(false);
    expect(isSafeAttachmentHref(" JAVASCRIPT:alert(1)")).toBe(false);
    expect(isSafeAttachmentHref(null)).toBe(false);
  });

  it("avisa quando o arquivo passa do limite", () => {
    expect(attachmentTooLargeMessage(MAX_ATTACHMENT_BYTES)).toBeNull();
    expect(attachmentTooLargeMessage(MAX_ATTACHMENT_BYTES + 1)).toMatch(/limite é 10 MB/);
  });
});
