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
  Share2,
  MessageSquarePlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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
  username?: string;
  sharingEnabled?: boolean;
}

const FEEDBACK_EMAILS = ["yilmazym@gmail.com", "joshuaklint@gmail.com"];

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function ProfileSheet({
  open,
  onClose,
  userEmail,
  displayName: initialDisplayName,
  username: initialUsername,
  sharingEnabled: initialSharing,
}: ProfileSheetProps) {
  const router = useRouter();

  // Profile fields
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [username, setUsername] = useState(initialUsername ?? "");
  const [sharing, setSharing] = useState(initialSharing ?? true);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Settings state
  const [view, setView] = useState<"main" | "language">("main");
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>("en");
  const [busy, setBusy] = useState(false);
  const [telegramLink, setTelegramLink] = useState<{
    code: string;
    botUrl: string;
  } | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentLanguage(getSavedLanguage());
  }, []);

  useEffect(() => {
    if (open) {
      setDisplayName(initialDisplayName ?? "");
      setUsername(initialUsername ?? "");
      setSharing(initialSharing ?? true);
      setUsernameError(null);
      setView("main");
      setTelegramLink(null);
      setLinkCopied(false);
    }
  }, [open, initialDisplayName, initialUsername, initialSharing]);

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

  const handleUsernameBlur = () => {
    const trimmed = username.trim().toLowerCase();
    setUsername(trimmed);

    if (trimmed === "") {
      setUsernameError(null);
      if (initialUsername) patchProfile({ username: null });
      return;
    }

    if (!USERNAME_RE.test(trimmed)) {
      setUsernameError("3-20 characters, letters, numbers, underscore only");
      return;
    }

    setUsernameError(null);
    if (trimmed !== (initialUsername ?? "")) {
      patchProfile({ username: trimmed });
    }
  };

  const handleSharingToggle = () => {
    const next = !sharing;
    setSharing(next);
    patchProfile({ sharingEnabled: next });
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
            <div className="max-h-[85dvh] overflow-y-auto scrollbar-none p-5 space-y-1">
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

                  {/* Avatar + profile fields */}
                  <div className="flex flex-col items-center gap-3 pb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-700">
                      <span className="text-lg font-semibold text-zinc-200">
                        {initial}
                      </span>
                    </div>

                    <input
                      ref={nameRef}
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      onBlur={handleNameBlur}
                      placeholder="Display name"
                      className="w-full max-w-[220px] text-center text-sm font-medium text-zinc-100 bg-transparent border-b border-zinc-700 focus:border-zinc-400 outline-none py-1 placeholder:text-zinc-600 transition-colors"
                    />

                    <div className="w-full max-w-[220px]">
                      <div className="flex items-center justify-center">
                        <span className="text-sm text-zinc-500">@</span>
                        <input
                          ref={usernameRef}
                          type="text"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            setUsernameError(null);
                          }}
                          onBlur={handleUsernameBlur}
                          placeholder="username"
                          className="text-center text-sm text-zinc-300 bg-transparent border-b border-zinc-700 focus:border-zinc-400 outline-none py-1 placeholder:text-zinc-600 transition-colors"
                        />
                      </div>
                      {usernameError && (
                        <p className="text-xs text-red-400 text-center mt-1">
                          {usernameError}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sharing toggle */}
                  <button
                    onClick={handleSharingToggle}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <Share2 size={16} className="flex-none text-zinc-500" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">Sharing</p>
                      <p className="text-xs text-zinc-500">
                        Let friends see your activity
                      </p>
                    </div>
                    <div
                      className={`relative h-5 w-9 rounded-full transition-colors ${sharing ? "bg-blue-600" : "bg-zinc-700"}`}
                    >
                      <div
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${sharing ? "translate-x-4" : "translate-x-0.5"}`}
                      />
                    </div>
                  </button>

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
