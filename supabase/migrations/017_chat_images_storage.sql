-- Storage bucket for chat image uploads.
-- Images are compressed client-side (~1200px, JPEG 80%) before upload.
-- Bucket is public so URLs can be used directly in <img> tags and sent to Claude.

insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

-- Users can upload to their own folder: chat-images/{user_id}/*
create policy "Users can upload own chat images"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can read any chat image (public bucket, but belt-and-suspenders)
create policy "Anyone can read chat images"
  on storage.objects for select
  using (bucket_id = 'chat-images');
