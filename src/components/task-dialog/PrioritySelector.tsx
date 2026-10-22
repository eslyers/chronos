"use client";

import { Flag } from "lucide-react";
import { PRIORITY_BADGE_CLASS, PRIORITY_LABEL, type Priority } from "@/lib/priority";

// Rótulos e cores vêm de lib/priority (DESIGN.md); aqui só ícone e hover
const PRIORITIES: Array<{ value: Priority; icon: string; hoverClass: string }> = [
  { value: "low", icon: "⬇️", hoverClass: "hover:bg-slate-500/10 hover:border-slate-500/30" },
  { value: "medium", icon: "➡️", hoverClass: "hover:bg-blue-500/10 hover:border-blue-500/30" },
  { value: "high", icon: "⬆️", hoverClass: "hover:bg-orange-500/10 hover:border-orange-500/30" },
  { value: "critical", icon: "🔥", hoverClass: "hover:bg-red-500/10 hover:border-red-500/30" },
];

interface PrioritySelectorProps {
  value: Priority;
  onChange: (value: Priority) => void;
}

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div className="space-y-2">
      <span
        id="task-priority-label"
        className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
      >
        <Flag className="h-3.5 w-3.5 text-blue-500" />
        Nível de Prioridade
      </span>
      <div role="group" aria-labelledby="task-priority-label" className="grid grid-cols-4 gap-2">
        {PRIORITIES.map((p) => {
          const isSelected = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(p.value)}
              className={`
                flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl text-xs font-semibold
                border transition-all duration-150
                ${isSelected ? `${PRIORITY_BADGE_CLASS[p.value]} ring-1 ring-current` : `border-input bg-background text-muted-foreground ${p.hoverClass}`}
              `}
            >
              <span aria-hidden="true">{p.icon}</span>
              <span>{PRIORITY_LABEL[p.value]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
