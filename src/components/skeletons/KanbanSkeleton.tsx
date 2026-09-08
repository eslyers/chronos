import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function KanbanSkeleton() {
  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Executive Header Banner Skeleton */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-4 w-48" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-10 w-44 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Board Columns Skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x">
        {["A Fazer", "Em Andamento", "Revisão", "Concluído"].map((stageName, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 w-80 flex flex-col rounded-2xl border border-border/80 bg-muted/20"
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-border/60 bg-card/60 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="h-5 w-28" />
              </div>
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-6 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>

            {/* Column Cards */}
            <div className="p-3 space-y-3 min-h-[420px]">
              {[1, 2, 3].map((cardIdx) => (
                <Card
                  key={cardIdx}
                  className="p-3.5 border-border/70 bg-card space-y-3 shadow-xs border-l-4 border-l-muted"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-56" />
                  <div className="flex items-center gap-2 pt-1">
                    <Skeleton className="h-4 w-20 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
