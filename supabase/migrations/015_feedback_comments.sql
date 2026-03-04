create table if not exists feedback_comments (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references user_feedback(id) on delete cascade,
  author text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_feedback_comments_feedback on feedback_comments(feedback_id, created_at);
