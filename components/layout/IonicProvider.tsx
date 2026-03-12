"use client";

import type { ReactNode } from "react";
import { setupIonicReact } from "@ionic/react";

import "@ionic/react/css/core.css";
import "@ionic/react/css/structure.css";
import "@ionic/react/css/palettes/dark.always.css";

setupIonicReact({
  mode: "ios",
});

export function IonicProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
