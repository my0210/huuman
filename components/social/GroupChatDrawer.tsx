"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-lg rounded-t-2xl border-t border-x border-zinc-800 bg-zinc-950 flex flex-col"
            style={{ height: "90dvh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>

            <div className="flex-none border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={onBack}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <h2 className="text-sm font-semibold text-zinc-100 truncate max-w-48">
                  {loading ? "Loading..." : group?.name ?? "Group"}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {group && (
                  <>
                    <span className="flex items-center gap-1 text-xs text-zinc-500 mr-1">
                      <Users size={12} />
                      {group.members.length}
                    </span>
                    <button
                      onClick={() => setSettingsOpen(true)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    >
                      <Settings size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
                </div>
              ) : !group ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <p className="text-sm text-zinc-400">Group not found</p>
                  <button
                    onClick={onBack}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Back to groups
                  </button>
                </div>
              ) : (
                <GroupChat
                  groupId={group.id}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          </motion.div>

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
        </div>
      )}
    </AnimatePresence>
  );
}
