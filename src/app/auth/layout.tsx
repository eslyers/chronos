import Link from "next/link";
import { ArrowLeft, Clock, Calendar, KanbanSquare, ShieldCheck, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Coluna Principal da Esquerda (Formulário) */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative">
        <div className="absolute left-4 sm:left-8 top-8 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para a home
          </Link>
        </div>

        <div className="absolute right-4 sm:right-8 top-8">
          <ThemeToggle />
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {children}
        </div>
      </div>

      {/* Coluna da Direita (Banner Corporativo Visual) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
        {/* Pattern de Fundo & Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15)_1px,_transparent_1px)] bg-[size:28px_28px]"></div>
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl pointer-events-none" />

        <div className="relative w-full flex items-center justify-center p-12">
          <div className="space-y-8 max-w-lg text-white z-10">
            <div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl mb-6">
                <Clock className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-4xl font-extrabold leading-tight tracking-tight">
                Gestão de Prazos & Governança em Tempo Real
              </h3>
              <p className="mt-4 text-base text-white/80 leading-relaxed">
                CHRONOS une Gantt + Kanban + Notificações Inteligentes no Telegram para garantir visibilidade absoluta das suas entregas corporativas.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/30 text-white font-bold">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Timeline Gantt Integrada</p>
                  <p className="text-xs text-white/70">
                    Dependências FS, SS, FF, SF com detecção nativa de ciclos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/30 text-white font-bold">
                  <KanbanSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Kanban com WIP Limits</p>
                  <p className="text-xs text-white/70">
                    Controle de capacidade de equipe para eliminar gargalos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/30 text-white font-bold">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Alertas Executivos por E-mail</p>
                  <p className="text-xs text-white/70">
                    Relatórios diários e notificações de prazos na caixa corporativa.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs text-white/60 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Infraestrutura Segura • Autenticação JWT via Supabase</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
