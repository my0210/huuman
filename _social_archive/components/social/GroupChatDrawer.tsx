"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Users, Settings } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
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

interface GroupChatDrawerProps {
  open: boolean;
  groupId: string;
  currentUserId: string;
  onClose: () => void;
  onBack: () => void;
}

export function GroupChatDrawer({
  open,
  groupId,
  currentUserId,
  onClose,
  onBack,
}: GroupChatDrawerProps) {
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);

  const fetchGroup = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (!res.ok) return;
    const data = await res.json();
    const match = (data.groups ?? []).find((g: GroupData) => g.id === groupId);
    if (match) setGroup(match);
  }, [groupId]);

  useEffect(() => {
    if (!open || !groupId) return;
    setLoading(true);
    setGroup(null);
    setSettingsOpen(false);
    fetchGroup().finally(() => setLoading(false));
  }, [open, groupId, fetchGroup]);

  const settingsMembers = (group?.members ?? []).map((m) => ({
    id: m.id,
    displayName: m.display_name || m.username || undefined,
    role: m.role,
  }));

  return (
    <>
      <Sheet open={open} onOpenChange={(val) => { if (!val) onClose(); }} snapPoints={[0.9]}>
        <Sheet.Header>
          <div className="flex items-center justify-between w-full min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <IconButton label="Back" size="sm" onClick={onBack}>
                <ArrowLeft size={16} />
              </IconButton>
              <h2 className="text-sm font-semibold text-text-primary truncate max-w-48">
                {loading ? "Loading..." : group?.name ?? "Group"}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {group && (
                <>
                  <span className="flex items-center gap-1 text-xs text-text-muted mr-1">
                    <Users size={12} />
                    {group.members.length}
                    {onlineCount > 0 && (
                      <span className="flex items-center gap-1 text-semantic-success">
                        <span className="h-1.5 w-1.5 rounded-full bg-semantic-success" />
                        {onlineCount}
                      </span>
                    )}
                  </span>
                  <IconButton
                    label="Settings"
                    size="sm"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings size={14} />
                  </IconButton>
                </>
              )}
            </div>
          </div>
        </Sheet.Header>

        <Sheet.Body>
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
              </div>
            ) : !group ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className="text-sm text-text-tertiary">Group not found</p>
                <button
                  onClick={onBack}
                  className="text-sm text-text-muted active:text-text-secondary transition-colors"
                >
                  Back to groups
                </button>
              </div>
            ) : (
              <GroupChat groupId={group.id} currentUserId={currentUserId} onOnlineCountChange={setOnlineCount} />
            )}
          </div>
        </Sheet.Body>
      </Sheet>

      {group && (
        <GroupSettings
          groupId={group.id}
          groupName={group.name}
          members={settingsMembers}
          currentUserId={currentUserId}
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onUpdated={() => fetchGroup()}
        />
      )}
    </>
  );
}
