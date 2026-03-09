"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Plus } from "lucide-react";

interface GroupMember {
  id: string;
  display_name: string;
  username: string;
  role: string;
}

interface GroupData {
  id: string;
  name: string;
  members: GroupMember[];
  unreadCount: number;
  lastMessage?: {
    content?: string;
    messageType: string;
    createdAt: string;
  } | null;
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <header className="flex-none border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-semibold text-zinc-100">Groups</h1>
        </div>
        <button
          onClick={() => router.push("/friends/manage")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <Users size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <button
          onClick={() => router.push("/groups/create")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 px-4 py-3 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900/50 transition-colors"
        >
          <Plus size={16} />
          Create new group
        </button>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={32} className="text-zinc-700 mb-3" />
            <p className="text-sm text-zinc-300">Get started</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-[240px]">
              Add friends first, then create a group to share workouts and stay motivated together
            </p>
            <button
              onClick={() => router.push("/friends/manage")}
              className="mt-4 rounded-xl bg-zinc-100 px-5 py-2 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
            >
              Find friends
            </button>
            <button
              onClick={() => router.push("/groups/create")}
              className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              or create a group directly
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <button
              key={group.id}
              onClick={() => router.push(`/groups/${group.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left hover:bg-zinc-900 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">
                  {group.name}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {memberPreview(group.members)}
                </p>
              </div>
              <UnreadBadge count={group.unreadCount} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function memberPreview(members: GroupMember[]): string {
  const names = members
    .slice(0, 3)
    .map((m) => m.display_name || m.username || "Member");
  const suffix = members.length > 3 ? ` +${members.length - 3}` : "";
  return names.join(", ") + suffix;
}

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) {
    return (
      <span className="text-xs text-zinc-600">--</span>
    );
  }
  return (
    <span className="min-w-[20px] h-5 rounded-full bg-blue-500 text-[11px] font-bold text-white flex items-center justify-center px-1.5">
      {count}
    </span>
  );
}
