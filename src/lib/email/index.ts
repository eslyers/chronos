// ─────────────────────────────────────────────────────────────
// CHRONOS — Email barrel (use: `import { sendEmail, taskDueEmailTemplate } from "@/lib/email"`)
// ─────────────────────────────────────────────────────────────

export { sendEmail, sendEmailWithTags } from "./brevo";
export type { EmailPayload, EmailResult } from "./brevo";

export {
  taskDueEmailTemplate,
  taskAssignedEmailTemplate,
  statusChangedEmailTemplate,
  commentAddedEmailTemplate,
  inviteEmailTemplate,
} from "./templates";

// Legacy — use as funções acima em código novo
// export * from "./resend";
