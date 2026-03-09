"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  User,
  Globe,
  Database,
  MessageCircle,
  RotateCcw,
  Trash2,
  LogOut,
  X,
  ArrowLeft,
  Check,
  Copy,
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
  const [telegramLink, setTelegramLink] = useState<{
    code: string;
    botUrl: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

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
      setTelegramLink(null);
      setLinkCopied(false);
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
        /* silent – profile edits are best-effort */
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

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  const handleRedoOnboarding = async () => {
    if (
      !confirm(
        "Redo onboarding? This clears your profile baselines and sends you back through the flow.",
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/dev/reset-onboarding", { method: "POST" });
      if (res.ok) {
        router.push("/onboarding");
        router.refresh();
      } else {
        alert("Reset failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleResetEverything = async () => {
    if (
      !confirm(
        "Reset everything? This deletes all data (plan, chat, tracking, profile) and restarts from scratch.",
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch("/api/dev/reset", { method: "POST" });
      if (res.ok) {
        router.push("/onboarding");
        router.refresh();
      } else {
        alert("Reset failed");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConnectTelegram = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTelegramLink(data);
      } else {
        alert(data.error ?? "Failed to generate link");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = () => {
    if (telegramLink) {
      navigator.clipboard.writeText(telegramLink.botUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const close = () => {
    onClose();
    setView("main");
  };

  const initial = (displayName || userEmail || "?").charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />

          {/* Sheet */}
          <motion.div
            className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <div className="max-h-[85dvh] overflow-y-auto scrollbar-none p-5 pb-2 space-y-1">
              {view === "language" ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setView("main")}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <ArrowLeft size={14} />
                    </button>
                    <h2 className="text-sm font-semibold text-zinc-100">
                      {t("settings.language", currentLanguage)}
                    </h2>
                  </div>
                  <div className="max-h-[50dvh] overflow-y-auto -mx-2 scrollbar-none">
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
                          className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="font-medium truncate">
                              {lang.native}
                            </span>
                            <span
                              className={`text-xs flex-none ${isActive ? "text-blue-100" : "text-zinc-500"}`}
                            >
                              {lang.region}
                            </span>
                          </div>
                          {isActive && (
                            <Check size={14} className="flex-none ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-zinc-100">
                      Profile
                    </h2>
                    <button
                      onClick={close}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Avatar + Name card */}
                  <div className="rounded-xl bg-zinc-800/30 p-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="relative flex-none"
                      >
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt="Avatar"
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-700">
                            <span className="text-lg font-semibold text-zinc-200">
                              {initial}
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-600 ring-2 ring-zinc-900">
                          <Camera size={10} className="text-zinc-300" />
                        </div>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
                          Name
                        </p>
                        <input
                          ref={nameRef}
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          onBlur={handleNameBlur}
                          placeholder="Display name"
                          className="w-full rounded-lg bg-zinc-800/50 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 my-2" />

                  {/* Language */}
                  <button
                    onClick={() => setView("language")}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <Globe size={16} className="flex-none text-zinc-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {t("settings.language", currentLanguage)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {getLanguageByCode(currentLanguage)?.native ??
                          "English"}
                      </p>
                    </div>
                  </button>

                  {/* Your Data */}
                  <button
                    onClick={() => {
                      close();
                      router.push("/data");
                    }}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <Database size={16} className="flex-none text-zinc-500" />
                    <div>
                      <p className="font-medium">
                        {t("settings.data", currentLanguage)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {t("settings.dataDesc", currentLanguage)}
                      </p>
                    </div>
                  </button>

                  {/* Feedback board (restricted) */}
                  {userEmail && FEEDBACK_EMAILS.includes(userEmail) && (
                    <button
                      onClick={() => {
                        close();
                        router.push("/feedback");
                      }}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <MessageSquarePlus
                        size={16}
                        className="flex-none text-zinc-500"
                      />
                      <div>
                        <p className="font-medium">Feedback board</p>
                        <p className="text-xs text-zinc-500">
                          View all user feedback
                        </p>
                      </div>
                    </button>
                  )}

                  {/* Connect Telegram */}
                  <div className="border-t border-zinc-800 my-2" />

                  {!telegramLink ? (
                    <button
                      onClick={handleConnectTelegram}
                      disabled={busy}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                    >
                      <MessageCircle
                        size={16}
                        className="flex-none text-zinc-500"
                      />
                      <div>
                        <p className="font-medium">
                          {t("settings.connectTelegram", currentLanguage)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {t("settings.connectTelegramDesc", currentLanguage)}
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="rounded-xl px-3 py-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <MessageCircle
                          size={16}
                          className="flex-none text-cyan-400"
                        />
                        <p className="text-sm font-medium text-zinc-300">
                          {t("settings.connectTelegram", currentLanguage)}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500 ml-7">
                        Open this link in Telegram to connect:
                      </p>
                      <div className="ml-7 flex items-center gap-2">
                        <a
                          href={telegramLink.botUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-cyan-400 underline truncate flex-1"
                        >
                          {telegramLink.botUrl}
                        </a>
                        <button
                          onClick={handleCopyLink}
                          className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                          {linkCopied ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Danger zone */}
                  <div className="border-t border-zinc-800 my-2" />

                  <button
                    onClick={handleRedoOnboarding}
                    disabled={busy}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                  >
                    <RotateCcw
                      size={16}
                      className="flex-none text-zinc-500"
                    />
                    <div>
                      <p className="font-medium">
                        {t("settings.redoOnboarding", currentLanguage)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {t("settings.redoOnboardingDesc", currentLanguage)}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={handleResetEverything}
                    disabled={busy}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={16} className="flex-none text-zinc-500" />
                    <div>
                      <p className="font-medium">
                        {t("settings.reset", currentLanguage)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {t("settings.resetDesc", currentLanguage)}
                      </p>
                    </div>
                  </button>

                  {/* Sign out */}
                  <div className="border-t border-zinc-800 my-2" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
                  >
                    <LogOut size={16} className="flex-none text-zinc-500" />
                    <p className="font-medium">
                      {t("settings.signOut", currentLanguage)}
                    </p>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
