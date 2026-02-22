-- Modernize messages table to use parts-based schema (matches Vercel AI SDK UIMessage format)
ALTER TABLE public.messages DROP COLUMN IF EXISTS content;
ALTER TABLE public.messages DROP COLUMN IF EXISTS tool_calls;
ALTER TABLE public.messages DROP COLUMN IF EXISTS tool_results;

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS parts jsonb NOT NULL DEFAULT '[]';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]';
