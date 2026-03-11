"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { CreateGroupDrawer } from "@/components/social/CreateGroupDrawer";

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
}

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-surface-base">
      <header className="flex-none border-b border-border-default px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconButton
            label="Back"
            size="sm"
            onClick={() => router.push("/")}
          >
            <ArrowLeft size={16} />
          </IconButton>
          <h1 className="text-sm font-semibold text-text-primary">Groups</h1>
        </div>
        <IconButton
          label="Create group"
          size="sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={16} />
        </IconButton>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <Users size={32} className="text-text-muted mb-4" />
          <p className="text-sm text-text-secondary">No groups yet</p>
          <p className="text-xs text-text-muted mt-1.5 max-w-[220px]">
            Add friends and create a group to share workouts together
          </p>
          <Button
            onClick={() => router.push("/friends/manage")}
            className="mt-6"
          >
            Add friends
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => router.push(`/groups/${group.id}`)}
              className="flex w-full items-center gap-3 rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-left text-text-secondary active:bg-surface-elevated transition-colors"
            >
              <div className="flex -space-x-1.5 flex-none">
                {group.members.slice(0, 3).map((m) => (
                  <Avatar key={m.id} name={m.display_name || m.username} size="sm" className="ring-1 ring-surface-base" />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{group.name}</p>
                <p className="text-xs text-text-muted mt-0.5 truncate">{memberPreview(group.members)}</p>
              </div>
              {group.unreadCount > 0 ? (
                <span className="min-w-[20px] h-5 rounded-full bg-semantic-info text-[11px] font-bold text-white flex items-center justify-center px-1.5">
                  {group.unreadCount}
                </span>
              ) : (
                <span className="text-xs text-text-muted">--</span>
              )}
            </button>
          ))}
        </div>
      )}

      <CreateGroupDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => { setCreateOpen(false); router.push(`/groups/${id}`); }}
      />
    </div>
  );
}

function memberPreview(members: GroupMember[]): string {
  const names = members.slice(0, 3).map((m) => m.display_name || m.username || "Member");
  const suffix = members.length > 3 ? ` +${members.length - 3}` : "";
  return names.join(", ") + suffix;
}
