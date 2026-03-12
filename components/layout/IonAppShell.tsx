"use client";

import { IonApp } from "@ionic/react";
import type { ReactNode } from "react";

export function IonAppShell({ children }: { children: ReactNode }) {
  return <IonApp>{children}</IonApp>;
}
