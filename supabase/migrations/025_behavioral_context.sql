-- Add 'behavioral' category for coach observations about user patterns
ALTER TABLE public.user_context
  DROP CONSTRAINT user_context_category_check,
  ADD CONSTRAINT user_context_category_check
    CHECK (category IN ('physical', 'environment', 'equipment', 'schedule', 'behavioral'));
