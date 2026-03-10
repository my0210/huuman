"use client";

import { useState, useRef } from "react";
import { Trash2, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, uploadChatImage } from "@/lib/images";

export interface MealPhoto {
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

export function MealLogSection({
  photos,
  onDelete,
  onAdd,
}: {
  photos: MealPhoto[];
  onDelete: (id: string) => void;
  onAdd: (photo: MealPhoto) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const expanded = expandedId ? photos.find((p) => p.id === expandedId) : null;

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    onDelete(id);
    setDeletingId(null);
    setConfirmingId(null);
    setExpandedId(null);
  };

  const days = groupByDate(photos);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Meal Log
        </h2>
        <button
          onClick={() => setShowUpload(true)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">No meal photos yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Snap your meals in chat or tap + to upload.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.date} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-medium text-zinc-400">
                  {formatShortDate(day.date)}
                </h3>
                <span className="text-[10px] text-zinc-600">
                  ~{day.totalCalories} cal / ~{day.totalProtein}g protein
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {day.photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => setExpandedId(photo.id)}
                    className="relative flex-none w-24 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
                  >
                    <div className="aspect-square">
                      <img src={photo.imageUrl} alt={photo.description} className="h-full w-full object-cover" />
                    </div>
                    <div className="px-2 py-1.5 space-y-0.5">
                      {photo.mealType && (
                        <span className="block text-[9px] font-medium text-green-500">
                          {photo.mealType.charAt(0).toUpperCase() + photo.mealType.slice(1)}
                        </span>
                      )}
                      {photo.estimatedCalories != null && (
                        <span className="block text-[10px] text-zinc-500">~{photo.estimatedCalories} cal</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
              <div className="flex items-center gap-2">
                {expanded.mealType && (
                  <span className="rounded-full bg-green-900/30 px-2 py-0.5 text-[10px] font-medium text-green-500">
                    {expanded.mealType.charAt(0).toUpperCase() + expanded.mealType.slice(1)}
                  </span>
                )}
                <span className="text-sm font-medium text-zinc-200">{formatShortDate(expanded.capturedAt)}</span>
              </div>
              <button
                onClick={() => { setExpandedId(null); setConfirmingId(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <img src={expanded.imageUrl} alt="Meal photo" className="w-full object-contain max-h-[50vh]" />
            <div className="px-4 py-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Description</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{expanded.description}</p>
              </div>
              {(expanded.estimatedCalories != null || expanded.estimatedProteinG != null) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Estimates</p>
                  <div className="flex gap-4">
                    {expanded.estimatedCalories != null && <p className="text-sm text-zinc-300">~{expanded.estimatedCalories} cal</p>}
                    {expanded.estimatedProteinG != null && <p className="text-sm text-zinc-300">~{expanded.estimatedProteinG}g protein</p>}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800">
                {confirmingId !== expanded.id ? (
                  <button onClick={() => setConfirmingId(expanded.id)} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                    <Trash2 size={12} /><span>Delete meal</span>
                  </button>
                ) : (
                  <button onClick={() => handleDelete(expanded.id)} disabled={deletingId === expanded.id} className="rounded-lg bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50">
                    {deletingId === expanded.id ? "Deleting..." : "Confirm delete?"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpload && (
        <MealUploadSheet
          onClose={() => setShowUpload(false)}
          onUploaded={(photo) => { onAdd(photo); setShowUpload(false); }}
        />
      )}
    </section>
  );
}

function MealUploadSheet({ onClose, onUploaded }: { onClose: () => void; onUploaded: (photo: MealPhoto) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-200">Upload meal photo</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {preview ? (
          <img src={preview} alt="Preview" className="w-full max-h-48 object-contain rounded-xl" />
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border border-dashed border-zinc-700 bg-zinc-900 py-8 text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition-colors"
          >
            Tap to select photo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          />
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

        <button
          onClick={handleSave}
          disabled={!file || uploading}
          className="w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-30 transition-opacity"
        >
          {uploading ? "Uploading..." : "Save"}
        </button>
      </div>
    </div>
  );
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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
