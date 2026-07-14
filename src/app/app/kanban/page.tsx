"use client";
import React from "react";
import { KanbanSquare, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function KanbanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
        <p className="text-muted-foreground">
          Acompanhe o fluxo de execução em colunas arrastáveis
        </p>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-blue-500/10 mb-4">
            <KanbanSquare className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-semibold">Sprint 4 — Em construção</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Board com colunas arrastáveis + WIP limits será implementado usando
            <code className="font-mono text-foreground"> @dnd-kit/core</code> e{" "}
            <code className="font-mono text-foreground">@dnd-kit/sortable</code>.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Drag-and-drop acessível (suporte a teclado)
            </div>
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              WIP limits visíveis em cada coluna
            </div>
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              Transições gravadas automaticamente no audit log
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
