"use client";

import { haptics } from "@/lib/haptics";
import type { LucideIcon } from "lucide-react";

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="flex items-center justify-around border-t border-border-subtle bg-surface-base px-2 pt-1.5 safe-bottom">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => {
              if (!isActive) {
                haptics.light();
                onTabChange(tab.id);
              }
            }}
            className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[64px] min-h-[44px] active:scale-95 transition-transform duration-100 ${
              isActive ? "text-text-primary" : "text-text-muted"
            }`}
          >
            <Icon size={22} />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
