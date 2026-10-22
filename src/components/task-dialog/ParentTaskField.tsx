"use client";

import { CornerDownRight, FileText } from "lucide-react";
import type { Task } from "@/lib/context/DataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ParentTaskFieldProps {
  value: string;
  onChange: (parentTaskId: string) => void;
  options: Task[];
}

// Vinculação de Sub-tarefa (WBS)
export function ParentTaskField({ value, onChange, options }: ParentTaskFieldProps) {
  return (
    <div className="space-y-1.5 col-span-1 sm:col-span-2">
      <label htmlFor="task-parent" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <CornerDownRight className="h-3.5 w-3.5 text-blue-500" />
        Estrutura WBS: Vincular como Sub-tarefa de
      </label>
      <Select
        value={value || "none"}
        onValueChange={(val) => onChange(val === "none" ? "" : val)}
      >
        <SelectTrigger id="task-parent" className="h-10 rounded-xl bg-background border-border/80">
          <SelectValue placeholder="Selecione a tarefa raiz" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">— Nenhuma (Tarefa Principal / Raiz) —</span>
          </SelectItem>
          {options.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{t.title}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
