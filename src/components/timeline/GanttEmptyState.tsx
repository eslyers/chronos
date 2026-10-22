"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

// Estado vazio do Gantt (nenhuma tarefa com datas no escopo)
export function GanttEmptyState() {
  return (
    <div className="text-center py-20 px-4 space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 mx-auto">
        <Calendar className="h-8 w-8" />
      </div>
      <h3 className="text-xl font-bold tracking-tight">Nenhum cronograma nesta visualização</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        Cadastre tarefas com data de início e prazo ou importe uma planilha para visualizar o mapa temporal no Gantt.
      </p>
      <div className="pt-2">
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          <Link href="/app/projects">Gerenciar Projetos</Link>
        </Button>
      </div>
    </div>
  );
}
