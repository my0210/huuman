"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";

export interface ProgressPhoto {
  id: string;
  imageUrl: string;
  analysis: string;
  notes: string | null;
  capturedAt: string;
}

export function ProgressPhotosSection({
  photos,
  onDelete,
}: {
  photos: ProgressPhoto[];
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

  if (photos.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Progress Photos
        </h2>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-6 text-center">
          <p className="text-sm text-zinc-500">No progress photos yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Send a selfie in chat and your coach will track it.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Progress Photos
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setExpandedId(photo.id)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
          >
            <img
              src={photo.imageUrl}
              alt={`Progress photo from ${photo.capturedAt}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
              <span className="text-[10px] text-zinc-300">
                {formatShortDate(photo.capturedAt)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
              <span className="text-sm font-medium text-zinc-200">
                {formatShortDate(expanded.capturedAt)}
              </span>
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
              alt="Progress photo"
              className="w-full object-contain max-h-[50vh]"
            />

            <div className="px-4 py-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                  Analysis
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {expanded.analysis}
                </p>
              </div>

              {expanded.notes && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-zinc-400">{expanded.notes}</p>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800">
                {confirmingId !== expanded.id ? (
                  <button
                    onClick={() => setConfirmingId(expanded.id)}
                    className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Delete photo</span>
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

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
