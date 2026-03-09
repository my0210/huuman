import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConnectButton } from "./ConnectButton";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("display_name")
    .eq("username", username)
    .maybeSingle();

  const displayName = profile?.display_name || username;

  return {
    title: `${displayName} on huuman`,
    description: `Connect with ${displayName} on huuman`,
    openGraph: {
      title: `${displayName} on huuman`,
      description: `Connect with ${displayName} on huuman`,
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, display_name, username")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName = profile.display_name || profile.username || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const isSelf = user?.id === profile.id;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-700 text-2xl font-bold text-zinc-200">
          {initial}
        </div>

        <h1 className="text-lg font-semibold text-zinc-100">{displayName}</h1>
        {profile.username && (
          <p className="mt-1 text-sm text-zinc-500">@{profile.username}</p>
        )}

        <div className="mt-8">
          {isSelf ? (
            <p className="text-sm text-zinc-500">This is you</p>
          ) : user ? (
            <ConnectButton recipientId={profile.id} />
          ) : (
            <a
              href={`/login?connect=${encodeURIComponent(username)}`}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
            >
              Join huuman to connect
            </a>
          )}
        </div>

        <p className="mt-6 text-xs text-zinc-600">
          huuman — AI longevity coach
        </p>
      </div>
    </div>
  );
}
