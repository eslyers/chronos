"use client";
import React from "react";
import { Bell, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
        <p className="text-muted-foreground">
          Histórico de alertas enviados e preferências
        </p>
      </div>

      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-sky-500/10 mb-4">
            <Bell className="h-10 w-10 text-sky-600" />
          </div>
          <h2 className="text-2xl font-semibold">Sprint 5 — Em construção</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            O sistema de notificações por Telegram + Email será ativado em Sprint 5
            usando Supabase Edge Functions (Deno) com cron jobs diários.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-sky-500" />
              Alertas de prazo próximo (3, 1, 0 dias antes)
            </div>
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-sky-500" />
              Alertas de tarefa atrasada (diário 09:00)
            </div>
            <div className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-sky-500" />
              Quiet hours por usuário + opt-out por projeto
            </div>
          </div>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/app/settings">
              Configurar Telegram
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
