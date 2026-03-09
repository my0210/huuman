"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

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

export function MealLogSection({
  photos,
  onDelete,
}: {
  photos: MealPhoto[];
  onDelete: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const expanded = expandedId ? photos.find((p) => p.id === expandedId) : null;

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    onDelete(id);
    setDeletingId(null);
    setConfirmingId(null);
    setExpandedId(null);
  };

  const days = groupByDate(photos);

  if (photos.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Meal Log
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">No meal photos yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Snap your meals in chat to start tracking.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Meal Log
      </h2>
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
                    <img
                      src={photo.imageUrl}
                      alt={photo.description}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="px-2 py-1.5 space-y-0.5">
                    {photo.mealType && (
                      <span className="block text-[9px] font-medium text-green-500">
                        {photo.mealType.charAt(0).toUpperCase() + photo.mealType.slice(1)}
                      </span>
                    )}
                    {photo.estimatedCalories != null && (
                      <span className="block text-[10px] text-zinc-500">
                        ~{photo.estimatedCalories} cal
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

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
                <span className="text-sm font-medium text-zinc-200">
                  {formatShortDate(expanded.capturedAt)}
                </span>
              </div>
              <button
                onClick={() => {
                  setExpandedId(null);
                  setConfirmingId(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <img
              src={expanded.imageUrl}
              alt="Meal photo"
              className="w-full object-contain max-h-[50vh]"
            />

            <div className="px-4 py-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Description
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {expanded.description}
                </p>
              </div>

              {(expanded.estimatedCalories != null || expanded.estimatedProteinG != null) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Estimates
                  </p>
                  <div className="flex gap-4">
                    {expanded.estimatedCalories != null && (
                      <p className="text-sm text-zinc-300">~{expanded.estimatedCalories} cal</p>
                    )}
                    {expanded.estimatedProteinG != null && (
                      <p className="text-sm text-zinc-300">~{expanded.estimatedProteinG}g protein</p>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800">
                {confirmingId !== expanded.id ? (
                  <button
                    onClick={() => setConfirmingId(expanded.id)}
                    className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Delete meal</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleDelete(expanded.id)}
                    disabled={deletingId === expanded.id}
                    className="rounded-lg bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50"
                  >
                    {deletingId === expanded.id ? "Deleting..." : "Confirm delete?"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
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
