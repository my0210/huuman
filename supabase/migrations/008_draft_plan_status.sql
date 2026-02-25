-- Allow 'draft' status for weekly_plans (interactive planning flow)
ALTER TABLE weekly_plans DROP CONSTRAINT IF EXISTS weekly_plans_status_check;
ALTER TABLE weekly_plans ADD CONSTRAINT weekly_plans_status_check
  CHECK (status IN ('draft', 'active', 'completed', 'archived'));
