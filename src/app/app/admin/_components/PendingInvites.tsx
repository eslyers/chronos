"use client";

// Convites pendentes do workspace (somente leitura). Convidar e reenviar
// continuam na página Usuários.
import Link from "next/link";
import { Clock, Mail, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccessInvite } from "@/lib/access/types";
import { WORKSPACE_ROLE_LABEL } from "@/lib/access/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export function PendingInvites({ invites }: { invites: AccessInvite[] }) {
  const now = Date.now();
  return (
    <section aria-labelledby="convites-pendentes" className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h2 id="convites-pendentes" className="text-sm font-bold flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-500" aria-hidden />
          Convites pendentes
          <span className="text-muted-foreground font-semibold">({invites.length})</span>
        </h2>
        <Button asChild variant="outline" size="sm" className="h-8 text-xs border-border/80 self-start sm:self-auto">
          <Link href="/app/users">
            <UserPlus className="h-3.5 w-3.5" />
            Convidar ou reenviar em Usuários
          </Link>
        </Button>
      </div>
      {invites.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum convite pendente.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/80">
          {invites.map((inv) => {
            const expired = new Date(inv.expires_at).getTime() < now;
            return (
              <li key={`${inv.email}-${inv.expires_at}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                <span className="font-medium truncate min-w-0 max-w-full">{inv.email}</span>
                <Badge variant="outline" className="border-0 bg-muted text-muted-foreground text-[11px]">
                  {WORKSPACE_ROLE_LABEL[inv.role]}
                </Badge>
                <span className={cn("ml-auto text-xs", expired ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                  {expired ? `Expirou em ${formatDate(inv.expires_at)}` : `Expira em ${formatDate(inv.expires_at)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
