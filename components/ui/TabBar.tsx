"use client";

import { motion } from "framer-motion";
import { spring } from "@/lib/motion";
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
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 min-w-[64px]"
          >
            <div className="relative">
              <Icon
                size={22}
                className={`transition-colors duration-150 ${
                  isActive ? "text-text-primary" : "text-text-muted"
                }`}
              />
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-text-primary"
                  transition={spring.snappy}
                />
              )}
            </div>
            <span
              className={`text-[10px] font-medium transition-colors duration-150 ${
                isActive ? "text-text-primary" : "text-text-muted"
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
