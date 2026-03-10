"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Pencil } from "lucide-react";
import { Drawer } from "@/components/layout/Drawer";
import { createClient } from "@/lib/supabase/client";
import { compressImage, uploadChatImage, extractExifDate } from "@/lib/images";

interface MealPhoto {
  id: string;
  imageUrl: string;
  description: string;
  estimatedCalories: number | null;
  estimatedProteinG: number | null;
  mealType: string | null;
  capturedAt: string;
}

interface DayGroup {
  date: string;
  photos: MealPhoto[];
  totalCalories: number;
  totalProtein: number;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export default function MealLogPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<MealPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const selected = selectedId ? photos.find((p) => p.id === selectedId) : null;

  useEffect(() => {
    fetch("/api/meal-photos")
      .then((r) => r.json())
      .then((data) => setPhotos(data.photos ?? []))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/meal-photos", {
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

  const handleUpdate = async (id: string, fields: Partial<MealPhoto>) => {
    setPhotos((prev) => prev.map((p) => p.id === id ? { ...p, ...fields } : p));
    const body: Record<string, unknown> = { id };
    if (fields.capturedAt) body.capturedAt = fields.capturedAt;
    if (fields.mealType !== undefined) body.mealType = fields.mealType;
    await fetch("/api/meal-photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const days = groupByDate(photos);

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
          <h1 className="text-lg font-semibold text-zinc-100">Meal Log</h1>
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
            <p className="text-sm text-zinc-500">No meal photos yet.</p>
            <p className="text-xs text-zinc-600 mt-1">Snap your meals in chat or tap + to upload.</p>
          </div>
        ) : (
          <div>
            {days.map((day) => (
              <div key={day.date}>
                <div className="sticky top-0 z-10 flex items-center justify-between bg-zinc-950/95 backdrop-blur-sm px-4 py-2.5 border-b border-zinc-800/50">
                  <span className="text-xs font-medium text-zinc-400">{formatShortDate(day.date)}</span>
                  <span className="text-[10px] text-zinc-600">~{day.totalCalories} cal / ~{day.totalProtein}g protein</span>
                </div>
                {day.photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedId(photo.id)}
                    className="w-full flex gap-3 px-4 py-3 text-left border-b border-zinc-800/30 hover:bg-zinc-900/50 active:bg-zinc-900 transition-colors"
                  >
                    <img src={photo.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-none" />
                    <div className="flex-1 min-w-0 space-y-0.5 py-0.5">
                      {photo.mealType && (
                        <span className="text-[10px] font-medium text-green-500">
                          {photo.mealType.charAt(0).toUpperCase() + photo.mealType.slice(1)}
                        </span>
                      )}
                      <p className="text-xs text-zinc-300 line-clamp-2">{photo.description}</p>
                      {(photo.estimatedCalories != null || photo.estimatedProteinG != null) && (
                        <p className="text-[10px] text-zinc-500">
                          {photo.estimatedCalories != null && `~${photo.estimatedCalories} cal`}
                          {photo.estimatedCalories != null && photo.estimatedProteinG != null && " / "}
                          {photo.estimatedProteinG != null && `~${photo.estimatedProteinG}g protein`}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => { setSelectedId(null); setConfirmingId(null); }}
        title={selected ? mealTitle(selected) : ""}
        rightAction={selected ? <DateEditButton date={selected.capturedAt} onChange={(d) => handleUpdate(selected.id, { capturedAt: d })} /> : undefined}
      >
        {selected && (
          <>
            <img src={selected.imageUrl} alt="Meal photo" className="w-full object-contain max-h-[50vh]" />
            <div className="px-4 py-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">Meal type</p>
                <div className="flex gap-2">
                  {MEAL_TYPES.map((mt) => (
                    <button
                      key={mt}
                      onClick={() => handleUpdate(selected.id, { mealType: mt })}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        mt === selected.mealType
                          ? "bg-green-900/40 text-green-400 border border-green-800"
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300"
                      }`}
                    >
                      {mt.charAt(0).toUpperCase() + mt.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Description</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{selected.description}</p>
              </div>
              {(selected.estimatedCalories != null || selected.estimatedProteinG != null) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Estimates</p>
                  <div className="flex gap-4">
                    {selected.estimatedCalories != null && <p className="text-sm text-zinc-300">~{selected.estimatedCalories} cal</p>}
                    {selected.estimatedProteinG != null && <p className="text-sm text-zinc-300">~{selected.estimatedProteinG}g protein</p>}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800">
                {confirmingId !== selected.id ? (
                  <button onClick={() => setConfirmingId(selected.id)} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                    <Trash2 size={12} /><span>Delete meal</span>
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
      <Drawer open={showUpload} onClose={() => setShowUpload(false)} title="Upload meal photo">
        <MealUploadForm onUploaded={(photo) => { setPhotos((prev) => [photo, ...prev]); setShowUpload(false); }} />
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

function MealUploadForm({ onUploaded }: { onUploaded: (photo: MealPhoto) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<string>("");
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
      const res = await fetch("/api/meal-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, capturedAt: date, mealType: mealType || undefined }),
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
      <div className="space-y-1">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Meal type</label>
        <div className="flex gap-2">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              onClick={() => setMealType(mealType === mt ? "" : mt)}
              className={`flex-1 rounded-xl border py-2 text-xs font-medium transition-colors ${
                mealType === mt
                  ? "border-green-700 bg-green-900/30 text-green-400"
                  : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-400"
              }`}
            >
              {mt.charAt(0).toUpperCase() + mt.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleSave} disabled={!file || uploading} className="w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-30 transition-opacity">
        {uploading ? "Uploading..." : "Save"}
      </button>
    </div>
  );
}

function mealTitle(photo: MealPhoto): string {
  const mt = photo.mealType ? photo.mealType.charAt(0).toUpperCase() + photo.mealType.slice(1) : "Meal";
  return `${mt} · ${formatShortDate(photo.capturedAt)}`;
}

function groupByDate(photos: MealPhoto[]): DayGroup[] {
  const map = new Map<string, MealPhoto[]>();
  for (const p of photos) {
    const list = map.get(p.capturedAt) ?? [];
    list.push(p);
    map.set(p.capturedAt, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, dayPhotos]) => ({
      date,
      photos: dayPhotos,
      totalCalories: dayPhotos.reduce((s, p) => s + (p.estimatedCalories ?? 0), 0),
      totalProtein: dayPhotos.reduce((s, p) => s + (p.estimatedProteinG ?? 0), 0),
    }));
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
