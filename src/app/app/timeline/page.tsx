"use client";
import React from "react";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TimelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timeline (Gantt)</h1>
        <p className="text-muted-foreground">
          Visualize etapas em barras temporais com drag-and-drop
        </p>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-amber-500/10 mb-4">
            <Calendar className="h-10 w-10 text-amber-600" />
          </div>
          <h2 className="text-2xl font-semibold">Sprint 3 — Em construção</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            A visualização Gantt interativa com drag-and-drop e dependências
            será implementada usando a lib <code className="font-mono text-foreground">gantt-task-react</code> + <code className="font-mono text-foreground">dnd-kit</code>.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Dependências, drag, zoom e hover com detalhes
            </div>
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Linhas conectoras mostrando precedências
            </div>
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Critical path highlight (em Sprint 7)
            </div>
          </div>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/app/projects">
              Voltar para projetos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
