"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Database,
  RotateCcw,
  Trash2,
  LogOut,
  Check,
  Camera,
  MessageSquarePlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/images";
import {
  LANGUAGES,
  getSavedLanguage,
  saveLanguage,
  getLanguageByCode,
  type LanguageCode,
} from "@/lib/languages";
import { t } from "@/lib/translations";
import { Drawer } from "./Drawer";

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
  userEmail: string;
  displayName?: string;
  avatarUrl?: string;
}

const FEEDBACK_EMAILS = ["yilmazym@gmail.com", "joshuaklint@gmail.com"];

export function ProfileSheet({
  open,
  onClose,
  userEmail,
  displayName: initialDisplayName,
  avatarUrl: initialAvatarUrl,
}: ProfileSheetProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(initialAvatarUrl);
  const [view, setView] = useState<"main" | "language">("main");
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>("en");
  const [busy, setBusy] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentLanguage(getSavedLanguage());
  }, []);

  useEffect(() => {
    if (open) {
      setDisplayName(initialDisplayName ?? "");
      setAvatarSrc(initialAvatarUrl);
      setView("main");
    }
  }, [open, initialDisplayName, initialAvatarUrl]);

  const patchProfile = useCallback(async (payload: Record<string, unknown>) => {
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch { /* silent */ }
  }, []);

  const handleNameBlur = () => {
    const trimmed = displayName.trim();
    if (trimmed !== (initialDisplayName ?? "")) {
      patchProfile({ displayName: trimmed || null });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const compressed = await compressImage(file);
      const path = `${user.id}/avatar.jpg`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { contentType: "image/jpeg", upsert: true });
      if (error) return;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarSrc(publicUrl);
      patchProfile({ avatarUrl: publicUrl });
    } catch { /* silent */ }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleRedoOnboarding = async () => {
    if (!confirm("Redo onboarding? This clears your profile baselines and sends you back through the flow.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dev/reset-onboarding", { method: "POST" });
      if (res.ok) { router.push("/onboarding"); router.refresh(); }
      else alert("Reset failed");
    } finally { setBusy(false); }
  };

  const handleResetEverything = async () => {
    if (!confirm("Reset everything? This deletes all data and restarts from scratch.")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dev/reset", { method: "POST" });
      if (res.ok) { router.push("/onboarding"); router.refresh(); }
      else alert("Reset failed");
    } finally { setBusy(false); }
  };

  const close = () => { onClose(); setView("main"); };
  const initial = (displayName || userEmail || "?").charAt(0).toUpperCase();

  const title = view === "language"
    ? t("settings.language", currentLanguage)
    : "Profile";

  const onBack = view === "language" ? () => setView("main") : undefined;

  return (
    <Drawer open={open} onClose={close} title={title} onBack={onBack}>
      {view === "language" ? (
        <div className="px-4 py-2">
          {LANGUAGES.map((lang) => {
            const isActive = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => {
                  if (lang.code === currentLanguage) return;
                  saveLanguage(lang.code);
                  window.location.reload();
                }}
                className={`w-full flex items-center justify-between rounded-radius-md px-4 py-2.5 text-left text-sm transition-colors ${
                  isActive ? "bg-semantic-info text-white" : "text-text-secondary active:bg-surface-raised"
                }`}
              >
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="font-medium truncate">{lang.native}</span>
                  <span className={`text-xs flex-none ${isActive ? "text-blue-100" : "text-text-muted"}`}>
                    {lang.region}
                  </span>
                </div>
                {isActive && <Check size={14} className="flex-none ml-2" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-4 py-3 space-y-1 pb-4">
          {/* Avatar + Name card */}
          <div className="rounded-radius-md bg-surface-raised p-4">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="relative flex-none">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
                    <span className="text-lg font-semibold text-text-secondary">{initial}</span>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated ring-2 ring-surface-base">
                  <Camera size={10} className="text-text-secondary" />
                </div>
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple={false} onChange={handleAvatarUpload} className="hidden" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-text-muted mb-1">Name</p>
                <input
                  ref={nameRef}
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={handleNameBlur}
                  placeholder="Your name"
                  className="w-full rounded-radius-sm bg-surface-overlay border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setView("language")}
            className="w-full flex items-center gap-3 rounded-radius-md px-3 py-3 text-left text-sm text-text-secondary active:bg-surface-raised transition-colors"
          >
            <Globe size={16} className="flex-none text-text-tertiary" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{t("settings.language", currentLanguage)}</p>
              <p className="text-xs text-text-muted">{getLanguageByCode(currentLanguage)?.native ?? "English"}</p>
            </div>
          </button>

          <button
            onClick={() => { close(); router.push("/data"); }}
            className="w-full flex items-center gap-3 rounded-radius-md px-3 py-3 text-left text-sm text-text-secondary active:bg-surface-raised transition-colors"
          >
            <Database size={16} className="flex-none text-text-tertiary" />
            <div>
              <p className="font-medium">{t("settings.data", currentLanguage)}</p>
              <p className="text-xs text-text-muted">{t("settings.dataDesc", currentLanguage)}</p>
            </div>
          </button>

          {userEmail && FEEDBACK_EMAILS.includes(userEmail) && (
            <button
              onClick={() => { close(); router.push("/feedback"); }}
              className="w-full flex items-center gap-3 rounded-radius-md px-3 py-3 text-left text-sm text-text-secondary active:bg-surface-raised transition-colors"
            >
              <MessageSquarePlus size={16} className="flex-none text-text-tertiary" />
              <div>
                <p className="font-medium">Feedback board</p>
                <p className="text-xs text-text-muted">View all user feedback</p>
              </div>
            </button>
          )}

          <div className="border-t border-border-subtle my-2" />

          <button
            onClick={handleRedoOnboarding}
            disabled={busy}
            className="w-full flex items-center gap-3 rounded-radius-md px-3 py-3 text-left text-sm text-text-secondary active:bg-surface-raised transition-colors disabled:opacity-40"
          >
            <RotateCcw size={16} className="flex-none text-text-tertiary" />
            <div>
              <p className="font-medium">{t("settings.redoOnboarding", currentLanguage)}</p>
              <p className="text-xs text-text-muted">{t("settings.redoOnboardingDesc", currentLanguage)}</p>
            </div>
          </button>

          <button
            onClick={handleResetEverything}
            disabled={busy}
            className="w-full flex items-center gap-3 rounded-radius-md px-3 py-3 text-left text-sm text-text-secondary active:bg-surface-raised transition-colors disabled:opacity-40"
          >
            <Trash2 size={16} className="flex-none text-text-tertiary" />
            <div>
              <p className="font-medium">{t("settings.reset", currentLanguage)}</p>
              <p className="text-xs text-text-muted">{t("settings.resetDesc", currentLanguage)}</p>
            </div>
          </button>

          <div className="border-t border-border-subtle my-2" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-radius-md px-3 py-3 text-left text-sm text-text-tertiary active:bg-surface-raised transition-colors"
          >
            <LogOut size={16} className="flex-none text-text-tertiary" />
            <p className="font-medium">{t("settings.signOut", currentLanguage)}</p>
          </button>
        </div>
      )}
    </Drawer>
  );
}
