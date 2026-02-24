"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LANGUAGES, saveLanguage, type LanguageCode } from "@/lib/languages";

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
    selectedRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const handleConfirm = () => {
    saveLanguage(selected);
    onSelect(selected);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex min-h-dvh flex-col items-center justify-center bg-zinc-950 px-4 py-8"
      >
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="mb-2 h-10 w-10 rounded-xl bg-gradient-to-br from-zinc-300 to-zinc-500 flex items-center justify-center">
              <span className="text-lg font-bold text-zinc-950">h</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="relative w-full"
          >
            {showTopFade && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-12 rounded-t-2xl bg-gradient-to-b from-zinc-900 to-transparent" />
            )}

            <div
              ref={listRef}
              className="max-h-[60dvh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-sm scrollbar-none"
            >
              <div className="py-1">
                {LANGUAGES.map((lang) => {
                  const isSelected = selected === lang.code;
                  return (
                    <button
                      key={lang.code}
                      ref={isSelected ? selectedRef : undefined}
                      onClick={() => setSelected(lang.code)}
                      className={`group relative w-full px-5 py-3 text-left transition-colors duration-150 ${
                        isSelected
                          ? "bg-blue-600"
                          : "hover:bg-zinc-800/60"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                          className={`text-[15px] font-medium ${
                            isSelected ? "text-white" : "text-zinc-200"
                          }`}
                        >
                          {lang.native}
                        </span>
                        <span
                          className={`text-[13px] ${
                            isSelected
                              ? "text-blue-100"
                              : "text-zinc-500"
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
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-12 rounded-b-2xl bg-gradient-to-t from-zinc-900 to-transparent" />
            )}
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            onClick={handleConfirm}
            className="mt-2 w-full rounded-xl bg-zinc-100 py-3.5 text-[15px] font-semibold text-zinc-900 transition-colors hover:bg-white active:bg-zinc-200"
          >
            Continue
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
