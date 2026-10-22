"use client";

import { User } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/components/settings/types";

interface ProfileSectionProps {
  profile: Profile;
  onFullNameChange: (value: string) => void;
  onSave: () => void;
  loading: boolean;
}

export function ProfileSection({ profile, onFullNameChange, onSave, loading }: ProfileSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Perfil
        </CardTitle>
        <CardDescription>Informações da sua conta (salvas no Supabase)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Email</label>
            <p className="mt-1 text-sm font-medium text-foreground">{profile.email}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Timezone</label>
            <p className="mt-1 text-sm">{profile.timezone}</p>
          </div>
          <div className="md:col-span-2 space-y-1.5 pt-2 border-t border-border/60">
            <label className="text-sm font-semibold text-foreground">
              Nome de Exibição / Completo
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Input
                value={profile.full_name || ""}
                onChange={(e) => onFullNameChange(e.target.value)}
                placeholder="Ex: Eder Silva ou Esly"
                className="max-w-md bg-background"
              />
              <Button
                type="button"
                onClick={onSave}
                disabled={loading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
              >
                Salvar Nome
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este nome será exibido na saudação de boas-vindas do Dashboard e nos registros de tarefas.
            </p>
          </div>
          <div className="md:col-span-2 pt-2 border-t border-border/40">
            <label className="text-xs font-medium text-muted-foreground">ID do Usuário</label>
            <p className="mt-0.5 text-xs font-mono text-muted-foreground/80 truncate">{profile.id}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
