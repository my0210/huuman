"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Camera, Pencil } from "lucide-react";
import { motion } from "framer-motion";
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

interface MonthGroup {
  label: string;
  photos: ProgressPhoto[];
}

function groupByMonth(photos: ProgressPhoto[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  let current: MonthGroup | null = null;

  for (const photo of photos) {
    const d = new Date(photo.capturedAt + "T00:00:00");
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!current || current.label !== label) {
      current = { label, photos: [] };
      groups.push(current);
    }
    current.photos.push(photo);
  }

  return groups;
}

function formatPhotoDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const photoDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - photoDate.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProgressPhotosPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const selected = selectedId ? photos.find((p) => p.id === selectedId) : null;
  const selectedIndex = selected ? photos.indexOf(selected) : -1;

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
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, capturedAt: newDate } : p)));
    await fetch("/api/progress-photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, capturedAt: newDate }),
    });
  };

  const months = groupByMonth(photos);
  let photoIndex = 0;

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
          <h1 className="text-lg font-semibold text-zinc-100">
            Progress Photos
            {photos.length > 0 && (
              <span className="text-sm font-normal text-zinc-500 ml-2">{photos.length}</span>
            )}
          </h1>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <Plus size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading ? (
          <div className="px-4 pt-6">
            <div className="h-4 w-28 animate-pulse rounded-md bg-zinc-800/60 mb-4" />
            <div className="animate-pulse rounded-2xl bg-zinc-800/60 aspect-[3/4] mb-2" />
            <div className="h-3 w-16 animate-pulse rounded-md bg-zinc-800/40 mb-8" />
            <div className="animate-pulse rounded-2xl bg-zinc-800/60 aspect-[3/4] mb-2" />
            <div className="h-3 w-20 animate-pulse rounded-md bg-zinc-800/40" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 mb-5">
              <Camera size={28} className="text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-zinc-200 mb-1.5">Track your transformation</p>
            <p className="text-sm text-zinc-500 text-center mb-6">
              Send a selfie in chat or upload your first photo
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-xl bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 active:scale-[0.97] transition-transform"
            >
              Upload photo
            </button>
          </div>
        ) : (
          <div className="px-4 pb-8">
            {months.map((month, mi) => (
              <div key={month.label}>
                <p className={`text-sm font-semibold text-zinc-200 ${mi === 0 ? "pt-5" : "pt-8"} pb-4`}>
                  {month.label}
                </p>
                {month.photos.map((photo) => {
                  const i = photoIndex++;
                  return (
                    <motion.button
                      key={photo.id}
                      onClick={() => setSelectedId(photo.id)}
                      className="w-full text-left mb-6 last:mb-0"
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                    >
                      <div className="rounded-2xl overflow-hidden">
                        <img
                          src={photo.imageUrl}
                          alt={`Progress photo from ${photo.capturedAt}`}
                          className="w-full aspect-[3/4] object-cover"
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">{formatPhotoDate(photo.capturedAt)}</p>
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer
        open={!!selected}
        onClose={() => { setSelectedId(null); setConfirmingId(null); }}
        title={selected ? formatFullDate(selected.capturedAt) : ""}
        rightAction={
          selected ? (
            <DateEditOverlay
              date={selected.capturedAt}
              onChange={(d) => handleDateUpdate(selected.id, d)}
            />
          ) : undefined
        }
      >
        {selected && (
          <>
            <div className="px-4 pt-2">
              <div className="rounded-xl overflow-hidden">
                <img
                  src={selected.imageUrl}
                  alt="Progress photo"
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
            </div>
            <div className="px-4 py-4 space-y-3">
              {selectedIndex >= 0 && (
                <span className="inline-block rounded-full bg-emerald-900/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                  #{photos.length - selectedIndex}
                </span>
              )}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Analysis
                </p>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{selected.analysis}</p>
              </div>
              {selected.notes && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Notes
                  </p>
                  <p className="text-[13px] text-zinc-400 leading-relaxed">{selected.notes}</p>
                </div>
              )}
              <div className="pt-3 border-t border-zinc-800/60">
                {confirmingId !== selected.id ? (
                  <button
                    onClick={() => setConfirmingId(selected.id)}
                    className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Delete photo</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="rounded-lg bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/60 transition-colors"
                  >
                    Confirm delete?
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </Drawer>

      <Drawer open={showUpload} onClose={() => setShowUpload(false)} title="Upload progress photo">
        <UploadForm
          onUploaded={(photo) => {
            setPhotos((prev) => [photo, ...prev]);
            setShowUpload(false);
          }}
        />
      </Drawer>
    </div>
  );
}

function DateEditOverlay({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  return (
    <div className="relative flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
      <Pencil size={12} />
      <input
        type="date"
        value={date}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </div>
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        <div className="rounded-2xl overflow-hidden">
          <img src={preview} alt="Preview" className="w-full aspect-[3/4] object-cover" />
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 py-12 flex flex-col items-center gap-2 hover:border-zinc-500 transition-colors"
        >
          <Camera size={24} className="text-zinc-500" />
          <span className="text-sm text-zinc-500">Choose photo</span>
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none transition-colors"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!file || uploading}
        className="w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
      >
        {uploading && (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
        )}
        {uploading ? "Uploading..." : "Save"}
      </button>
    </div>
  );
}
