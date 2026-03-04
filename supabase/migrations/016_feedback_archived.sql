alter table user_feedback drop constraint if exists user_feedback_status_check;
alter table user_feedback add constraint user_feedback_status_check
  check (status in ('new', 'in_progress', 'done', 'wont_fix', 'archived'));
