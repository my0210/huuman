"use client";

import { useState, useEffect } from "react";
import { Users, Plus } from "lucide-react";
import { Drawer } from "@/components/layout/Drawer";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";

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
  is_dm?: boolean;
  displayName?: string;
  lastMessage?: {
    content?: string;
    messageType: string;
    createdAt: string;
  } | null;
}

interface GroupListDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenGroup: (groupId: string) => void;
  onOpenFriends: () => void;
  onOpenCreateGroup: () => void;
}

export function GroupListDrawer({
  open,
  onClose,
  onOpenGroup,
  onOpenFriends,
  onOpenCreateGroup,
}: GroupListDrawerProps) {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Groups"
      rightAction={
        <IconButton label="Friends" size="sm" onClick={onOpenFriends}>
          <Users size={14} />
        </IconButton>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          <button
            onClick={onOpenCreateGroup}
            className="flex w-full items-center justify-center gap-2 rounded-radius-lg border border-dashed border-border-default bg-surface-raised px-4 py-3 text-sm text-text-secondary active:text-text-primary active:border-border-strong active:bg-surface-overlay transition-colors"
          >
            <Plus size={16} />
            Create new group
          </button>

          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users size={32} className="text-text-muted mb-3" />
              <p className="text-sm text-text-secondary">Get started</p>
              <p className="text-xs text-text-tertiary mt-1 max-w-[240px]">
                Add friends first, then create a group to share workouts and
                stay motivated together
              </p>
              <button
                onClick={onOpenFriends}
                className="mt-4 rounded-radius-lg bg-text-primary px-5 py-2 text-sm font-medium text-surface-base active:bg-white transition-colors"
              >
                Find friends
              </button>
              <button
                onClick={onOpenCreateGroup}
                className="mt-2 text-xs text-text-tertiary active:text-text-secondary transition-colors"
              >
                or create a group directly
              </button>
            </div>
          ) : (
            groups.map((group) => (
              <button
                key={group.id}
                onClick={() => onOpenGroup(group.id)}
                className="flex w-full items-center gap-3 rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-left active:bg-surface-overlay transition-colors"
              >
                <div className="flex -space-x-1.5 flex-none">
                  {group.members.slice(0, 3).map((m) => (
                    <Avatar
                      key={m.id}
                      name={m.display_name || m.username}
                      size="sm"
                      className="ring-1 ring-surface-base"
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {group.displayName ?? group.name}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {group.lastMessage
                      ? lastMessagePreview(group.lastMessage)
                      : memberPreview(group.members)}
                  </p>
                </div>
                {group.lastMessage && (
                  <span className="text-[10px] text-text-muted flex-none mr-2">
                    {formatRelativeTime(group.lastMessage.createdAt)}
                  </span>
                )}
                <UnreadBadge count={group.unreadCount} />
              </button>
            ))
          )}
        </div>
      )}
    </Drawer>
  );
}

function lastMessagePreview(msg: { content?: string; messageType: string }): string {
  switch (msg.messageType) {
    case "text": return msg.content?.slice(0, 50) || "Message";
    case "voice": return "🎙 Voice message";
    case "photo": return "📷 Photo";
    case "session_card": return "💪 Completed a session";
    case "sleep_card": return "😴 Logged sleep";
    case "meal_card": return "🍽 Shared a meal";
    case "commitment_card": return "🎯 Made a commitment";
    default: return "Message";
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    return <span className="text-xs text-text-muted">--</span>;
  }
  return (
    <span className="min-w-[20px] h-5 rounded-full bg-semantic-info text-[11px] font-bold text-white flex items-center justify-center px-1.5">
      {count}
    </span>
  );
}
