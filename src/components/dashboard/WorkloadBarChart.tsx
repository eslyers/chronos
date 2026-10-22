"use client";

// Gráfico de barras da carga por colaborador. Fica em arquivo próprio para
// ser carregado sob demanda (next/dynamic): recharts não entra no bundle
// inicial da página de workload.
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import type { WorkloadStatus } from "@/lib/workload";

export type WorkloadChartDatum = {
  name: string;
  fullName: string;
  horas: number;
  capacidade: number;
  utilizacao: number;
  status: WorkloadStatus;
};

export function workloadStatusColor(status: WorkloadStatus): string {
  switch (status) {
    case "overload":
      return "#ef4444"; // red-500
    case "optimal":
      return "#10b981"; // emerald-500
    case "under":
    default:
      return "#3b82f6"; // blue-500
  }
}

export default function WorkloadBarChart({
  data,
  weeklyCapacity,
}: {
  data: WorkloadChartDatum[];
  weeklyCapacity: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "currentColor" }}
          interval={0}
          angle={-15}
          textAnchor="end"
        />
        <YAxis tick={{ fontSize: 11, fill: "currentColor" }} unit="h" />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload as WorkloadChartDatum;
              return (
                <div className="bg-card border border-border p-3 rounded-xl shadow-xl text-xs space-y-1">
                  <p className="font-bold text-foreground">{d.fullName}</p>
                  <p className="text-muted-foreground">
                    Horas Pendentes: <strong className="text-foreground">{d.horas}h</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Utilização: <strong style={{ color: workloadStatusColor(d.status) }}>{d.utilizacao}%</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Capacidade: <strong>{d.capacidade}h</strong>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine
          y={weeklyCapacity}
          stroke="#f59e0b"
          strokeDasharray="4 4"
          strokeWidth={2}
          label={{
            value: `Capacidade (${weeklyCapacity}h)`,
            position: "top",
            fill: "#f59e0b",
            fontSize: 11,
            fontWeight: 600,
          }}
        />
        <Bar dataKey="horas" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={workloadStatusColor(entry.status)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
