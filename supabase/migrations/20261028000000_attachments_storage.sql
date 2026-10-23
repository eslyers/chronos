-- ============================================================================
-- CHRONOS Migration: 20261028000000_attachments_storage.sql
-- Anexos passam a ficar no Supabase Storage (bucket privado) em vez de base64
-- dentro de task_attachments.file_url.
--   • caminho do arquivo: <task_id>/<uuid>-<nome>
--   • leitura por link assinado; acesso controlado pelas mesmas regras da
--     tabela (has_project_access do projeto da tarefa)
-- Linhas antigas com file_url (data URL) continuam funcionando.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Tabela
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.task_attachments ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.task_attachments ALTER COLUMN file_url DROP NOT NULL;

ALTER TABLE public.task_attachments DROP CONSTRAINT IF EXISTS chk_attachment_source;
ALTER TABLE public.task_attachments ADD CONSTRAINT chk_attachment_source
  CHECK (file_url IS NOT NULL OR storage_path IS NOT NULL);

-- O arquivo precisa estar na pasta da própria tarefa: impede que um anexo de
-- uma tarefa acessível aponte para o arquivo de outra tarefa
ALTER TABLE public.task_attachments DROP CONSTRAINT IF EXISTS chk_attachment_storage_path;
ALTER TABLE public.task_attachments ADD CONSTRAINT chk_attachment_storage_path
  CHECK (storage_path IS NULL OR storage_path LIKE task_id::text || '/%');

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Bucket e policies do Storage (só onde o Storage existe)
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'Storage indisponível neste ambiente; bucket não criado.';
    RETURN;
  END IF;

  EXECUTE $sql$
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('task-attachments', 'task-attachments', false, 10485760)
    ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760
  $sql$;

  EXECUTE 'DROP POLICY IF EXISTS "Task attachments: project members read" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Task attachments: project members upload" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Task attachments: uploader or admin delete" ON storage.objects';

  -- Primeira pasta do caminho = id da tarefa
  EXECUTE $sql$
    CREATE POLICY "Task attachments: project members read" ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'task-attachments'
        AND EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.id::text = (storage.foldername(name))[1]
            AND public.has_project_access(t.project_id, auth.uid())
        )
      )
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Task attachments: project members upload" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'task-attachments'
        AND EXISTS (
          SELECT 1 FROM public.tasks t
          WHERE t.id::text = (storage.foldername(name))[1]
            AND public.has_project_access(t.project_id, auth.uid())
        )
      )
  $sql$;

  EXECUTE $sql$
    CREATE POLICY "Task attachments: uploader or admin delete" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'task-attachments'
        AND (
          owner_id = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.tasks t
            JOIN public.projects p ON p.id = t.project_id
            WHERE t.id::text = (storage.foldername(name))[1]
              AND public.is_workspace_admin(p.workspace_id, auth.uid())
          )
        )
      )
  $sql$;
END $$;
