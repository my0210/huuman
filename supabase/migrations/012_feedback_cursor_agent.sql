alter table user_feedback
  add column if not exists agent_id text,
  add column if not exists agent_url text;
