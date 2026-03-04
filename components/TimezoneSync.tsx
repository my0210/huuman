"use client";

import { useEffect } from "react";

const TZ_SYNCED_KEY = "huuman_tz_synced";

export function TimezoneSync() {
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    const lastSynced = localStorage.getItem(TZ_SYNCED_KEY);
    if (lastSynced === tz) return;

    fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tz }),
    }).then((res) => {
      if (res.ok) localStorage.setItem(TZ_SYNCED_KEY, tz);
    }).catch(() => {});
  }, []);

  return null;
}
