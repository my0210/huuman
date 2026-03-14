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
 * Extract the capture date from JPEG EXIF metadata (DateTimeOriginal or DateTime).
 * Returns YYYY-MM-DD or null if no EXIF date found.
 * Lightweight: reads raw bytes, no external library.
 */
export async function extractExifDate(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/jpeg') && !file.type.startsWith('image/jpg')) return null;
  try {
    const buf = await file.slice(0, 128 * 1024).arrayBuffer();
    const view = new DataView(buf);

    if (view.getUint16(0) !== 0xFFD8) return null;

    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) break;
      if ((marker & 0xFF00) !== 0xFF00) return null;
      offset += 2 + view.getUint16(offset + 2);
    }
    if (offset >= view.byteLength - 4) return null;

    const exifStart = offset + 4;
    const exifId = String.fromCharCode(
      view.getUint8(exifStart), view.getUint8(exifStart + 1),
      view.getUint8(exifStart + 2), view.getUint8(exifStart + 3),
    );
    if (exifId !== 'Exif') return null;

    const tiffStart = exifStart + 6;
    const le = view.getUint16(tiffStart) === 0x4949;
    const get16 = (o: number) => le ? view.getUint16(o, true) : view.getUint16(o);
    const get32 = (o: number) => le ? view.getUint32(o, true) : view.getUint32(o);

    const readIFD = (ifdOffset: number): string | null => {
      const abs = tiffStart + ifdOffset;
      if (abs + 2 > view.byteLength) return null;
      const count = get16(abs);
      for (let i = 0; i < count; i++) {
        const entry = abs + 2 + i * 12;
        if (entry + 12 > view.byteLength) break;
        const tag = get16(entry);
        // 0x9003 = DateTimeOriginal, 0x0132 = DateTime
        if (tag === 0x9003 || tag === 0x0132) {
          const valOffset = tiffStart + get32(entry + 8);
          if (valOffset + 19 > view.byteLength) continue;
          let str = '';
          for (let j = 0; j < 19; j++) str += String.fromCharCode(view.getUint8(valOffset + j));
          // Format: "2026:03:08 14:30:00" -> "2026-03-08"
          const match = str.match(/^(\d{4}):(\d{2}):(\d{2})/);
          if (match) return `${match[1]}-${match[2]}-${match[3]}`;
        }
        // 0x8769 = ExifIFDPointer -- recurse into sub-IFD
        if (tag === 0x8769) {
          const sub = readIFD(get32(entry + 8));
          if (sub) return sub;
        }
      }
      return null;
    };

    const firstIFDOffset = get32(tiffStart + 4);
    return readIFD(firstIFDOffset);
  } catch {
    return null;
  }
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

/**
 * Server-side fallback: convert a base64-encoded image to a Supabase Storage URL.
 * Used when legacy iOS clients send base64 data instead of uploading first.
 */
export async function uploadBase64ChatImage(
  supabase: SupabaseClient,
  userId: string,
  base64Data: string,
  mediaType: string = 'image/jpeg',
): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64');
  const blob = new Blob([buffer], { type: mediaType });
  return uploadChatImage(supabase, userId, blob);
}
