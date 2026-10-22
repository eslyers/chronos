import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { InviteDialog } from "../InviteDialog";

async function submit(onInvite: React.ComponentProps<typeof InviteDialog>["onInvite"]) {
  render(<InviteDialog open onOpenChange={() => {}} onInvite={onInvite} />);
  fireEvent.change(screen.getByPlaceholderText(/@/), { target: { value: "nova@empresa.com" } });
  fireEvent.submit(screen.getByPlaceholderText(/@/).closest("form")!);
  await screen.findByText(/Convite gerado com sucesso/);
}

describe("InviteDialog — resultado do envio do email", () => {
  it("avisa quando o convite foi criado mas o email não saiu", async () => {
    await submit(async () => ({
      success: true,
      token: "tok",
      emailSent: false,
      emailError: "Brevo recusou o envio (HTTP 401, unauthorized): unrecognised IP address",
    }));
    expect(screen.getByRole("alert").textContent).toContain("o email NÃO foi enviado");
    expect(screen.getByRole("alert").textContent).toContain("unrecognised IP address");
    expect(screen.queryByText(/Email enviado via Brevo/)).toBeNull();
  });

  it("confirma o envio só quando o Brevo aceitou", async () => {
    await submit(async () => ({ success: true, token: "tok", emailSent: true }));
    expect(screen.getByText(/Email enviado via Brevo/)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
