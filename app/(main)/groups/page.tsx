"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
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
    <div className="flex flex-1 min-h-0 flex-col bg-zinc-950">
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
          onClick={() => setCreateOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <Plus size={16} />
        </button>
      </header>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <Users size={32} className="text-zinc-700 mb-4" />
          <p className="text-sm text-zinc-300">No groups yet</p>
          <p className="text-xs text-zinc-500 mt-1.5 max-w-[220px]">
            Add friends and create a group to share workouts together
          </p>
          <button
            onClick={() => router.push("/friends/manage")}
            className="mt-6 rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
          >
            Add friends
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {groups.map((group) => (
            <button
              key={group.id}
              onClick={() => router.push(`/groups/${group.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left hover:bg-zinc-900 transition-colors"
            >
              <div className="flex -space-x-1.5 flex-none">
                {group.members.slice(0, 3).map((m) => (
                  <Avatar key={m.id} name={m.display_name || m.username} size="sm" className="ring-1 ring-zinc-950" />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{group.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">{memberPreview(group.members)}</p>
              </div>
              {group.unreadCount > 0 ? (
                <span className="min-w-[20px] h-5 rounded-full bg-blue-500 text-[11px] font-bold text-white flex items-center justify-center px-1.5">
                  {group.unreadCount}
                </span>
              ) : (
                <span className="text-xs text-zinc-600">--</span>
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
