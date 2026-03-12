"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { LANGUAGES, saveLanguage, type LanguageCode } from "@/lib/languages";
import { t } from "@/lib/translations";
import { haptics } from "@/lib/haptics";

interface LanguageSelectorProps {
  onSelect: (languageCode: string) => void;
}

export default function LanguageSelector({ onSelect }: LanguageSelectorProps) {
  const [selected, setSelected] = useState<LanguageCode>("en");
  const listRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [showTopFade, setShowTopFade] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(true);

  const updateFades = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setShowTopFade(el.scrollTop > 8);
    setShowBottomFade(el.scrollTop < el.scrollHeight - el.clientHeight - 8);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateFades, { passive: true });
    updateFades();
    return () => el.removeEventListener("scroll", updateFades);
  }, [updateFades]);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }, []);

  const handleConfirm = () => {
    haptics.medium();
    saveLanguage(selected);
    onSelect(selected);
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-base px-4 py-8 animate-[fadeIn_400ms_ease-out]">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-1 animate-[fadeIn_500ms_ease-out_150ms_both]">
          <div className="mb-2 h-10 w-10 rounded-radius-md bg-white flex items-center justify-center">
            <span className="text-lg font-bold text-black">h</span>
          </div>
        </div>

        <div className="relative w-full animate-[scaleIn_500ms_ease-out_250ms_both]">
          {showTopFade && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 rounded-t-radius-lg bg-gradient-to-b from-surface-raised to-transparent" />
          )}

          <div
            ref={listRef}
            className="max-h-[60dvh] overflow-y-auto rounded-radius-lg border border-border-default bg-surface-raised scrollbar-none"
          >
            <div className="py-1">
              {LANGUAGES.map((lang) => {
                const isSelected = selected === lang.code;
                return (
                  <button
                    key={lang.code}
                    ref={isSelected ? selectedRef : undefined}
                    onClick={() => {
                      haptics.light();
                      setSelected(lang.code);
                    }}
                    className={`w-full px-5 min-h-[44px] py-3 text-left transition-colors duration-100 ${
                      isSelected
                        ? "bg-semantic-info"
                        : "active:bg-surface-overlay"
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className={`text-base font-medium ${
                          isSelected
                            ? "text-text-primary"
                            : "text-text-primary"
                        }`}
                      >
                        {lang.native}
                      </span>
                      <span
                        className={`text-sm ${
                          isSelected
                            ? "text-text-secondary"
                            : "text-text-muted"
                        }`}
                      >
                        {lang.region}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {showBottomFade && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 rounded-b-radius-lg bg-gradient-to-t from-surface-raised to-transparent" />
          )}
        </div>

        <button
          onClick={handleConfirm}
          className="mt-2 w-full min-h-[44px] rounded-radius-md bg-white py-3.5 text-base font-semibold text-black active:bg-text-secondary active:scale-[0.97] transition-[background-color,transform] duration-100 animate-[fadeIn_400ms_ease-out_400ms_both]"
        >
          {t("continue", selected)}
        </button>
      </div>
    </div>
  );
}
