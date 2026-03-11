"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Settings } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
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
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchGroup = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (!res.ok) return;
    const data = await res.json();
    const match = (data.groups ?? []).find((g: GroupData) => g.id === id);
    if (match) setGroup(match);
  }, [id]);

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
  }, [id, fetchGroup]);

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center bg-surface-base">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center bg-surface-base gap-3">
        <p className="text-sm text-text-tertiary">Group not found</p>
        <button
          onClick={() => router.push("/groups")}
          className="text-sm text-text-muted active:text-text-secondary transition-colors"
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
    <div className="flex flex-1 min-h-0 flex-col bg-surface-base">
      <header className="flex-none border-b border-border-default px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconButton
            label="Back"
            size="sm"
            onClick={() => router.push("/groups")}
          >
            <ArrowLeft size={16} />
          </IconButton>
          <h1 className="text-sm font-semibold text-text-primary truncate max-w-48">
            {group.name}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <span className="flex items-center gap-1 text-xs text-text-muted mr-1">
            <Users size={12} />
            {group.members.length}
          </span>
          <IconButton
            label="Settings"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings size={16} />
          </IconButton>
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
