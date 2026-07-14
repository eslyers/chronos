"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Library, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createSPAClient } from "@/lib/supabase/client";

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
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

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
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/app/projects?from=${tpl.id}`}>
                    <Plus className="mr-2 h-4 w-4" />
                    Usar template
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
