"use client";

import { useState, useRef } from "react";
import { Trash2, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage, uploadChatImage } from "@/lib/images";

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
  onAdd,
}: {
  photos: ProgressPhoto[];
  onDelete: (id: string) => void;
  onAdd: (photo: ProgressPhoto) => void;
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

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Progress Photos
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
          <p className="text-sm text-zinc-500">No progress photos yet.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Send a selfie in chat or tap + to upload.
          </p>
        </div>
      ) : (
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
      )}

      {expanded && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3">
              <span className="text-sm font-medium text-zinc-200">
                {formatShortDate(expanded.capturedAt)}
              </span>
              <button
                onClick={() => { setExpandedId(null); setConfirmingId(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <img src={expanded.imageUrl} alt="Progress photo" className="w-full object-contain max-h-[50vh]" />
            <div className="px-4 py-4 space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Analysis</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{expanded.analysis}</p>
              </div>
              {expanded.notes && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Notes</p>
                  <p className="text-sm text-zinc-400">{expanded.notes}</p>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800">
                {confirmingId !== expanded.id ? (
                  <button onClick={() => setConfirmingId(expanded.id)} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                    <Trash2 size={12} /><span>Delete photo</span>
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
        <UploadSheet
          onClose={() => setShowUpload(false)}
          onUploaded={(photo) => { onAdd(photo); setShowUpload(false); }}
        />
      )}
    </section>
  );
}

function UploadSheet({ onClose, onUploaded }: { onClose: () => void; onUploaded: (photo: ProgressPhoto) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-zinc-200">Upload progress photo</h3>
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

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
