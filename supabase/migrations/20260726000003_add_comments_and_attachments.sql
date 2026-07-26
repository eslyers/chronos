-- Migration 20260726000003: Add task_comments and task_attachments tables
-- CHRONOS Enterprise Task Communication & File Management

CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    file_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    file_url TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);

-- RLS Enablement
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Permissões permissivas para usuários autenticados
CREATE POLICY "Permitir leitura de comentarios para autenticados"
    ON public.task_comments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir inserção de comentarios para autenticados"
    ON public.task_comments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir exclusão de comentarios para autenticados"
    ON public.task_comments FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Permitir leitura de anexos para autenticados"
    ON public.task_attachments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir inserção de anexos para autenticados"
    ON public.task_attachments FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir exclusão de anexos para autenticados"
    ON public.task_attachments FOR DELETE
    TO authenticated
    USING (true);
