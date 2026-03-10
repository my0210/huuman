"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Utensils, Pencil, Flame, Beef } from "lucide-react";
import { motion } from "framer-motion";
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

const MEAL_TYPE_COLORS: Record<string, string> = {
  breakfast: "text-amber-400",
  lunch: "text-green-400",
  dinner: "text-orange-400",
  snack: "text-sky-400",
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, ...fields } : p)));
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
  let mealIndex = 0;

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

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading ? (
          <div>
            {[0, 1].map((g) => (
              <div key={g}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="h-4 w-20 animate-pulse rounded-md bg-zinc-800/60" />
                  <div className="flex gap-2">
                    <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-800/40" />
                    <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-800/40" />
                  </div>
                </div>
                {[0, 1].map((i) => (
                  <div key={i} className="flex gap-3.5 px-4 py-3.5">
                    <div className="w-20 h-20 animate-pulse rounded-xl bg-zinc-800/60 flex-none" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3 w-14 animate-pulse rounded-md bg-zinc-800/40" />
                      <div className="h-3 w-full animate-pulse rounded-md bg-zinc-800/50" />
                      <div className="h-3 w-24 animate-pulse rounded-md bg-zinc-800/30" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500/10 mb-5">
              <Utensils size={28} className="text-green-400" />
            </div>
            <p className="text-base font-semibold text-zinc-200 mb-1.5">Log your meals</p>
            <p className="text-sm text-zinc-500 text-center mb-6">
              Snap a photo in chat or upload here
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-xl bg-zinc-100 px-6 py-2.5 text-sm font-medium text-zinc-900 active:scale-[0.97] transition-transform"
            >
              Upload meal
            </button>
          </div>
        ) : (
          <div>
            {days.map((day) => (
              <div key={day.date}>
                <div className="sticky top-0 z-10 flex items-center justify-between bg-zinc-950/95 backdrop-blur-sm px-4 py-3 border-b border-zinc-800/50">
                  <span className="text-sm font-semibold text-zinc-200">
                    {formatDayLabel(day.date)}
                  </span>
                  <div className="flex items-center gap-2">
                    {day.totalCalories > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-[11px] text-zinc-400">
                        <Flame size={10} className="text-orange-400" />
                        ~{day.totalCalories}
                      </span>
                    )}
                    {day.totalProtein > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-[11px] text-zinc-400">
                        <Beef size={10} className="text-sky-400" />
                        ~{day.totalProtein}g
                      </span>
                    )}
                  </div>
                </div>
                {day.photos.map((photo) => {
                  const i = mealIndex++;
                  return (
                    <motion.button
                      key={photo.id}
                      onClick={() => setSelectedId(photo.id)}
                      className="w-full flex gap-3.5 px-4 py-3.5 text-left hover:bg-zinc-900/50 active:bg-zinc-900 transition-colors"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.25 }}
                    >
                      <img
                        src={photo.imageUrl}
                        alt=""
                        className="w-20 h-20 rounded-xl object-cover flex-none"
                      />
                      <div className="flex-1 min-w-0 space-y-1 py-0.5">
                        {photo.mealType && (
                          <span
                            className={`text-[11px] font-semibold ${MEAL_TYPE_COLORS[photo.mealType] ?? "text-zinc-400"}`}
                          >
                            {capitalize(photo.mealType)}
                          </span>
                        )}
                        <p className="text-[13px] text-zinc-300 line-clamp-2 leading-snug">
                          {photo.description}
                        </p>
                        {(photo.estimatedCalories != null || photo.estimatedProteinG != null) && (
                          <p className="text-[11px] text-zinc-500">
                            {photo.estimatedCalories != null && `~${photo.estimatedCalories} cal`}
                            {photo.estimatedCalories != null &&
                              photo.estimatedProteinG != null &&
                              " · "}
                            {photo.estimatedProteinG != null &&
                              `~${photo.estimatedProteinG}g protein`}
                          </p>
                        )}
                      </div>
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
        onClose={() => {
          setSelectedId(null);
          setConfirmingId(null);
        }}
        title={selected ? mealTitle(selected) : ""}
        rightAction={
          selected ? (
            <DateEditOverlay
              date={selected.capturedAt}
              onChange={(d) => handleUpdate(selected.id, { capturedAt: d })}
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
                  alt="Meal photo"
                  className="w-full aspect-[4/3] object-cover"
                />
              </div>
            </div>

            <div className="px-4 py-4 space-y-4">
              {(selected.estimatedCalories != null || selected.estimatedProteinG != null) && (
                <div className="grid grid-cols-2 gap-3">
                  {selected.estimatedCalories != null && (
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800/60 p-3 text-center">
                      <p className="text-xl font-bold text-zinc-100">~{selected.estimatedCalories}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">cal</p>
                    </div>
                  )}
                  {selected.estimatedProteinG != null && (
                    <div className="rounded-xl bg-zinc-900 border border-zinc-800/60 p-3 text-center">
                      <p className="text-xl font-bold text-zinc-100">~{selected.estimatedProteinG}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">g protein</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                  Meal type
                </p>
                <div className="flex gap-2">
                  {MEAL_TYPES.map((mt) => (
                    <button
                      key={mt}
                      onClick={() => handleUpdate(selected.id, { mealType: mt })}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        mt === selected.mealType
                          ? "bg-green-900/40 text-green-400 border border-green-800"
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300"
                      }`}
                    >
                      {capitalize(mt)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Description
                </p>
                <p className="text-[13px] text-zinc-300 leading-relaxed">{selected.description}</p>
              </div>

              <div className="pt-3 border-t border-zinc-800/60">
                {confirmingId !== selected.id ? (
                  <button
                    onClick={() => setConfirmingId(selected.id)}
                    className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Delete meal</span>
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

      <Drawer open={showUpload} onClose={() => setShowUpload(false)} title="Upload meal photo">
        <MealUploadForm
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        <div className="rounded-2xl overflow-hidden">
          <img src={preview} alt="Preview" className="w-full aspect-[4/3] object-cover" />
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 py-12 flex flex-col items-center gap-2 hover:border-zinc-500 transition-colors"
        >
          <Utensils size={24} className="text-zinc-500" />
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

      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Meal type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              onClick={() => setMealType(mealType === mt ? "" : mt)}
              className={`rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                mealType === mt
                  ? "border-green-700 bg-green-900/30 text-green-400"
                  : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:text-zinc-400"
              }`}
            >
              {capitalize(mt)}
            </button>
          ))}
        </div>
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

function mealTitle(photo: MealPhoto): string {
  const mt = photo.mealType ? capitalize(photo.mealType) : "Meal";
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

function formatDayLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
