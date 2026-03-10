"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import { Drawer } from "@/components/layout/Drawer";
import { createClient } from "@/lib/supabase/client";
import { compressImage, uploadChatImage, extractExifDate } from "@/lib/images";

interface ProgressPhoto {
  id: string;
  imageUrl: string;
  analysis: string;
  notes: string | null;
  capturedAt: string;
}

export default function ProgressPhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const selected = selectedId ? photos.find((p) => p.id === selectedId) : null;

  useEffect(() => {
    fetch("/api/progress-photos")
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/progress-photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      setSelectedId(null);
      setConfirmingId(null);
    }
  };

  const handleDateUpdate = async (id: string, newDate: string) => {
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, capturedAt: newDate } : p));
    await fetch("/api/progress-photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, capturedAt: newDate }),
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-zinc-950">
      <header className="flex-none border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/data")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-semibold text-zinc-100">Progress Photos</h1>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <Plus size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <p className="text-sm text-zinc-500">No progress photos yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Send a selfie in chat or tap + to upload.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelectedId(photo.id)}
                className="w-full text-left"
              >
                <img
                  src={photo.imageUrl}
                  alt={`Progress photo from ${photo.capturedAt}`}
                  className="w-full object-cover max-h-80"
                />
                <div className="px-4 py-3 space-y-1">
                  <p className="text-xs font-medium text-zinc-300">{formatShortDate(photo.capturedAt)}</p>
                  <p className="text-[11px] text-zinc-500 line-clamp-2">{photo.analysis}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => { setSelectedId(null); setConfirmingId(null); }}
        title={selected ? formatShortDate(selected.capturedAt) : ""}
        rightAction={selected ? <DateEditButton date={selected.capturedAt} onChange={(d) => handleDateUpdate(selected.id, d)} /> : undefined}
      >
        {selected && (
          <>
            <img src={selected.imageUrl} alt="Progress photo" className="w-full object-contain max-h-[50vh]" />
            <div className="px-4 py-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Analysis</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{selected.analysis}</p>
              </div>
              {selected.notes && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Notes</p>
                  <p className="text-sm text-zinc-400">{selected.notes}</p>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800">
                {confirmingId !== selected.id ? (
                  <button onClick={() => setConfirmingId(selected.id)} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                    <Trash2 size={12} /><span>Delete photo</span>
                  </button>
                ) : (
                  <button onClick={() => handleDelete(selected.id)} className="rounded-lg bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/60 transition-colors">
                    Confirm delete?
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </Drawer>

      {/* Upload drawer */}
      <Drawer open={showUpload} onClose={() => setShowUpload(false)} title="Upload progress photo">
        <UploadForm onUploaded={(photo) => { setPhotos((prev) => [photo, ...prev]); setShowUpload(false); }} />
      </Drawer>
    </div>
  );
}

function DateEditButton({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button onClick={() => ref.current?.showPicker()} className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
        <Pencil size={12} />
      </button>
      <input ref={ref} type="date" value={date} onChange={(e) => { if (e.target.value) onChange(e.target.value); }} className="sr-only" />
    </>
  );
}

function UploadForm({ onUploaded }: { onUploaded: (photo: ProgressPhoto) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    const exifDate = await extractExifDate(f);
    if (exifDate) setDate(exifDate);
  };

  const handleSave = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const compressed = await compressImage(file);
      const imageUrl = await uploadChatImage(supabase, user.id, compressed, file.name);
      const res = await fetch("/api/progress-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, capturedAt: date }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const { photo } = await res.json();
      onUploaded(photo);
    } catch {
      setUploading(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {preview ? (
        <img src={preview} alt="Preview" className="w-full max-h-48 object-contain rounded-xl" />
      ) : (
        <button onClick={() => fileRef.current?.click()} className="w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900 py-8 text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors">
          Tap to select photo
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none" />
      </div>
      <button onClick={handleSave} disabled={!file || uploading} className="w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-30 transition-opacity">
        {uploading ? "Uploading..." : "Save"}
      </button>
    </div>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
