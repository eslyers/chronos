import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function FastCloseSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto animate-fadeIn">
      {/* Executive Header Skeleton */}
      <div className="bg-card border border-border/80 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Skeleton className="h-9 w-44 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        </div>

        {/* Closing Progress Bar Skeleton */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-4 border-border/80 bg-card/60 space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-36" />
          </Card>
        ))}
      </div>

      {/* Board Columns Skeleton */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1">
        {[
          { label: "D-2", d0: false },
          { label: "D-1", d0: false },
          { label: "D0", d0: true },
          { label: "D+1", d0: false },
          { label: "D+2", d0: false },
        ].map((col, idx) => (
          <div
            key={idx}
            className={`flex-shrink-0 w-80 rounded-2xl border flex flex-col ${
              col.d0
                ? "border-pink-500/30 bg-pink-500/5"
                : "border-border/80 bg-card/50"
            }`}
          >
            {/* Column Header */}
            <div className="p-3.5 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className={`h-5 w-12 rounded ${col.d0 ? "bg-pink-500/20" : ""}`} />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-5 w-6 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>

            {/* Column Cards */}
            <div className="p-2.5 space-y-2.5 min-h-[380px]">
              {[1, 2, 3].map((cardIdx) => (
                <div
                  key={cardIdx}
                  className="p-3.5 rounded-xl border border-border/70 bg-card space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="space-y-1 pt-1">
                    <Skeleton className="h-1.5 w-full rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-5 w-24 rounded" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
