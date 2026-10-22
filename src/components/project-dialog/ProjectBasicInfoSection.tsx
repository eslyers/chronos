"use client";

import { FileText, AlignLeft, Palette, Check } from "lucide-react";

const COLORS = [
  { name: "Azul Corporativo", value: "#3b82f6" },
  { name: "Azul Marinho",     value: "#1e40af" },
  { name: "Índigo",           value: "#6366f1" },
  { name: "Verde Esmeralda",  value: "#10b981" },
  { name: "Verde Floresta",   value: "#059669" },
  { name: "Roxo",             value: "#a855f7" },
  { name: "Rosa Premium",     value: "#ec4899" },
  { name: "Vermelho Alerta",  value: "#ef4444" },
  { name: "Cinza Concreto",   value: "#64748b" },
];

interface ProjectBasicInfoSectionProps {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  color: string;
  onColorChange: (value: string) => void;
}

// Nome, descrição e cor do projeto
export function ProjectBasicInfoSection({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  color,
  onColorChange,
}: ProjectBasicInfoSectionProps) {
  return (
    <>
      {/* Nome do Projeto */}
      <div className="space-y-1.5">
        <label htmlFor="project-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-blue-500" />
          Nome do Projeto <span className="text-destructive">*</span>
        </label>
        <input
          id="project-name"
          type="text"
          placeholder="Ex: Transformação Digital Q4"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="flex h-11 w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all font-medium"
        />
      </div>

      {/* Descrição */}
      <div className="space-y-1.5">
        <label htmlFor="project-desc" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <AlignLeft className="h-3.5 w-3.5 text-blue-500" />
          Descrição do Escopo
        </label>
        <textarea
          id="project-desc"
          placeholder="Objetivos estratégicos, partes interessadas e abrangência do projeto..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all resize-none leading-relaxed"
        />
      </div>

      {/* Cor do Projeto */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5 text-blue-500" />
          Identificador Visual (Cor)
        </span>
        <div className="flex flex-wrap gap-2.5">
          {COLORS.map((c) => {
            const isSelected = color === c.value;
            return (
              <button
                key={c.value}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={isSelected}
                onClick={() => onColorChange(c.value)}
                className={`
                  relative w-8 h-8 rounded-xl transition-all duration-200 flex items-center justify-center
                  ${isSelected ? "scale-110 shadow-lg ring-2 ring-offset-2 ring-blue-500" : "hover:scale-105 opacity-80 hover:opacity-100"}
                `}
                style={{ backgroundColor: c.value }}
              >
                {isSelected && <Check className="h-4 w-4 text-white drop-shadow-md" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
