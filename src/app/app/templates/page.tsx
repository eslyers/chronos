"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Library, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Fitness: "bg-rose-500/10 text-rose-600",
  Produto: "bg-purple-500/10 text-purple-600",
  Engenharia: "bg-indigo-500/10 text-indigo-600",
  Agile: "bg-emerald-500/10 text-emerald-600",
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
        // Modo demo: cria projeto localStorage via DataContext
        // Redireciona pra /app/projects com sinal de clone
        router.push(`/app/projects?cloneFrom=${tpl.id}&name=${encodeURIComponent(tpl.name)}`);
        return;
      }

      // Modo produção: clona no Supabase real
      const result = await dataProvider.createProject({
        name: tpl.name,
        description: tpl.description ?? undefined,
        templateId: tpl.id,
      });

      if (!result) {
        throw new Error("Falha ao criar projeto a partir do template");
      }

      // Mostra sucesso por 800ms antes de redirecionar
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Comece em 1 clique com templates prontos
          </p>
        </div>
      </div>

      {errorMsg && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardContent className="py-4 text-sm text-red-600">
            ⚠️ {errorMsg}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Library className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold">Nenhum template ainda</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Os templates padrão são criados automaticamente no primeiro deploy (Sprint 1).
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="group hover:border-foreground/30 transition-all cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="text-4xl mb-2">{tpl.icon || "📋"}</div>
                  {tpl.category && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        CATEGORY_COLORS[tpl.category] || "bg-gray-500/10 text-gray-600"
                      }`}
                    >
                      {tpl.category}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg">{tpl.name}</CardTitle>
                {tpl.description && (
                  <CardDescription className="line-clamp-3">
                    {tpl.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-3">
                  {tpl.stages?.length || 0} etapas pré-configuradas
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleUseTemplate(tpl)}
                  disabled={cloningId !== null}
                >
                  {cloningId === tpl.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando projeto…
                    </>
                  ) : successId === tpl.id ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" />
                      Pronto!
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Usar template
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
