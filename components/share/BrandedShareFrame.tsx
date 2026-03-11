"use client";

import type { ReactNode } from "react";
import type { Domain, SessionDomain } from "@/lib/types";

const DOMAIN_STYLES: Record<
  Domain,
  {
    label: string;
    chipClassName: string;
    accentClassName: string;
  }
> = {
  cardio: {
    label: "CARDIO",
    chipClassName:
      "border-domain-cardio/30 bg-domain-cardio-muted text-domain-cardio-bright",
    accentClassName: "bg-domain-cardio",
  },
  strength: {
    label: "STRENGTH",
    chipClassName:
      "border-domain-strength/30 bg-domain-strength-muted text-domain-strength-bright",
    accentClassName: "bg-domain-strength",
  },
  mindfulness: {
    label: "MINDFULNESS",
    chipClassName:
      "border-domain-mindfulness/30 bg-domain-mindfulness-muted text-domain-mindfulness-bright",
    accentClassName: "bg-domain-mindfulness",
  },
  nutrition: {
    label: "NUTRITION",
    chipClassName:
      "border-domain-nutrition/30 bg-domain-nutrition-muted text-domain-nutrition-bright",
    accentClassName: "bg-domain-nutrition",
  },
  sleep: {
    label: "SLEEP",
    chipClassName:
      "border-domain-sleep/30 bg-domain-sleep-muted text-domain-sleep-bright",
    accentClassName: "bg-domain-sleep",
  },
};

export function getDomainShareStyle(domain: Domain | SessionDomain) {
  return DOMAIN_STYLES[domain];
}

export function ShareChip({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <div
      className={`rounded-full border px-5 py-2 text-[26px] font-semibold uppercase tracking-[0.18em] ${className}`}
    >
      {label}
    </div>
  );
}

export function ShareCanvas({
  chipLabel,
  chipClassName,
  children,
  footer,
}: {
  chipLabel: string;
  chipClassName: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div
      className="bg-surface-base p-10 text-text-primary"
      style={{
        width: 1080,
        height: 1350,
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="flex h-full flex-col rounded-[40px] border border-border-default bg-surface-raised px-12 py-12 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="text-[34px] font-semibold tracking-[-0.03em] text-text-primary">
            huuman
          </div>
          <ShareChip label={chipLabel} className={chipClassName} />
        </div>

        <div className="flex-1">{children}</div>

        {footer ? (
          <div className="mt-8 border-t border-border-default pt-6">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
