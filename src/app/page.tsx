"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  KanbanSquare,
  Bell,
  History,
  Sparkles,
  Github,
  ShieldCheck,
  Zap,
  TrendingUp,
  CheckCircle2,
  Layers,
  Clock,
  Users,
  ChevronRight,
  Activity,
  FileCheck,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || "CHRONOS";
  const [activeTab, setActiveTab] = useState<"gantt" | "kanban" | "telegram" | "audit">("gantt");

  const features = [
    {
      icon: Calendar,
      title: "Timeline & Gantt Dinâmico",
      description: "Visualização clara de etapas temporais com mapeamento de dependências FS, SS, FF e SF sem risco de ciclos.",
      color: "from-blue-500 to-indigo-500",
      badge: "Previsibilidade",
    },
    {
      icon: KanbanSquare,
      title: "Kanban com WIP Limits",
      description: "Acompanhamento fluido da execução por coluna com limitação de trabalho em progresso para mitigar gargalos.",
      color: "from-indigo-500 to-purple-500",
      badge: "Produtividade",
    },
    {
      icon: Bell,
      title: "Notificações Inteligentes no Telegram",
      description: "Alertas automáticos disparados antes do vencimento, em mudança de status e em atrasos críticos de entregáveis.",
      color: "from-sky-400 to-blue-600",
      badge: "Zero Surpresas",
    },
    {
      icon: History,
      title: "Trilha de Auditoria Estrita",
      description: "Histórico imutável de transições de cada etapa, registrando responsável, horário exato e logs de alteração.",
      color: "from-emerald-400 to-teal-600",
      badge: "Governança",
    },
    {
      icon: Sparkles,
      title: "Templates Corporativos Pré-definidos",
      description: "Inicie novos cronogramas em segundos com modelos padrão para TI, Lançamentos, Obras e Consultoria.",
      color: "from-purple-500 to-pink-500",
      badge: "Agilidade",
    },
    {
      icon: ShieldCheck,
      title: "Arquitetura Enterprise & Supabase",
      description: "Segurança de dados com Row Level Security (RLS), autenticação JWT nativa e isolamento por workspace.",
      color: "from-blue-600 to-cyan-500",
      badge: "Segurança",
    },
  ];

  const metrics = [
    { value: "99.8%", label: "Precisão na Entrega", description: "Projetos concluídos sem estouro de prazo" },
    { value: "4.8x", label: "Mais Visibilidade", description: "Redução de reuniões de status desnecessárias" },
    { value: "100%", label: "Auditável", description: "Histórico completo de alterações por etapa" },
    { value: "< 2 min", label: "Setup Rápido", description: "Implantação instantânea sem fricção" },
  ];

  const useCases = [
    {
      title: "Tecnologia & Engenharia de Software",
      desc: "Mapeie sprints, dependências de entregas de APIs, datas de deploy e lançamentos com total controle.",
      icon: Layers,
    },
    {
      title: "Operações & Lançamentos Corporativos",
      desc: "Garanta que todos os departamentos (Marketing, Legal, Vendas) executem suas etapas na sequência correta.",
      icon: TrendingUp,
    },
    {
      title: "Infraestrutura & Obras",
      desc: "Cronogramas físico-financeiros rigorosos com bloqueio automático de etapas dependentes não concluídas.",
      icon: FileCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Background Glow Mesh */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-40 dark:opacity-25">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 h-[600px] w-[600px] rounded-full bg-gradient-to-br from-indigo-500/20 to-sky-500/20 blur-[140px]" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 transition-transform hover:scale-105">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md shadow-blue-500/20">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                {productName}
              </span>
              <Badge variant="outline" className="hidden sm:inline-flex border-blue-500/30 text-blue-500 bg-blue-500/5 text-[10px] uppercase font-bold tracking-wider">
                Enterprise
              </Badge>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Recursos
              </Link>
              <Link href="#showcase" className="text-muted-foreground hover:text-foreground transition-colors">
                Plataforma
              </Link>
              <Link href="#solutions" className="text-muted-foreground hover:text-foreground transition-colors">
                Soluções
              </Link>
              <Link
                href="https://github.com/eslyers/chronos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
              >
                <Github className="h-4 w-4" />
                GitHub
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/auth/login">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 font-semibold">
                <Link href="/auth/register">
                  Acessar Plataforma
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-500 shadow-inner mb-8">
            <Sparkles className="h-3.5 w-3.5" />
            <span>CHRONOS ENTERPRISE 2.0 • Gestão Visível de Prazos</span>
            <ChevronRight className="h-3 w-3" />
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.1]">
            O Controle de Projetos Corporativos{" "}
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Reimaginado
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Combine a previsibilidade da linha do tempo **Gantt** com a agilidade do **Kanban** e o monitoramento proativo via **Telegram**. Governança em tempo real para sua equipe.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 font-semibold">
              <Link href="/auth/register">
                Começar Gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base border-border hover:bg-muted font-medium">
              <Link href="/app">
                <Activity className="mr-2 h-5 w-5 text-blue-500" />
                Explorar Dashboard Demo
              </Link>
            </Button>
          </div>

          {/* Trust Highlights */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Sem necessidade de cartão
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Setup instantâneo
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 100% Auditável & Seguro
            </span>
          </div>
        </div>
      </section>

      {/* Interactive Showcase Section */}
      <section id="showcase" className="relative z-10 py-16 md:py-24 border-t border-border/40 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Uma Experiência Visual Unificada
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto text-base">
              Alterne entre as visões do sistema e veja como o Chronos alinha sua equipe do planejamento à execução.
            </p>

            {/* Showcase Tabs */}
            <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-card border border-border/80 shadow-sm max-w-full overflow-x-auto">
              <button
                onClick={() => setActiveTab("gantt")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "gantt"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Timeline Gantt
              </button>
              <button
                onClick={() => setActiveTab("kanban")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "kanban"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <KanbanSquare className="h-4 w-4" />
                Board Kanban
              </button>
              <button
                onClick={() => setActiveTab("telegram")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "telegram"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bell className="h-4 w-4" />
                Alertas Telegram
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === "audit"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-4 w-4" />
                Auditoria & Logs
              </button>
            </div>
          </div>

          {/* Interactive Window Mockup */}
          <div className="relative rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-2xl shadow-blue-500/5 backdrop-blur-xl">
            {/* Window Controls Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-xs font-semibold text-muted-foreground font-mono">
                  Chronos Workspace / Projeto Alfa Corporate
                </span>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
                ● Live Sync Active
              </Badge>
            </div>

            {/* Tab 1: Gantt Mockup */}
            {activeTab === "gantt" && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b border-border/40 pb-2">
                  <span>Etapa / Entregável</span>
                  <span>Semana 1</span>
                  <span>Semana 2</span>
                  <span>Semana 3</span>
                  <span>Status</span>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-5 items-center gap-4 text-sm p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="font-semibold flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> 1. Arquitetura do Sistema
                    </span>
                    <div className="col-span-3 bg-blue-500/20 h-7 rounded-lg relative overflow-hidden border border-blue-500/40">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full w-[85%] rounded-lg flex items-center justify-end pr-2 text-[10px] text-white font-bold">
                        85%
                      </div>
                    </div>
                    <Badge className="w-fit bg-blue-500/10 text-blue-500 border-blue-500/30">Em Progresso</Badge>
                  </div>

                  <div className="grid grid-cols-5 items-center gap-4 text-sm p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="font-semibold flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> 2. Integração de Segurança JWT
                    </span>
                    <div className="col-span-3 bg-purple-500/20 h-7 rounded-lg relative overflow-hidden border border-purple-500/40 ml-12">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full w-[100%] rounded-lg flex items-center justify-end pr-2 text-[10px] text-white font-bold">
                        100%
                      </div>
                    </div>
                    <Badge className="w-fit bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Concluído</Badge>
                  </div>

                  <div className="grid grid-cols-5 items-center gap-4 text-sm p-3 rounded-xl bg-muted/40 border border-border/40">
                    <span className="font-semibold flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 3. Deploy do Pipeline CI/CD
                    </span>
                    <div className="col-span-3 bg-amber-500/20 h-7 rounded-lg relative overflow-hidden border border-amber-500/40 ml-28">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full w-[40%] rounded-lg flex items-center justify-end pr-2 text-[10px] text-white font-bold">
                        40%
                      </div>
                    </div>
                    <Badge className="w-fit bg-amber-500/10 text-amber-500 border-amber-500/30">Atenção</Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Kanban Mockup */}
            {activeTab === "kanban" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm">A Fazer (2)</span>
                    <Badge variant="outline" className="text-xs">WIP: 5</Badge>
                  </div>
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-lg bg-card border border-border shadow-sm text-xs font-semibold">
                      Configurar Webhooks do Telegram
                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="text-blue-500 font-bold">Alta Prioridade</span>
                        <span>Prazo: Amanhã</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm">Em Progresso (1)</span>
                    <Badge variant="outline" className="text-xs">WIP: 3</Badge>
                  </div>
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-lg bg-card border border-blue-500/40 shadow-md text-xs font-semibold">
                      Otimização de Lazy Loading no DataContext
                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="text-emerald-500 font-bold">Em Execução</span>
                        <span>Esly S.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border border-border/60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm">Concluído (4)</span>
                    <Badge variant="outline" className="text-xs">WIP: ∞</Badge>
                  </div>
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-lg bg-card border border-emerald-500/30 opacity-80 text-xs font-semibold">
                      Validação Estrita de Inputs com Zod
                      <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-500 font-bold">
                        <span>✓ Auditado</span>
                        <span>Hoje</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Telegram Mockup */}
            {activeTab === "telegram" && (
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 text-white font-sans shadow-xl animate-fadeIn">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-3">
                  <div className="h-8 w-8 rounded-full bg-sky-500 flex items-center justify-center font-bold text-xs">
                    🤖
                  </div>
                  <div>
                    <p className="text-xs font-bold">Chronos Bot (@ChronosAlertBot)</p>
                    <p className="text-[10px] text-slate-400">Notificações Automáticas de Prazos</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="font-semibold text-sky-400">⚠️ ALERTA DE VENCIMENTO PRÓXIMO</p>
                    <p className="mt-1 text-slate-300">A tarefa **"Homologação do Banco de Dados"** vence em 24 horas.</p>
                    <p className="mt-2 text-[10px] text-slate-500">Projeto: Alfa Corporate • Responsável: Sarah</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="font-semibold text-emerald-400">✅ TRANSIÇÃO DE ETAPA</p>
                    <p className="mt-1 text-slate-300">Etapa **"Testes de Integração CI/CD"** concluída por Esly S.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: Audit Mockup */}
            {activeTab === "audit" && (
              <div className="space-y-2 text-xs animate-fadeIn">
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <History className="h-4 w-4 text-blue-500" />
                    <span>Transição: **"Etapa 2 - Validação"** movida de `Em Progresso` para `Concluído`</span>
                  </div>
                  <span className="font-mono text-muted-foreground">Hoje às 18:42:05</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Autenticação: Token JWT validado pelo backend Supabase</span>
                  </div>
                  <span className="font-mono text-muted-foreground">Hoje às 18:30:12</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-purple-500" />
                    <span>Importação: Batch Insert de 45 tarefas concluído com sucesso</span>
                  </div>
                  <span className="font-mono text-muted-foreground">Hoje às 17:15:00</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Corporate Metrics Section */}
      <section className="py-16 md:py-24 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {metrics.map((m, i) => (
              <div key={i} className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur shadow-sm">
                <p className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                  {m.value}
                </p>
                <p className="mt-2 text-sm font-semibold">{m.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 md:py-28 border-t border-border/40 bg-muted/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge variant="outline" className="border-blue-500/30 text-blue-500 bg-blue-500/5 mb-4">
              Recursos de Governança
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Projetado para Garantir a Saúde do Cronograma
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Cada funcionalidade foi construída para remover ambiguidades e entregar visibilidade absoluta.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <Card
                key={i}
                className="group relative overflow-hidden border border-border/70 bg-card p-6 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-md`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <Badge variant="secondary" className="text-[11px]">
                    {feature.badge}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold tracking-tight group-hover:text-blue-500 transition-colors">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions by Sector */}
      <section id="solutions" className="py-20 md:py-28 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Adequado para Diferentes Tipos de Operação
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              Veja como o Chronos se adapta às necessidades de cada setor.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {useCases.map((uc, i) => (
              <div key={i} className="p-8 rounded-2xl border border-border/80 bg-card shadow-sm hover:border-foreground/30 transition-all">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6">
                  <uc.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold mb-2">{uc.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 md:py-28 border-t border-border/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-1 shadow-2xl">
            <div className="rounded-[23px] bg-background p-10 sm:p-16">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                Pronto para Elevar o Nível da sua Gestão?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                Crie sua conta agora e monte seu primeiro cronograma corporativo em menos de 2 minutos.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild size="lg" className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-500/25">
                  <Link href="/auth/register">
                    Iniciar Grátis Agora
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
                🕐
              </div>
              <span className="font-bold tracking-tight">{productName} Enterprise</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} {productName} — Sistema de Gestão de Cronograma e Timeline Corporativo.
            </p>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <Link href="https://github.com/eslyers/chronos" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                GitHub Repository
              </Link>
              <Link href="/auth/login" className="hover:text-foreground transition-colors">
                Área do Cliente
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
