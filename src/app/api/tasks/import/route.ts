// ─────────────────────────────────────────────────────────────
// CHRONOS API: POST /api/tasks/import
// Recebe multipart/form-data com arquivo (.xlsx, .xls, .ods, .csv)
// Faz parse via excel-parser.ts e cria tasks em bulk no Supabase
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { createSPAClient } from "@/lib/supabase/client";
import { parseImportFile, buildPreview } from "@/lib/excel-parser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("project_id") as string | null;
    const workspaceId = formData.get("workspace_id") as string | null;
    const stageIdOverride = (formData.get("stage_id") as string | null) || undefined;
    const dryRun = formData.get("dry_run") === "true";

    // ── Validação ──
    if (!file) {
      return NextResponse.json({ error: "Arquivo é obrigatório" }, { status: 400 });
    }
    if (!projectId || !workspaceId) {
      return NextResponse.json({ error: "project_id e workspace_id são obrigatórios" }, { status: 400 });
    }

    const allowedExtensions = ["xlsx", "xls", "ods", "csv"];
    const ext = file.name.toLowerCase().split(".").pop() || "";
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `Formato .${ext} não suportado. Use: ${allowedExtensions.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Parse ──
    const buffer = Buffer.from(await file.arrayBuffer());
    const parsed = await parseImportFile(buffer, file.name);
    const preview = buildPreview(parsed.rows, parsed.headers, file.name, parsed.sheetName);

    // ── Dry-run: só retorna o preview sem inserir ──
    if (dryRun) {
      return NextResponse.json({
        success: true,
        mode: "dry_run",
        preview,
      });
    }

    // ── Inserção real ──
    const supabase = createSPAClient() as unknown as ReturnType<typeof createSPAClient>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;

    // Verificar autenticação
    const { data: { user }, error: authError } = await sb.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Confirmar que o user é membro do workspace
    const { data: member } = await sb
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json(
        { error: "Você não é membro deste workspace" },
        { status: 403 }
      );
    }

    // Pegar stage inicial (primeiro stage do projeto, em ordem)
    let initialStageId = stageIdOverride;
    if (!initialStageId) {
      const { data: stages } = await sb
        .from("stages")
        .select("id, name, sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .limit(1);
      initialStageId = stages?.[0]?.id;
    }

    if (!initialStageId) {
      return NextResponse.json(
        { error: "Projeto não tem nenhum stage configurado. Crie um stage primeiro." },
        { status: 400 }
      );
    }

    // Pegar posição inicial
    const { count: existingCount } = await sb
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    let position = existingCount || 0;

    // ── Inserir tasks válidas ──
    const validRows = preview.rows.filter((r) => r.status !== "error");
    const created: { id: string; rowIndex: number; title: string }[] = [];
    const failed: { row: number; message: string }[] = [];

    for (const row of validRows) {
      const t = row.parsed;
      const insertPayload = {
        project_id: projectId,
        stage_id: initialStageId,
        title: t.title,
        description: t.description || null,
        priority: t.priority || "medium",
        status: t.status || "todo",
        progress: t.progress || 0,
        start_date: t.start_date || null,
        due_date: t.due_date || null,
        assignee_id: null, // por enquanto string livre — vira FK depois via invite
        position: position++,
      };

      const { data: created_task, error: insertError } = await sb
        .from("tasks")
        .insert(insertPayload)
        .select("id, title")
        .single();

      if (insertError) {
        failed.push({ row: row.index, message: insertError.message });
      } else {
        created.push({
          id: created_task.id,
          rowIndex: row.index,
          title: created_task.title,
        });
      }
    }

    return NextResponse.json({
      success: true,
      mode: "import",
      summary: {
        total: preview.totalRows,
        created: created.length,
        skipped: preview.errorRows,
        failed: failed.length,
      },
      created,
      failed,
      preview: {
        validRows: preview.validRows,
        warningRows: preview.warningRows,
        errorRows: preview.errorRows,
        mapping: preview.mapping,
      },
    });
  } catch (err) {
    console.error("[api/tasks/import] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
