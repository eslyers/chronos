import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-full lg:w-1/2 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background relative">
        <Link
          href="/"
          className="absolute left-4 sm:left-8 top-8 flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para home
        </Link>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {children}
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_white/10_1px,_transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="relative w-full flex items-center justify-center p-12">
          <div className="space-y-8 max-w-lg text-white">
            <div>
              <div className="text-6xl mb-4">🕐</div>
              <h3 className="text-4xl font-bold leading-tight">
                Cronograma visual para quem precisa avisar a hora.
              </h3>
              <p className="mt-4 text-lg text-white/80">
                CHRONOS une Gantt + Kanban + Notificações Telegram em um só lugar.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center text-xl">
                  📅
                </div>
                <div>
                  <p className="font-semibold">Timeline Gantt</p>
                  <p className="text-sm text-white/70">
                    Etapas em barras temporais com drag-and-drop
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center text-xl">
                  🎯
                </div>
                <div>
                  <p className="font-semibold">Kanban + WIP limits</p>
                  <p className="text-sm text-white/70">
                    Acompanhe o fluxo de execução em colunas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center text-xl">
                  🔔
                </div>
                <div>
                  <p className="font-semibold">Telegram nativo</p>
                  <p className="text-sm text-white/70">
                    Notificações de prazo direto no seu bolso
                  </p>
                </div>
              </div>
            </div>

            <blockquote className="text-white/90 italic border-l-4 border-white/30 pl-4">
              &ldquo;Finalmente um sistema que entende que cronograma é sobre
              avisar a hora, não sobre preencher formulário.&rdquo;
              <footer className="text-white/60 text-sm mt-2 not-italic">
                — Esly & Sarah
              </footer>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
