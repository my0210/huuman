import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  postSessionCard,
  postSleepCard,
  postMealCard,
  postCommitmentCard,
} from "@/lib/social/post";
import type {
  SessionCardDetail,
  SleepCardDetail,
  MealCardDetail,
  CommitmentCardDetail,
} from "@/lib/types";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, detail } = (await req.json()) as {
    type: string;
    detail: unknown;
  };

  switch (type) {
    case "session_card":
      await postSessionCard(supabase, user.id, detail as SessionCardDetail);
      break;
    case "sleep_card":
      await postSleepCard(supabase, user.id, detail as SleepCardDetail);
      break;
    case "meal_card":
      await postMealCard(supabase, user.id, detail as MealCardDetail);
      break;
    case "commitment_card":
      await postCommitmentCard(
        supabase,
        user.id,
        detail as CommitmentCardDetail,
      );
      break;
    default:
      return NextResponse.json({ error: "Unknown card type" }, { status: 400 });
  }

  return NextResponse.json({ shared: true });
}
