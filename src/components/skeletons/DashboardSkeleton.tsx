import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto animate-fadeIn">
      {/* Welcome Banner Skeleton */}
      <div className="bg-card border border-border/80 p-6 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2.5">
          <Skeleton className="h-10 w-36 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5 border-border/80 bg-card space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-8 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-40" />
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 border-border/80 bg-card space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="p-3 border border-border/60 rounded-xl flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 border-border/80 bg-card space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3 pt-2">
            {[1, 2, 3].map((k) => (
              <div key={k} className="p-3 border border-border/60 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
