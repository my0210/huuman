-- Allow logging sessions that are not part of a weekly plan (extra/unplanned activity).
ALTER TABLE public.planned_sessions
  ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE public.planned_sessions
  ADD COLUMN is_extra boolean NOT NULL DEFAULT false;
