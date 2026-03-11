"use client";

import { CommitmentCardContent } from "./CommitmentCardContent";
import { GroupShareButton } from "./GroupShareButton";
import type { CommitmentCardDetail, Domain } from "@/lib/types";

function extractDetail(
  data: Record<string, unknown>,
): CommitmentCardDetail | null {
  const title = data.title as string | undefined;
  if (!title) return null;

  return {
    domain: (data.domain as Domain) ?? "strength",
    title,
    time: data.time as string | undefined,
    place: data.place as string | undefined,
    sessionPreview: data.sessionPreview as string | undefined,
  };
}

export function CoachCommitmentCard({
  data,
}: {
  data: Record<string, unknown>;
}) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
        Couldn&apos;t save commitment. Try again in a moment.
      </div>
    );
  }

  const detail = extractDetail(data);
  if (!detail) return null;

  return (
    <div>
      <CommitmentCardContent detail={detail} />
      <GroupShareButton type="commitment_card" detail={detail} />
    </div>
  );
}
