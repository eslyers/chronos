-- Adiciona a coluna track_time na tabela projects para permitir habilitar/desabilitar controle de horas por projeto
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS track_time BOOLEAN DEFAULT true NOT NULL;

COMMENT ON COLUMN public.projects.track_time IS 'Indica se o projeto possui controle de tempo e horas (estimadas e reais) ativo';
