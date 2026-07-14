"use client";
import React from "react";
import { Construction, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
        <p className="text-muted-foreground">
          Gerencie seus cronogramas e timelines
        </p>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-amber-500/10 mb-4">
            <Construction className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-semibold">Em construção</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            A listagem e gestão completa de projetos está sendo implementada no Sprint 2.
            Aqui você poderá criar, editar e excluir projetos com etapas e tarefas.
          </p>
          <div className="mt-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              Roadmap <ArrowRight className="h-3 w-3" /> Próximo: Sprint 2
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
