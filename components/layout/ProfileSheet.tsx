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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { compressImage } from "@/lib/images";
import { pickPhoto } from "@/lib/camera";
import { haptics } from "@/lib/haptics";
import {
  LANGUAGES,
  getSavedLanguage,
  saveLanguage,
  getLanguageByCode,
  type LanguageCode,
} from "@/lib/languages";
import { t } from "@/lib/translations";
import { Sheet } from "@/components/ui/Sheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

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
  const [avatarSrc, setAvatarSrc] = useState<string | undefined>(
    initialAvatarUrl,
  );
  const [view, setView] = useState<"main" | "language">("main");
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>("en");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    label: string;
    action: () => void;
  } | null>(null);

  const nameRef = useRef<HTMLInputElement>(null);

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

  const patchProfile = useCallback(
    async (payload: Record<string, unknown>) => {
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        /* silent */
      }
    },
    [],
  );

  const handleNameBlur = () => {
    const trimmed = displayName.trim();
    if (trimmed !== (initialDisplayName ?? "")) {
      patchProfile({ displayName: trimmed || null });
    }
  };

  const handleAvatarUpload = async () => {
    const result = await pickPhoto("prompt");
    if (!result) return;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const compressed = await compressImage(result.file);
      const path = `${user.id}/avatar.jpg`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { contentType: "image/jpeg", upsert: true });
      if (error) return;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarSrc(publicUrl);
      patchProfile({ avatarUrl: publicUrl });
    } catch {
      /* silent */
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleRedoOnboarding = () => {
    setConfirm({
      title: "Redo onboarding?",
      message:
        "This clears your profile baselines and sends you back through the flow.",
      label: "Redo",
      action: async () => {
        setBusy(true);
        setConfirm(null);
        try {
          const res = await fetch("/api/dev/reset-onboarding", {
            method: "POST",
          });
          if (res.ok) {
            router.push("/onboarding");
            router.refresh();
          } else {
            toast.error("Reset failed");
          }
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const handleResetEverything = () => {
    setConfirm({
      title: "Reset everything?",
      message: "This deletes all data and restarts from scratch.",
      label: "Reset",
      action: async () => {
        setBusy(true);
        setConfirm(null);
        try {
          const res = await fetch("/api/dev/reset", { method: "POST" });
          if (res.ok) {
            router.push("/onboarding");
            router.refresh();
          } else {
            toast.error("Reset failed");
          }
        } finally {
          setBusy(false);
        }
      },
    });
  };

  const close = () => {
    onClose();
    setView("main");
  };

  const initial = (displayName || userEmail || "?").charAt(0).toUpperCase();

  return (
    <>
      <Sheet open={open} onOpenChange={(val) => !val && close()}>
        <Sheet.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {view === "language" && (
                <button
                  onClick={() => setView("main")}
                  className="flex items-center text-text-secondary active:opacity-70 transition-opacity"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <span className="text-lg font-semibold text-text-primary truncate">
                {view === "language"
                  ? t("settings.language", currentLanguage)
                  : "Profile"}
              </span>
            </div>
          </div>
        </Sheet.Header>
        <Sheet.Body>
          {view === "language" ? (
            <div className="px-4 py-2">
              {LANGUAGES.map((lang) => {
                const isActive = currentLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      if (lang.code === currentLanguage) return;
                      haptics.light();
                      saveLanguage(lang.code);
                      router.refresh();
                      close();
                    }}
                    className={`w-full flex items-center justify-between rounded-radius-md px-4 min-h-[44px] text-left text-sm transition-colors duration-100 ${
                      isActive
                        ? "bg-semantic-info text-text-primary"
                        : "text-text-secondary active:bg-surface-raised"
                    }`}
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-medium truncate">
                        {lang.native}
                      </span>
                      <span
                        className={`text-xs flex-none ${isActive ? "text-text-secondary" : "text-text-muted"}`}
                      >
                        {lang.region}
                      </span>
                    </div>
                    {isActive && <Check size={14} className="flex-none ml-2" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-3 space-y-1">
              <div className="rounded-radius-md bg-surface-raised p-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAvatarUpload}
                    className="relative flex-none active:opacity-70 transition-opacity"
                  >
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="Avatar"
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
                        <span className="text-lg font-semibold text-text-secondary">
                          {initial}
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated ring-2 ring-surface-base">
                      <Camera size={10} className="text-text-secondary" />
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">
                      Name
                    </p>
                    <input
                      ref={nameRef}
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={handleNameBlur}
                      placeholder="Your name"
                      className="w-full min-h-[44px] rounded-radius-sm bg-surface-overlay border border-border-default px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <MenuRow
                icon={Globe}
                label={t("settings.language", currentLanguage)}
                detail={
                  getLanguageByCode(currentLanguage)?.native ?? "English"
                }
                onClick={() => setView("language")}
                chevron
              />

              <MenuRow
                icon={Database}
                label={t("settings.data", currentLanguage)}
                detail={t("settings.dataDesc", currentLanguage)}
                onClick={() => {
                  close();
                  router.push("/data");
                }}
                chevron
              />

              {userEmail && FEEDBACK_EMAILS.includes(userEmail) && (
                <MenuRow
                  icon={MessageSquarePlus}
                  label="Feedback board"
                  detail="View all user feedback"
                  onClick={() => {
                    close();
                    router.push("/feedback");
                  }}
                  chevron
                />
              )}

              <div className="border-t border-border-subtle my-2" />

              <MenuRow
                icon={RotateCcw}
                label={t("settings.redoOnboarding", currentLanguage)}
                detail={t("settings.redoOnboardingDesc", currentLanguage)}
                onClick={handleRedoOnboarding}
                disabled={busy}
              />

              <MenuRow
                icon={Trash2}
                label={t("settings.reset", currentLanguage)}
                detail={t("settings.resetDesc", currentLanguage)}
                onClick={handleResetEverything}
                disabled={busy}
              />

              <div className="border-t border-border-subtle my-2" />

              <MenuRow
                icon={LogOut}
                label={t("settings.signOut", currentLanguage)}
                onClick={handleLogout}
                muted
              />
            </div>
          )}
        </Sheet.Body>
      </Sheet>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title ?? ""}
        message={confirm?.message ?? ""}
        confirmLabel={confirm?.label ?? "Confirm"}
        destructive
        onConfirm={() => confirm?.action()}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function MenuRow({
  icon: Icon,
  label,
  detail,
  onClick,
  disabled,
  chevron,
  muted,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  detail?: string;
  onClick: () => void;
  disabled?: boolean;
  chevron?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={() => {
        haptics.light();
        onClick();
      }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 rounded-radius-md px-3 min-h-[44px] py-3 text-left text-sm active:bg-surface-raised transition-colors duration-100 disabled:opacity-40 ${
        muted ? "text-text-tertiary" : "text-text-secondary"
      }`}
    >
      <Icon size={16} className="flex-none text-text-tertiary" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        {detail && <p className="text-xs text-text-muted">{detail}</p>}
      </div>
      {chevron && (
        <ChevronRight size={16} className="flex-none text-text-muted" />
      )}
    </button>
  );
}
