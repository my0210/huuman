import type { SupabaseClient } from '@supabase/supabase-js';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.8;
const BUCKET = 'chat-images';

/**
 * Resize and compress an image file to fit within MAX_DIMENSION px
 * on the longest edge, output as JPEG at 80% quality.
 * Keeps the original if it's already small enough and is JPEG.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.type === 'image/jpeg') {
    bitmap.close();
    return file;
  }

  const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height, 1);
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });
}

/**
 * Upload a compressed image blob to Supabase Storage and return its public URL.
 * Path: {userId}/{timestamp}-{random}.jpg
 */
export async function uploadChatImage(
  supabase: SupabaseClient,
  userId: string,
  blob: Blob,
  filename?: string,
): Promise<string> {
  const ext = 'jpg';
  const safeName = filename
    ? filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    : 'photo';
  const path = `${userId}/${Date.now()}-${safeName}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
