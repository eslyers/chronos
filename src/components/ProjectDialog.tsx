"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useData, type Project } from "@/lib/context/DataContext";

const COLORS = [
  { name: "Laranja", value: "#f97316" },
  { name: "Âmbar", value: "#f59e0b" },
  { name: "Verde", value: "#10b981" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Cinza", value: "#64748b" },
];

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const { createProject, updateProject } = useData();
  const router = useRouter();
  const isEdit = !!project;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#f97316");
  const [status, setStatus] = useState<"active" | "completed" | "archived">("active");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (project) {
        setName(project.name);
        setDescription(project.description ?? "");
        setColor(project.color);
        setStatus(project.status);
        setStartDate(project.start_date ? project.start_date.split("T")[0] : "");
        setTargetDate(project.target_date ? project.target_date.split("T")[0] : "");
      } else {
        setName("");
        setDescription("");
        setColor("#f97316");
        setStatus("active");
        setStartDate(new Date().toISOString().split("T")[0]);
        setTargetDate("");
      }
      setError("");
    }
  }, [open, project]);

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Nome do projeto é obrigatório");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        status,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        target_date: targetDate ? new Date(targetDate).toISOString() : null,
      };

      if (isEdit && project) {
        await updateProject(project.id, data);
      } else {
        await createProject(data);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize as informações do projeto."
              : "Crie um novo projeto. As etapas padrão serão criadas automaticamente."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nome do projeto *
            </label>
            <Input
              id="name"
              placeholder="Ex: Lançamento Produto Q4"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Descrição
            </label>
            <Textarea
              id="description"
              placeholder="Descreva o objetivo do projeto..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cor do projeto</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-8 w-8 rounded-md transition-all ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-foreground scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="start_date" className="text-sm font-medium">
                Data de início
              </label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="target_date" className="text-sm font-medium">
                Data alvo
              </label>
              <Input
                id="target_date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {isEdit && (
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                Status
              </label>
              <Select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
              >
                <option value="active">🟢 Ativo</option>
                <option value="completed">✅ Concluído</option>
                <option value="archived">📦 Arquivado</option>
              </Select>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar projeto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}