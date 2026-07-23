"use client";

import * as React from "react";
import { Upload, ChevronDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportDialog } from "@/components/ImportDialog";

type ProjectLike = {
  id: string;
  name: string;
  workspace_id: string;
  color?: string;
};

type Props =
  | {
      mode: "single";
      project: ProjectLike;
      size?: "default" | "sm" | "lg" | "icon";
      variant?: "default" | "outline" | "secondary" | "ghost";
      label?: string;
      className?: string;
    }
  | {
      mode: "select";
      projects: ProjectLike[];
      size?: "default" | "sm" | "lg" | "icon";
      variant?: "default" | "outline" | "secondary" | "ghost";
      label?: string;
      className?: string;
      emptyMessage?: string;
    };

/**
 * Botão reutilizável pra abrir o dialog de import de planilha (Excel/CSV/ODS).
 *
 * - mode="single": usa o projeto passado (telas de detalhe do projeto, timeline, kanban)
 * - mode="select":  abre popover com lista pra escolher o projeto (tela /app/projects)
 */
export function ImportProjectButton(props: Props) {
  const size = props.size ?? "sm";
  const variant = props.variant ?? "outline";
  const label = props.label ?? "Importar planilha";

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [target, setTarget] = React.useState<ProjectLike | null>(null);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);

  // Fecha popover ao clicar fora
  React.useEffect(() => {
    if (!popoverOpen) return;
    function onClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [popoverOpen]);

  if (props.mode === "single") {
    const p = props.project;
    return (
      <>
        <Button
          variant={variant}
          size={size}
          className={props.className ?? "gap-2"}
          onClick={() => {
            setTarget(p);
            setDialogOpen(true);
          }}
          title="Importar planilha Excel/CSV/ODS"
        >
          <Upload className="h-4 w-4" />
          {size !== "icon" && label}
        </Button>

        {target && (
          <ImportDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            projectId={target.id}
            workspaceId={target.workspace_id}
            onImported={() => window.location.reload()}
          />
        )}
      </>
    );
  }

  // mode === "select"
  const { projects, emptyMessage = "Crie um projeto antes de importar tarefas." } = props;
  return (
    <div className="relative inline-block" ref={popoverRef}>
      <Button
        variant={variant}
        size={size}
        className={props.className ?? "gap-2"}
        onClick={() => setPopoverOpen((v) => !v)}
        disabled={projects.length === 0}
        title={projects.length === 0 ? emptyMessage : "Importar planilha Excel/CSV/ODS"}
      >
        <FileSpreadsheet className="h-4 w-4" />
        {size !== "icon" && label}
        {size !== "icon" && <ChevronDown className="h-3 w-3 opacity-60" />}
      </Button>

      {popoverOpen && projects.length > 0 && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-md border bg-popover text-popover-foreground shadow-md p-1">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Importar em qual projeto?
          </div>
          <div className="max-h-64 overflow-y-auto">
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setTarget(p);
                  setPopoverOpen(false);
                  setDialogOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-left"
              >
                {p.color && (
                  <span
                    className="h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                )}
                <span className="truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {target && (
        <ImportDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          projectId={target.id}
          workspaceId={target.workspace_id}
          onImported={() => window.location.reload()}
        />
      )}
    </div>
  );
}
