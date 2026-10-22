"use client";

import { FileText, MessageSquare, Paperclip, type LucideIcon } from "lucide-react";

export type TaskDialogTab = "details" | "comments" | "attachments";

interface TaskDialogTabsProps {
  activeTab: TaskDialogTab;
  onTabChange: (tab: TaskDialogTab) => void;
  commentsCount: number;
  attachmentsCount: number;
}

// Navegação entre abas (apenas em edição)
export function TaskDialogTabs({ activeTab, onTabChange, commentsCount, attachmentsCount }: TaskDialogTabsProps) {
  const tabs: Array<{ value: TaskDialogTab; icon: LucideIcon; label: string }> = [
    { value: "details", icon: FileText, label: "Dados da Tarefa" },
    { value: "comments", icon: MessageSquare, label: `Comentários (${commentsCount})` },
    { value: "attachments", icon: Paperclip, label: `Anexos (${attachmentsCount})` },
  ];

  return (
    <div className="flex items-center gap-2 px-4 sm:px-6 pt-2 border-b border-border bg-muted/20 shrink-0 overflow-x-auto justify-start flex-nowrap scrollbar-none">
      {tabs.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onTabChange(value)}
          className={`px-3.5 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === value
              ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-background rounded-t-lg shadow-sm"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
