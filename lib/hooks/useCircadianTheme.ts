"use client";

import { useEffect, useState } from "react";

type CircadianPhase = "dawn" | "day" | "dusk" | "midnight";

export function useCircadianTheme() {
  const [phase, setPhase] = useState<CircadianPhase>("day");

  useEffect(() => {
    const updatePhase = () => {
      const hour = new Date().getHours();
      let currentPhase: CircadianPhase = "day";

      if (hour >= 6 && hour < 12) {
        currentPhase = "dawn";
      } else if (hour >= 12 && hour < 18) {
        currentPhase = "day";
      } else if (hour >= 18 && hour < 21) {
        currentPhase = "dusk";
      } else {
        currentPhase = "midnight";
      }

      setPhase(currentPhase);
      document.body.setAttribute("data-phase", currentPhase);
    };

    updatePhase();
    const interval = setInterval(updatePhase, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return phase;
}
