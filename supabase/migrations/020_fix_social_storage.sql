-- 020_fix_social_storage.sql -- Make social media buckets public for getPublicUrl()

UPDATE storage.buckets SET public = true WHERE id IN ('voice-notes', 'social-photos');
