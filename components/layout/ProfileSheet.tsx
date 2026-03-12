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
} from "lucide-react";
import {
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
} from "@ionic/react";
import { checkmark } from "ionicons/icons";
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
            <IonList inset>
              {LANGUAGES.map((lang) => {
                const isActive = currentLanguage === lang.code;
                return (
                  <IonItem
                    key={lang.code}
                    button
                    onClick={() => {
                      if (lang.code === currentLanguage) return;
                      haptics.light();
                      saveLanguage(lang.code);
                      router.refresh();
                      close();
                    }}
                  >
                    <IonLabel>
                      <h2 className="text-sm font-medium">{lang.native}</h2>
                      <p>{lang.region}</p>
                    </IonLabel>
                    {isActive && <IonIcon icon={checkmark} slot="end" style={{ color: "var(--color-semantic-info)" }} />}
                  </IonItem>
                );
              })}
            </IonList>
          ) : (
            <div className="py-2">
              <div className="mx-4 mb-3 rounded-radius-md bg-surface-raised p-4">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleAvatarUpload} className="relative flex-none active:opacity-70 transition-opacity">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="Avatar" className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated">
                        <span className="text-lg font-semibold text-text-secondary">{initial}</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated ring-2 ring-surface-overlay">
                      <Camera size={10} className="text-text-secondary" />
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-1">Name</p>
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

              <IonList inset>
                <IonItem button detail onClick={() => { haptics.light(); setView("language"); }}>
                  <Globe size={18} className="text-text-tertiary mr-3" />
                  <IonLabel>
                    <h2 className="text-sm font-medium">{t("settings.language", currentLanguage)}</h2>
                    <p>{getLanguageByCode(currentLanguage)?.native ?? "English"}</p>
                  </IonLabel>
                </IonItem>
                <IonItem button detail onClick={() => { haptics.light(); close(); router.push("/data"); }}>
                  <Database size={18} className="text-text-tertiary mr-3" />
                  <IonLabel>
                    <h2 className="text-sm font-medium">{t("settings.data", currentLanguage)}</h2>
                    <p>{t("settings.dataDesc", currentLanguage)}</p>
                  </IonLabel>
                </IonItem>
                {userEmail && FEEDBACK_EMAILS.includes(userEmail) && (
                  <IonItem button detail onClick={() => { haptics.light(); close(); router.push("/feedback"); }}>
                    <MessageSquarePlus size={18} className="text-text-tertiary mr-3" />
                    <IonLabel>
                      <h2 className="text-sm font-medium">Feedback board</h2>
                      <p>View all user feedback</p>
                    </IonLabel>
                  </IonItem>
                )}
              </IonList>

              <IonList inset>
                <IonItem button onClick={() => { haptics.light(); handleRedoOnboarding(); }} disabled={busy}>
                  <RotateCcw size={18} className="text-text-tertiary mr-3" />
                  <IonLabel>
                    <h2 className="text-sm font-medium">{t("settings.redoOnboarding", currentLanguage)}</h2>
                    <p>{t("settings.redoOnboardingDesc", currentLanguage)}</p>
                  </IonLabel>
                </IonItem>
                <IonItem button onClick={() => { haptics.light(); handleResetEverything(); }} disabled={busy}>
                  <Trash2 size={18} className="text-text-tertiary mr-3" />
                  <IonLabel>
                    <h2 className="text-sm font-medium">{t("settings.reset", currentLanguage)}</h2>
                    <p>{t("settings.resetDesc", currentLanguage)}</p>
                  </IonLabel>
                </IonItem>
              </IonList>

              <IonList inset>
                <IonItem button onClick={() => { haptics.light(); handleLogout(); }}>
                  <LogOut size={18} className="text-text-tertiary mr-3" />
                  <IonLabel className="text-text-tertiary">
                    <h2 className="text-sm font-medium">{t("settings.signOut", currentLanguage)}</h2>
                  </IonLabel>
                </IonItem>
              </IonList>
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

