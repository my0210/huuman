"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check, UserPlus, LogOut, Pencil } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Member {
  id: string;
  displayName?: string;
  role: string;
}

interface FriendUser {
  id: string;
  display_name?: string;
  username?: string;
  email: string;
}

interface FriendEntry {
  friendshipId: string;
  user: FriendUser;
}

interface GroupSettingsProps {
  groupId: string;
  groupName: string;
  members: Member[];
  currentUserId: string;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function GroupSettings({
  groupId,
  groupName,
  members,
  currentUserId,
  open,
  onClose,
  onUpdated,
}: GroupSettingsProps) {
  const [name, setName] = useState(groupName);
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = members.find((m) => m.id === currentUserId)?.role === "admin";
  const existingMemberIds = new Set(members.map((m) => m.id));

  useEffect(() => {
    setName(groupName);
    setEditingName(false);
    setShowAddMembers(false);
    setConfirmLeave(false);
  }, [groupName, open]);

  useEffect(() => {
    if (!showAddMembers) return;
    setLoadingFriends(true);
    fetch("/api/friends")
      .then((r) => r.json())
      .then((data) => setFriends(data.friends ?? []))
      .finally(() => setLoadingFriends(false));
  }, [showAddMembers]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === groupName) {
      setEditingName(false);
      setName(groupName);
      return;
    }
    setSavingName(true);
    const res = await fetch("/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, name: name.trim() }),
    });
    if (res.ok) {
      setEditingName(false);
      onUpdated?.();
    }
    setSavingName(false);
  };

  const handleAddMember = async (userId: string) => {
    setAddingIds((prev) => new Set(prev).add(userId));
    const res = await fetch("/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, addMemberIds: [userId] }),
    });
    if (res.ok) onUpdated?.();
    setAddingIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const handleLeave = async () => {
    setLeaving(true);
    const res = await fetch("/api/groups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, removeMemberIds: [currentUserId] }),
    });
    if (res.ok) {
      onClose();
      window.location.href = "/groups";
    }
    setLeaving(false);
  };

  const availableFriends = friends.filter((f) => !existingMemberIds.has(f.user.id));

  return (
    <Sheet
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose();
      }}
      snapPoints={[0.85]}
    >
      <Sheet.Header
        title="Group settings"
        rightAction={
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X size={14} />
          </IconButton>
        }
      />
      <Sheet.Body>
        <div className="px-4 py-4 space-y-5 safe-bottom">
          {/* Group name */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-text-muted">Name</span>
            {editingName ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  disabled={savingName}
                />
                <IconButton
                  label="Save"
                  size="sm"
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="h-8 w-8 flex-shrink-0 bg-text-primary text-surface-base"
                >
                  <Check size={14} />
                </IconButton>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-text-secondary">{groupName}</p>
                {isAdmin && (
                  <IconButton
                    label="Edit name"
                    size="sm"
                    onClick={() => setEditingName(true)}
                  >
                    <Pencil size={13} />
                  </IconButton>
                )}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">
                Members ({members.length})
              </span>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="flex items-center gap-1 rounded-radius-sm px-2 py-1 text-xs text-text-tertiary active:text-text-secondary active:bg-surface-raised transition-colors"
                >
                  <UserPlus size={12} />
                  Add
                </button>
              )}
            </div>
            <div className="rounded-radius-md border border-border-default bg-surface-raised divide-y divide-border-subtle">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-text-secondary truncate">
                    {m.displayName || "Member"}
                    {m.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-text-muted">you</span>
                    )}
                  </span>
                  <span className="text-[11px] text-text-muted capitalize">{m.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add members panel */}
          {showAddMembers && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-text-muted">Add friends</span>
              {loadingFriends ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
                </div>
              ) : availableFriends.length === 0 ? (
                <p className="text-xs text-text-muted py-3 text-center">
                  All friends are already members
                </p>
              ) : (
                <div className="space-y-1">
                  {availableFriends.map((f) => {
                    const adding = addingIds.has(f.user.id);
                    return (
                      <button
                        key={f.user.id}
                        onClick={() => handleAddMember(f.user.id)}
                        disabled={adding}
                        className="flex w-full items-center justify-between rounded-radius-sm border border-border-default bg-surface-raised px-4 py-2.5 text-left text-text-secondary active:bg-surface-elevated disabled:opacity-50 transition-colors"
                      >
                        <span className="text-sm truncate">
                          {f.user.display_name || f.user.username || f.user.email}
                        </span>
                        {adding ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
                        ) : (
                          <span className="text-xs text-text-muted">Add</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Leave group */}
          <div className="pt-2 border-t border-border-subtle">
            {!confirmLeave ? (
              <button
                onClick={() => setConfirmLeave(true)}
                className="flex w-full items-center justify-center gap-2 rounded-radius-md px-4 py-3 text-sm text-semantic-error active:bg-semantic-error/10 transition-colors"
              >
                <LogOut size={14} />
                Leave group
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-text-tertiary text-center">
                  Are you sure you want to leave?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setConfirmLeave(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleLeave}
                    disabled={leaving}
                    className="flex-1"
                  >
                    {leaving ? "Leaving..." : "Leave"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Sheet.Body>
    </Sheet>
  );
}
