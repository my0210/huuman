"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check, UserPlus, LogOut, Pencil } from "lucide-react";

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

  if (!open) return null;

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md max-h-[85dvh] rounded-t-2xl sm:rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-none flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">Group settings</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* Group name */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-500">Name</span>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  disabled={savingName}
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-900 disabled:opacity-50"
                >
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-200">{groupName}</p>
                {isAdmin && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Members ({members.length})
              </span>
              {isAdmin && (
                <button
                  onClick={() => setShowAddMembers(!showAddMembers)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  <UserPlus size={12} />
                  Add
                </button>
              )}
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 divide-y divide-zinc-800">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-zinc-200 truncate">
                    {m.displayName || "Member"}
                    {m.id === currentUserId && (
                      <span className="ml-1.5 text-xs text-zinc-500">you</span>
                    )}
                  </span>
                  <span className="text-[11px] text-zinc-500 capitalize">{m.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Add members panel */}
          {showAddMembers && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-500">Add friends</span>
              {loadingFriends ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
                </div>
              ) : availableFriends.length === 0 ? (
                <p className="text-xs text-zinc-600 py-3 text-center">
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
                        className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-2.5 text-left hover:bg-zinc-900 disabled:opacity-50 transition-colors"
                      >
                        <span className="text-sm text-zinc-200 truncate">
                          {f.user.display_name || f.user.username || f.user.email}
                        </span>
                        {adding ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
                        ) : (
                          <span className="text-xs text-zinc-500">Add</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Leave group */}
          <div className="pt-2 border-t border-zinc-800">
            {!confirmLeave ? (
              <button
                onClick={() => setConfirmLeave(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={14} />
                Leave group
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-zinc-400 text-center">
                  Are you sure you want to leave?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmLeave(false)}
                    className="flex-1 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLeave}
                    disabled={leaving}
                    className="flex-1 rounded-xl bg-red-500/20 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                  >
                    {leaving ? "Leaving..." : "Leave"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
