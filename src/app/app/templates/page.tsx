"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Plus, Loader2, CheckCircle2, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSPAClient } from "@/lib/supabase/client";
import { dataProvider } from "@/lib/data/data-provider";
import { isSupabaseConfigured } from "@/lib/supabase/mode";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  is_public: boolean;
  stages: unknown[];
};

const CATEGORY_COLORS: Record<string, string> = {
  // Categorias originais
  Fitness:    "bg-rose-500/10 text-rose-500 border-rose-500/30",
  Produto:    "bg-purple-500/10 text-purple-500 border-purple-500/30",
  Engenharia: "bg-indigo-500/10 text-indigo-500 border-indigo-500/30",
  Agile:      "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  // Novas categorias corporativas
  RH:         "bg-violet-500/10 text-violet-500 border-violet-500/30",
  Governanca: "bg-red-500/10 text-red-500 border-red-500/30",
  Comercial:  "bg-green-500/10 text-green-500 border-green-500/30",
  TI:         "bg-blue-500/10 text-blue-500 border-blue-500/30",
  Estrategia: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  Eventos:    "bg-pink-500/10 text-pink-500 border-pink-500/30",
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createSPAClient();
      const { data } = await supabase
        .from("templates")
        .select("id, name, description, category, icon, is_public, stages")
        .eq("is_public", true)
        .order("name");
      if (data) setTemplates(data as Template[]);
      setLoading(false);
    }
    load();
  }, []);

  async function handleUseTemplate(tpl: Template) {
    setErrorMsg(null);
    setCloningId(tpl.id);
    setSuccessId(null);

    try {
      if (!isSupabaseConfigured()) {
        router.push(`/app/projects?cloneFrom=${tpl.id}&name=${encodeURIComponent(tpl.name)}`);
        return;
      }

      const result = await dataProvider.createProject({
        name: tpl.name,
        description: tpl.description ?? undefined,
        templateId: tpl.id,
      });

      if (!result) {
        throw new Error("Falha ao criar projeto a partir do template");
      }

      setSuccessId(tpl.id);
      await new Promise((r) => setTimeout(r, 800));

      router.refresh();
      router.push(`/app/projects/${result.project.id}`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Erro ao usar template"
      );
      setCloningId(null);
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      {/* Executive Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-blue-500/5 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs font-semibold">
                STARTKIT TEMPLATE LIBRARY
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
              <Library className="h-7 w-7 text-blue-500" />
              Galeria de Templates & Modelos
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Inicie novos projetos instantaneamente com 1 clique utilizando estruturas de etapas já prontas e otimizadas.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <Card className="border-red-500/40 bg-red-500/10 p-4">
          <p className="text-xs font-bold text-red-500">⚠️ {errorMsg}</p>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center h-80 space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 animate-pulse">
            <Library className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Carregando biblioteca de templates corporativos...
          </p>
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-2 p-8">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
              <Library className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Nenhum template disponível</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Os modelos corporativos estão sendo configurados e aparecerão nesta galeria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="border-border/80 bg-card hover:border-blue-500/40 hover:shadow-xl transition-all duration-200 group flex flex-col justify-between"
            >
              <CardHeader className="p-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="text-4xl p-3 rounded-2xl bg-blue-500/10 shadow-sm border border-blue-500/20">
                    {tpl.icon || "📋"}
                  </div>
                  {tpl.category && (
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold ${
                        CATEGORY_COLORS[tpl.category] || "bg-slate-500/10 text-slate-500 border-slate-500/30"
                      }`}
                    >
                      {tpl.category}
                    </Badge>
                  )}
                </div>

                <div>
                  <CardTitle className="text-xl font-bold group-hover:text-blue-500 transition-colors">
                    {tpl.name}
                  </CardTitle>
                  {tpl.description && (
                    <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">
                      {tpl.description}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6 pt-0 space-y-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono font-medium pt-2 border-t border-border/40">
                  <Layers className="h-3.5 w-3.5 text-blue-500" />
                  <span>{tpl.stages?.length || 0} etapas pré-configuradas</span>
                </div>

                <Button
                  className="w-full h-11 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                  onClick={() => handleUseTemplate(tpl)}
                  disabled={cloningId !== null}
                >
                  {cloningId === tpl.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Instanciando projeto…
                    </>
                  ) : successId === tpl.id ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-300" />
                      Projeto Criado!
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Usar Este Template
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
