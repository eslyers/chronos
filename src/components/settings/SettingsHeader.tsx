"use client";

import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SettingsHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
              CONFIGURAÇÕES DO SISTEMA
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
            <Settings className="h-7 w-7 text-blue-500" />
            Configurações do Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Gerencie os dados do seu perfil, preferências globais de notificação por e-mail e regras por projeto.
          </p>
        </div>
      </div>
    </div>
  );
}
