"use client";

import { useState, useRef } from "react";
import { Trash2, Plus, Pencil } from "lucide-react";
import { Drawer } from "@/components/layout/Drawer";
import { createClient } from "@/lib/supabase/client";
import { compressImage, uploadChatImage, extractExifDate } from "@/lib/images";

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
  onUpdate,
}: {
  photos: ProgressPhoto[];
  onDelete: (id: string) => void;
  onAdd: (photo: ProgressPhoto) => void;
  onUpdate: (id: string, fields: Partial<ProgressPhoto>) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [timelineDetailId, setTimelineDetailId] = useState<string | null>(null);

  const expanded = expandedId ? photos.find((p) => p.id === expandedId) : null;
  const timelineDetail = timelineDetailId ? photos.find((p) => p.id === timelineDetailId) : null;

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    onDelete(id);
    setDeletingId(null);
    setConfirmingId(null);
    setExpandedId(null);
    setTimelineDetailId(null);
  };

  const dateEditButton = (photo: ProgressPhoto) => {
    const dateRef = { current: null as HTMLInputElement | null };
    return (
      <>
        <button
          onClick={() => dateRef.current?.showPicker()}
          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Pencil size={10} />
        </button>
        <input
          ref={(el) => { dateRef.current = el; }}
          type="date"
          value={photo.capturedAt}
          onChange={(e) => {
            if (e.target.value) {
              onUpdate(photo.id, { capturedAt: e.target.value });
              fetch("/api/progress-photos", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: photo.id, capturedAt: e.target.value }),
              });
            }
          }}
          className="sr-only"
        />
      </>
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Progress Photos
        </h2>
        <div className="flex items-center gap-2">
          {photos.length > 0 && (
            <button
              onClick={() => setShowTimeline(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              See all
            </button>
          )}
          <button
            onClick={() => setShowUpload(true)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
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
          {photos.slice(0, 6).map((photo) => (
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

      {/* Detail drawer */}
      <Drawer
        open={!!expanded}
        onClose={() => { setExpandedId(null); setConfirmingId(null); }}
        title={expanded ? formatShortDate(expanded.capturedAt) : ""}
        rightAction={expanded ? dateEditButton(expanded) : undefined}
      >
        {expanded && (
          <PhotoDetail
            photo={expanded}
            confirmingId={confirmingId}
            deletingId={deletingId}
            onRequestDelete={() => setConfirmingId(expanded.id)}
            onConfirmDelete={() => handleDelete(expanded.id)}
          />
        )}
      </Drawer>

      {/* Timeline drawer */}
      <Drawer
        open={showTimeline && !timelineDetail}
        onClose={() => setShowTimeline(false)}
        title="Progress Photos"
      >
        <div className="divide-y divide-zinc-800/50">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setTimelineDetailId(photo.id)}
              className="w-full text-left"
            >
              <img src={photo.imageUrl} alt="" className="w-full object-cover max-h-80" />
              <div className="px-4 py-3 space-y-1">
                <p className="text-xs font-medium text-zinc-300">{formatShortDate(photo.capturedAt)}</p>
                <p className="text-[11px] text-zinc-500 line-clamp-2">{photo.analysis}</p>
              </div>
            </button>
          ))}
        </div>
      </Drawer>

      {/* Timeline -> detail drill-in */}
      <Drawer
        open={!!timelineDetail}
        onClose={() => setTimelineDetailId(null)}
        onBack={() => setTimelineDetailId(null)}
        title={timelineDetail ? formatShortDate(timelineDetail.capturedAt) : ""}
        rightAction={timelineDetail ? dateEditButton(timelineDetail) : undefined}
      >
        {timelineDetail && (
          <PhotoDetail
            photo={timelineDetail}
            confirmingId={confirmingId}
            deletingId={deletingId}
            onRequestDelete={() => setConfirmingId(timelineDetail.id)}
            onConfirmDelete={() => handleDelete(timelineDetail.id)}
          />
        )}
      </Drawer>

      {/* Upload drawer */}
      <Drawer open={showUpload} onClose={() => setShowUpload(false)} title="Upload progress photo">
        <UploadForm onClose={() => setShowUpload(false)} onUploaded={(photo) => { onAdd(photo); setShowUpload(false); }} />
      </Drawer>
    </section>
  );
}

function PhotoDetail({
  photo,
  confirmingId,
  deletingId,
  onRequestDelete,
  onConfirmDelete,
}: {
  photo: ProgressPhoto;
  confirmingId: string | null;
  deletingId: string | null;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <>
      <img src={photo.imageUrl} alt="Progress photo" className="w-full object-contain max-h-[50vh]" />
      <div className="px-4 py-4 space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Analysis</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{photo.analysis}</p>
        </div>
        {photo.notes && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">Notes</p>
            <p className="text-sm text-zinc-400">{photo.notes}</p>
          </div>
        )}
        <div className="pt-2 border-t border-zinc-800">
          {confirmingId !== photo.id ? (
            <button onClick={onRequestDelete} className="flex items-center gap-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              <Trash2 size={12} /><span>Delete photo</span>
            </button>
          ) : (
            <button onClick={onConfirmDelete} disabled={deletingId === photo.id} className="rounded-lg bg-red-900/40 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/60 transition-colors disabled:opacity-50">
              {deletingId === photo.id ? "Deleting..." : "Confirm delete?"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function UploadForm({ onClose, onUploaded }: { onClose: () => void; onUploaded: (photo: ProgressPhoto) => void }) {
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
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
