-- Add tracking_briefs JSONB column to weekly_plans
-- Stores personalized nutrition/sleep targets generated once per plan
ALTER TABLE weekly_plans
  ADD COLUMN IF NOT EXISTS tracking_briefs jsonb;
