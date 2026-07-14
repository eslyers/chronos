import Link from "next/link";
import { ArrowRight, Calendar, KanbanSquare, Bell, History, Sparkles, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const productName = process.env.NEXT_PUBLIC_PRODUCTNAME || "CHRONOS";

  const features = [
    {
      icon: Calendar,
      title: "Timeline Gantt",
      description: "Visualize etapas em barras temporais com drag-and-drop e dependências.",
      color: "text-amber-500",
    },
    {
      icon: KanbanSquare,
      title: "Kanban Board",
      description: "Acompanhe o fluxo de execução com colunas arrastáveis e WIP limits.",
      color: "text-blue-500",
    },
    {
      icon: Bell,
      title: "Notificações Telegram",
      description: "Receba alertas de prazo, transição de etapa e tarefas atrasadas no Telegram.",
      color: "text-sky-500",
    },
    {
      icon: History,
      title: "Auditoria etapa-a-etapa",
      description: "Histórico completo de cada transição de etapa com autor e timestamp.",
      color: "text-emerald-500",
    },
    {
      icon: Sparkles,
      title: "Templates prontos",
      description: "Comece em 1 clique com templates de cronograma de body, lançamento, migração.",
      color: "text-purple-500",
    },
    {
      icon: Github,
      title: "Open Source",
      description: "MIT, self-hosted, sem vendor lock-in. Stack: Next.js 15 + Supabase.",
      color: "text-foreground",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Nav */}
      <nav className="sticky top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🕐</span>
              <span className="text-2xl font-bold tracking-tight">{productName}</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
                Features
              </Link>
              <Link
                href="https://github.com/eslyers/chronos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                <Github className="h-4 w-4" />
                GitHub
              </Link>
              <Button asChild>
                <Link href="/auth/login">
                  Entrar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              v0.1 — Open source, MIT
            </div>
            <h1 className="mt-6 text-5xl md:text-6xl font-bold tracking-tight">
              Cronograma{" "}
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                visual
              </span>{" "}
              para quem precisa avisar a hora
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground">
              CHRONOS une Gantt + Kanban + Notificações Telegram em um só lugar.
              Visualize etapa-a-etapa, evolua com clareza, receba alertas antes do prazo.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link href="/auth/register">
                  Criar conta grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link
                  href="https://github.com/eslyers/chronos"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 h-5 w-5" />
                  Ver no GitHub
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Sem cartão. Sem limites de projeto no plano gratuito.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Tudo que você precisa, nada que você não usa
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Foco em cronograma visual + notificações inteligentes.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group rounded-xl border border-border/60 bg-card p-6 shadow-sm hover:shadow-md hover:border-foreground/20 transition-all"
              >
                <feature.icon className={`h-8 w-8 ${feature.color}`} />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-1">
            <div className="rounded-2xl bg-background p-12">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Pronto para nunca mais perder um prazo?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Crie seu primeiro cronograma em menos de 2 minutos.
              </p>
              <Button asChild size="lg" className="mt-8">
                <Link href="/auth/register">
                  Começar agora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>
            © {new Date().getFullYear()} {productName} — Built with ❤️ by Esly & Sarah
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="https://github.com/eslyers/chronos" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              GitHub
            </Link>
            <Link href="https://github.com/eslyers/chronos/blob/main/PROPOSTA.md" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              Documentação
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
