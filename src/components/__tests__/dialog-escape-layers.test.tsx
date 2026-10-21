import * as React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";

// jsdom não tem ResizeObserver (usado pelo posicionamento do Radix Popper)
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver = ResizeObserverStub;
});

function Harness({ onDialogChange }: { onDialogChange: (open: boolean) => void }) {
  const [open, setOpen] = React.useState(true);
  const [date, setDate] = React.useState("2026-10-21");
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onDialogChange(next);
        setOpen(next);
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Teste</DialogTitle>
        <DatePicker id="d" value={date} onChange={setDate} />
      </DialogContent>
    </Dialog>
  );
}

describe("Dialog + DatePicker: Esc em camadas", () => {
  it("Esc com o calendário aberto fecha só o calendário", async () => {
    const onDialogChange = jest.fn();
    render(<Harness onDialogChange={onDialogChange} />);

    // Gatilho é um <button> real (não há botão aninhado em role=button)
    const trigger = screen.getByRole("button", { name: /21\/10\/2026/ });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.querySelector("button")).toBeNull();

    await act(async () => {
      fireEvent.click(trigger);
    });
    expect(screen.getByLabelText("Calendário")).toBeTruthy();

    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    });
    expect(screen.queryByLabelText("Calendário")).toBeNull();
    expect(onDialogChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();

    // Segundo Esc (sem popover) fecha o Dialog
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    });
    expect(onDialogChange).toHaveBeenCalledWith(false);
  });

  it("botão Fechar padrão tem rótulo em português", () => {
    render(<Harness onDialogChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Fechar" })).toBeTruthy();
  });
});
