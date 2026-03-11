"use client";

import type { SleepCardDetail } from "@/lib/types";
import {
  ShareCanvas,
  getDomainShareStyle,
} from "@/components/share/BrandedShareFrame";

const QUALITY_LABEL: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "OK",
  4: "Good",
  5: "Great",
};

export function SleepShareImage({ detail }: { detail: SleepCardDetail }) {
  const style = getDomainShareStyle("sleep");
  const quality =
    detail.quality != null ? QUALITY_LABEL[detail.quality] ?? `${detail.quality}/5` : null;

  return (
    <ShareCanvas
      chipLabel={style.label}
      chipClassName={style.chipClassName}
      footer={
        <div className="flex items-center justify-between">
          <div className="text-[24px] text-text-tertiary">Shared from huuman</div>
          {detail.streak != null && detail.streak > 0 ? (
            <div className="rounded-full border border-domain-sleep/30 bg-domain-sleep-muted px-5 py-2 text-[24px] font-semibold text-domain-sleep-bright">
              {detail.streak}d streak
            </div>
          ) : null}
        </div>
      }
    >
      <div className="mt-16 flex h-full flex-col">
        <div className="text-[24px] font-medium uppercase tracking-[0.16em] text-text-tertiary">
          Sleep
        </div>

        <div className="mt-6 text-[220px] font-semibold leading-[0.9] tracking-[-0.06em] text-text-primary">
          {detail.hours}h
        </div>

        <div className="mt-8 space-y-4">
          {quality ? (
            <p className="text-[42px] leading-[1.1] tracking-[-0.03em] text-text-primary">
              Quality: <span className="text-domain-sleep-bright">{quality}</span>
            </p>
          ) : null}

          <p className="max-w-[780px] text-[34px] leading-[1.25] text-text-secondary">
            {detail.isNotable
              ? "A notable recovery night logged in huuman."
              : "Rest and recovery logged in huuman."}
          </p>
        </div>

        <div className="mt-auto rounded-[32px] border border-border-default bg-surface-base/70 px-6 py-5">
          <div className="text-[22px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
            Recovery log
          </div>
          <div className="mt-2 text-[34px] leading-[1.15] text-text-primary">
            {quality
              ? `${detail.hours}h sleep with ${quality.toLowerCase()} quality`
              : `${detail.hours}h sleep logged`}
          </div>
        </div>
      </div>
    </ShareCanvas>
  );
}
