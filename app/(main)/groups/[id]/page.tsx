"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Settings } from "lucide-react";
import GroupSettings from "@/components/social/GroupSettings";
import GroupChat from "@/components/social/GroupChat";

interface Member {
  id: string;
  display_name: string;
  username: string;
  role: string;
}

interface GroupData {
  id: string;
  name: string;
  members: Member[];
}

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchGroup = async () => {
    const res = await fetch("/api/groups");
    if (!res.ok) return;
    const data = await res.json();
    const match = (data.groups ?? []).find(
      (g: GroupData) => g.id === id,
    );
    if (match) setGroup(match);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [, userRes] = await Promise.all([
          fetchGroup(),
          fetch("/api/profile"),
        ]);
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUserId(userData.profile?.id ?? userData.id ?? "");
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center bg-zinc-950 gap-3">
        <p className="text-sm text-zinc-400">Group not found</p>
        <button
          onClick={() => router.push("/groups")}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Back to groups
        </button>
      </div>
    );
  }

  const settingsMembers = group.members.map((m) => ({
    id: m.id,
    displayName: m.display_name || m.username || undefined,
    role: m.role,
  }));

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <header className="flex-none border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/groups")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-semibold text-zinc-100 truncate max-w-48">
            {group.name}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex items-center gap-1 text-xs text-zinc-500 mr-1">
            <Users size={12} />
            {group.members.length}
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <GroupChat groupId={group.id} currentUserId={currentUserId} />

      <GroupSettings
        groupId={group.id}
        groupName={group.name}
        members={settingsMembers}
        currentUserId={currentUserId}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUpdated={() => fetchGroup()}
      />
    </div>
  );
}
