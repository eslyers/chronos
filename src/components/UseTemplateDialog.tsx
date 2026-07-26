"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Sparkles, Palette } from "lucide-react";
import { useData } from "@/lib/context/DataContext";

interface Template {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  stages: unknown[];
}

interface UseTemplateDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = [
  { name: "Azul",        value: "#3b82f6" },
  { name: "Azul Marinho",value: "#1e40af" },
  { name: "Índigo",      value: "#6366f1" },
  { name: "Verde",       value: "#10b981" },
  { name: "Esmeralda",   value: "#059669" },
  { name: "Roxo",        value: "#a855f7" },
  { name: "Rosa",        value: "#ec4899" },
  { name: "Vermelho",    value: "#ef4444" },
  { name: "Cinza",       value: "#64748b" },
];

export function UseTemplateDialog({ template, open, onOpenChange }: UseTemplateDialogProps) {
  const router = useRouter();
  const { createProject } = useData();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0].value);
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-preenche com dados do template ao abrir
  useEffect(() => {
    if (open && template) {
      setName(template.name);
      setDescription(template.description ?? "");
      setColor(COLORS[0].value);
      setStartDate("");
      setTargetDate("");
      setError("");
    }
  }, [open, template]);

  if (!open || !template) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome do projeto é obrigatório.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        color,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
        templateId: template!.id,
      });

      if (!project) throw new Error("Falha ao criar projeto.");

      onOpenChange(false);
      router.push(`/app/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar projeto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="use-template-title"
        className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com gradiente e ícone do template */}
        <div className="bg-gradient-to-r from-blue-600/10 via-blue-500/5 to-transparent border-b border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="text-4xl p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-sm shrink-0">
              {template.icon || "📋"}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">
                  A partir do template
                </span>
              </div>
              <h2 id="use-template-title" className="text-xl font-bold leading-tight">
                {template.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {(template.stages as unknown[])?.length || 0} etapas pré-configuradas serão importadas
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nome do projeto */}
          <div className="space-y-1.5">
            <label htmlFor="tpl-proj-name" className="text-sm font-semibold">
              Nome do Projeto <span className="text-destructive">*</span>
            </label>
            <input
              id="tpl-proj-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Processo Seletivo — Q3 2026"
              autoFocus
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label htmlFor="tpl-proj-desc" className="text-sm font-semibold">
              Descrição <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              id="tpl-proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivo do projeto, contexto, responsável..."
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="tpl-start-date" className="text-sm font-semibold">
                Data de início
              </label>
              <input
                id="tpl-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="tpl-target-date" className="text-sm font-semibold">
                Previsão de término
              </label>
              <input
                id="tpl-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              Cor do projeto
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all duration-150 ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                      : "hover:scale-105 opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Erro */}
          {error && (
            <p className="text-xs text-destructive font-medium bg-destructive/10 px-3 py-2 rounded-md">
              ⚠️ {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 h-11 rounded-md border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 h-11 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando projeto...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Criar Projeto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
