"use client";

// Abas de gráficos do ProjectAnalyticsDialog. Arquivo separado para ser
// carregado sob demanda (next/dynamic): recharts só é baixado quando o
// diálogo de analytics é aberto.
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, Users, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type BurndownPoint = { date: string; Ideal: number; Real: number; Concluídas: number };
export type AssigneePoint = {
  name: string;
  Concluídas: number;
  "Em Andamento": number;
  Pendentes: number;
  Atrasadas: number;
};
export type PriorityPoint = { name: string; val: number; color: string };
export type StagePoint = { name: string; Tarefas: number; wipLimit: number; color: string };

export interface ProjectAnalyticsChartsProps {
  burndownData: BurndownPoint[];
  assigneeData: AssigneePoint[];
  priorityData: PriorityPoint[];
  stageData: StagePoint[];
}

const TOOLTIP_STYLE = {
  backgroundColor: "var(--background)",
  borderColor: "var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
};

export default function ProjectAnalyticsCharts({
  burndownData,
  assigneeData,
  priorityData,
  stageData,
}: ProjectAnalyticsChartsProps) {
  return (
    <Tabs defaultValue="burndown" className="space-y-4 pt-2">
      <TabsList className="bg-muted p-1 w-full flex overflow-x-auto justify-start flex-nowrap scrollbar-none">
        <TabsTrigger value="burndown" className="text-xs font-semibold gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          <span>Burndown & Evolução</span>
        </TabsTrigger>
        <TabsTrigger value="workload" className="text-xs font-semibold gap-1.5">
          <Users className="h-3.5 w-3.5" />
          <span>Carga de Trabalho</span>
        </TabsTrigger>
        <TabsTrigger value="distribution" className="text-xs font-semibold gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          <span>Prioridades & Estágios</span>
        </TabsTrigger>
      </TabsList>

      {/* TAB 1: BURNDOWN CHART */}
      <TabsContent value="burndown" className="space-y-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
              <span>Gráfico de Burndown (Tarefas Pendentes x Linha Ideal)</span>
              <span className="text-xs text-muted-foreground font-normal">
                Meta vs Realizado ao longo do tempo
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {burndownData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                Sem dados suficientes para gerar o gráfico de Burndown.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={burndownData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIdeal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Area
                      type="monotone"
                      dataKey="Ideal"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      fillOpacity={1}
                      fill="url(#colorIdeal)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Real"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorReal)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB 2: CARGA DE TRABALHO POR RESPONSÁVEL */}
      <TabsContent value="workload" className="space-y-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between text-foreground">
              <span>Distribuição de Tarefas por Responsável</span>
              <span className="text-xs text-muted-foreground font-normal">
                Comparativo de Concluídas, Em Andamento, Pendentes e Atrasadas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {assigneeData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                Nenhum responsável atribuído às tarefas deste projeto.
              </div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={assigneeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Bar dataKey="Concluídas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Em Andamento" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Pendentes" stackId="a" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Atrasadas" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* TAB 3: PRIORIDADES E ESTÁGIOS */}
      <TabsContent value="distribution" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground">
                Distribuição por Prioridade
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="val"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-foreground">
                Tarefas por Estágio do Kanban
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={stageData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="Tarefas" radius={[0, 4, 4, 0]}>
                      {stageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
