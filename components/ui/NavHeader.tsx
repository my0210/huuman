"use client";

import { IonHeader, IonToolbar, IonButtons, IonTitle } from "@ionic/react";
import { ChevronLeft } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface NavHeaderProps {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
}

export function NavHeader({ title, onBack, rightAction }: NavHeaderProps) {
  return (
    <IonHeader>
      <IonToolbar>
        <IonButtons slot="start">
          <button
            onClick={() => {
              haptics.light();
              onBack();
            }}
            className="flex min-h-[44px] items-center gap-0.5 pl-2 pr-2 text-text-secondary active:opacity-70 transition-opacity"
          >
            <ChevronLeft size={20} />
            <span className="text-sm">Back</span>
          </button>
        </IonButtons>
        <IonTitle className="text-sm font-semibold">{title}</IonTitle>
        {rightAction && (
          <IonButtons slot="end">{rightAction}</IonButtons>
        )}
      </IonToolbar>
    </IonHeader>
  );
}
