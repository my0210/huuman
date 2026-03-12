"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IonPage, IonContent } from "@ionic/react";
import { Plus, Trash2, Utensils, Pencil, Flame, Beef } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { NavHeader } from "@/components/ui/NavHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { haptics } from "@/lib/haptics";
import { createClient } from "@/lib/supabase/client";
import { compressImage, uploadChatImage, extractExifDate } from "@/lib/images";
import { pickPhoto } from "@/lib/camera";

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
    haptics.light();
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
    haptics.light();
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
    <IonPage>
      <NavHeader
        title="Meal Log"
        onBack={() => router.push("/data")}
        rightAction={
          <IconButton label="Add meal" size="sm" onClick={() => setShowUpload(true)}>
            <Plus size={16} />
          </IconButton>
        }
      />

      <IonContent>
        {loading ? (
          <div>
            {[0, 1].map((g) => (
              <div key={g}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <Skeleton className="h-4 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
                {[0, 1].map((i) => (
                  <div key={i} className="flex gap-3.5 px-4 py-3.5">
                    <Skeleton className="w-20 h-20 rounded-xl flex-none" />
                    <div className="flex-1 space-y-2 py-1">
                      <Skeleton className="h-3 w-14" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-domain-nutrition-muted mb-5">
              <Utensils size={28} className="text-domain-nutrition" />
            </div>
            <p className="text-base font-semibold text-text-primary mb-1.5">Log your meals</p>
            <p className="text-sm text-text-tertiary text-center mb-6">
              Snap a photo in chat or upload here
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="rounded-xl bg-white px-6 min-h-[44px] text-sm font-medium text-surface-base active:scale-[0.97] transition-[transform] duration-100"
            >
              Upload meal
            </button>
          </div>
        ) : (
          <div>
            {days.map((day) => (
              <div key={day.date}>
                <div className="sticky top-0 z-10 flex items-center justify-between bg-surface-base/95 backdrop-blur-sm px-4 py-3 border-b border-border-subtle">
                  <span className="text-sm font-semibold text-text-primary">
                    {formatDayLabel(day.date)}
                  </span>
                  <div className="flex items-center gap-2">
                    {day.totalCalories > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs text-text-secondary">
                        <Flame size={10} className="text-orange-400" />
                        ~{day.totalCalories}
                      </span>
                    )}
                    {day.totalProtein > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2.5 py-0.5 text-xs text-text-secondary">
                        <Beef size={10} className="text-sky-400" />
                        ~{day.totalProtein}g
                      </span>
                    )}
                  </div>
                </div>
                {day.photos.map((photo) => {
                  const i = mealIndex++;
                  return (
                    <button
                      key={photo.id}
                      onClick={() => {
                        haptics.light();
                        setSelectedId(photo.id);
                      }}
                      className="w-full flex gap-3.5 px-4 py-3.5 text-left min-h-[44px] active:bg-surface-raised active:scale-[0.99] transition-[transform,background-color] duration-100"
                      style={{
                        opacity: 0,
                        animation: "fadeIn 250ms ease-out forwards",
                        animationDelay: `${i * 40}ms`,
                      }}
                    >
                      <img
                        src={photo.imageUrl}
                        alt=""
                        className="w-20 h-20 rounded-xl object-cover flex-none"
                      />
                      <div className="flex-1 min-w-0 space-y-1 py-0.5">
                        {photo.mealType && (
                          <span
                            className={`text-xs font-semibold ${MEAL_TYPE_COLORS[photo.mealType] ?? "text-text-secondary"}`}
                          >
                            {capitalize(photo.mealType)}
                          </span>
                        )}
                        <p className="text-sm text-text-secondary line-clamp-2 leading-snug">
                          {photo.description}
                        </p>
                        {(photo.estimatedCalories != null || photo.estimatedProteinG != null) && (
                          <p className="text-xs text-text-tertiary">
                            {photo.estimatedCalories != null && `~${photo.estimatedCalories} cal`}
                            {photo.estimatedCalories != null &&
                              photo.estimatedProteinG != null &&
                              " · "}
                            {photo.estimatedProteinG != null &&
                              `~${photo.estimatedProteinG}g protein`}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </IonContent>

      <Sheet
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) {
            setSelectedId(null);
            setConfirmingId(null);
          }
        }}
      >
        <Sheet.Header
          title={
            selected ? (
              <MealTitleWithEdit
                photo={selected}
                onChange={(d) => handleUpdate(selected.id, { capturedAt: d })}
              />
            ) : undefined
          }
        />
        <Sheet.Body>
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
                      <div className="rounded-xl bg-surface-raised border border-border-subtle p-3 text-center">
                        <p className="text-xl font-bold text-text-primary">~{selected.estimatedCalories}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">cal</p>
                      </div>
                    )}
                    {selected.estimatedProteinG != null && (
                      <div className="rounded-xl bg-surface-raised border border-border-subtle p-3 text-center">
                        <p className="text-xl font-bold text-text-primary">~{selected.estimatedProteinG}</p>
                        <p className="text-xs text-text-tertiary mt-0.5">g protein</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                    Meal type
                  </p>
                  <div className="flex gap-2">
                    {MEAL_TYPES.map((mt) => (
                      <button
                        key={mt}
                        onClick={() => handleUpdate(selected.id, { mealType: mt })}
                        className={`rounded-full px-3.5 min-h-[44px] text-xs font-medium active:scale-[0.97] transition-all duration-100 ${
                          mt === selected.mealType
                            ? "bg-domain-nutrition-muted text-domain-nutrition border border-border-default"
                            : "bg-surface-raised text-text-tertiary border border-border-default active:text-text-secondary"
                        }`}
                      >
                        {capitalize(mt)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
                    Description
                  </p>
                  <p className="text-sm text-text-secondary leading-relaxed">{selected.description}</p>
                </div>

                <div className="pt-3 border-t border-border-subtle">
                  {confirmingId !== selected.id ? (
                    <button
                      onClick={() => setConfirmingId(selected.id)}
                      className="flex items-center gap-2 text-xs text-text-muted min-h-[44px] active:text-text-secondary active:scale-[0.97] transition-all duration-100"
                    >
                      <Trash2 size={12} />
                      <span>Delete meal</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(selected.id)}
                      className="rounded-lg bg-semantic-error/10 px-3 min-h-[44px] text-xs font-medium text-semantic-error active:bg-semantic-error/20 active:scale-[0.97] transition-all duration-100"
                    >
                      Confirm delete?
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </Sheet.Body>
      </Sheet>

      <Sheet open={showUpload} onOpenChange={(v) => { if (!v) setShowUpload(false); }}>
        <Sheet.Header title="Upload meal photo" />
        <Sheet.Body>
          <MealUploadForm
            onUploaded={(photo) => {
              setPhotos((prev) => [photo, ...prev]);
              setShowUpload(false);
            }}
          />
        </Sheet.Body>
      </Sheet>
    </IonPage>
  );
}

function MealTitleWithEdit({
  photo,
  onChange,
}: {
  photo: MealPhoto;
  onChange: (d: string) => void;
}) {
  const mt = photo.mealType ? capitalize(photo.mealType) : "Meal";
  return (
    <div className="relative inline-flex items-center gap-1.5 cursor-pointer">
      <span>{mt} · {formatShortDate(photo.capturedAt)}</span>
      <Pencil size={11} className="text-text-muted" />
      <input
        type="date"
        value={photo.capturedAt}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </div>
  );
}

function MealUploadForm({ onUploaded }: { onUploaded: (photo: MealPhoto) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handlePickPhoto = async () => {
    haptics.light();
    const result = await pickPhoto("prompt");
    if (!result) return;
    setFile(result.file);
    setPreview(result.previewUrl);
    const exifDate = await extractExifDate(result.file);
    if (exifDate) setDate(exifDate);
  };

  const handleSave = async () => {
    if (!file) return;
    haptics.light();
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
          onClick={handlePickPhoto}
          className="w-full rounded-2xl border border-dashed border-border-default bg-surface-raised/50 py-12 flex flex-col items-center gap-2 min-h-[44px] active:border-border-strong active:scale-[0.99] transition-all duration-100"
        >
          <Utensils size={24} className="text-text-tertiary" />
          <span className="text-sm text-text-tertiary">Choose photo</span>
        </button>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-xl border border-border-default bg-surface-raised px-4 py-2.5 text-sm text-text-primary focus:border-border-strong focus:outline-none transition-colors"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Meal type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MEAL_TYPES.map((mt) => (
            <button
              key={mt}
              onClick={() => {
                haptics.light();
                setMealType(mealType === mt ? "" : mt);
              }}
              className={`rounded-xl border py-2.5 text-sm font-medium min-h-[44px] active:scale-[0.97] transition-all duration-100 ${
                mealType === mt
                  ? "border-border-default bg-domain-nutrition-muted text-domain-nutrition"
                  : "border-border-default bg-surface-raised text-text-tertiary active:text-text-secondary"
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
        className="w-full rounded-xl bg-white min-h-[44px] text-sm font-medium text-surface-base disabled:opacity-30 active:scale-[0.97] transition-all duration-100 flex items-center justify-center gap-2"
      >
        {uploading && (
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-text-secondary border-t-surface-base" />
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
