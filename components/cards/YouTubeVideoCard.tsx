"use client";

import { Play } from "lucide-react";

interface YouTubeVideo {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration: string | null;
  viewCount: string | null;
  url: string;
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const h = match[1] ? `${match[1]}:` : "";
  const m = match[2] ?? "0";
  const s = (match[3] ?? "0").padStart(2, "0");
  return h ? `${h}${m.padStart(2, "0")}:${s}` : `${m}:${s}`;
}

function formatViews(count: string): string {
  const n = parseInt(count, 10);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K views`;
  return `${n} views`;
}

export function YouTubeVideoCard({ data }: { data: Record<string, unknown> }) {
  const videos = (data.videos as YouTubeVideo[]) ?? [];

  if (data.error || videos.length === 0) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-muted">
        No videos found. Try a different search.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {videos.map((video) => (
        <a
          key={video.videoId}
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex gap-3 rounded-radius-lg border border-border-default bg-surface-raised p-3 active:border-border-strong active:bg-surface-overlay transition-colors group"
        >
          <div className="relative flex-none w-32 h-20 rounded-radius-sm overflow-hidden bg-surface-overlay">
            <img
              src={video.thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-active:opacity-100 transition-opacity">
              <Play size={24} className="text-white" fill="white" />
            </div>
            {video.duration && (
              <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                {formatDuration(video.duration)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary line-clamp-2 leading-snug">
              {video.title}
            </p>
            <p className="text-xs text-text-muted mt-1 truncate">{video.channel}</p>
            {video.viewCount && (
              <p className="text-xs text-text-muted mt-0.5">
                {formatViews(video.viewCount)}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
