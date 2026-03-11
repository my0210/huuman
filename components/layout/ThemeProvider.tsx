"use client";

import { useCircadianTheme } from "@/lib/hooks/useCircadianTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useCircadianTheme();
  return <>{children}</>;
}
