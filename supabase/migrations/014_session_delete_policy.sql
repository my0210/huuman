create policy "Users can delete own sessions"
  on public.planned_sessions for delete using (auth.uid() = user_id);
