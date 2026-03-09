"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Drawer } from "@/components/layout/Drawer";
import { Avatar } from "@/components/ui/Avatar";

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

type Step = "name" | "members";

interface CreateGroupDrawerProps {
  open: boolean;
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

export function CreateGroupDrawer({
  open,
  onClose,
  onCreated,
}: CreateGroupDrawerProps) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("name");
    setName("");
    setSelectedIds(new Set());
  }, [open]);

  useEffect(() => {
    if (step !== "members") return;
    setLoadingFriends(true);
    fetch("/api/friends")
      .then((r) => r.json())
      .then((data) => setFriends(data.friends ?? []))
      .finally(() => setLoadingFriends(false));
  }, [step]);

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          memberIds: Array.from(selectedIds),
        }),
      });
      if (res.ok) {
        const { group } = await res.json();
        onCreated(group.id);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="New group"
      onBack={step === "members" ? () => setStep("name") : onClose}
      rightAction={<StepIndicator current={step} />}
    >
      <div className="px-4 py-6">
        {step === "name" ? (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-zinc-400">
                Group name
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Morning runners, Gym buddies..."
                autoFocus
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
              />
            </label>
            <button
              onClick={() => setStep("members")}
              disabled={!name.trim()}
              className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 disabled:opacity-30 hover:bg-white transition-colors"
            >
              Next
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Select friends to add to{" "}
              <span className="text-zinc-200">{name}</span>
            </p>

            {loadingFriends ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-zinc-500">No friends yet</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Add friends first to invite them to groups
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((f) => {
                  const selected = selectedIds.has(f.user.id);
                  return (
                    <button
                      key={f.user.id}
                      onClick={() => toggleMember(f.user.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                        selected
                          ? "border-blue-500/40 bg-blue-500/10"
                          : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                          selected
                            ? "border-blue-500 bg-blue-500"
                            : "border-zinc-600 bg-zinc-800"
                        }`}
                      >
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                      <Avatar
                        name={
                          f.user.display_name || f.user.username || f.user.email
                        }
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">
                          {f.user.display_name ||
                            f.user.username ||
                            f.user.email}
                        </p>
                        {f.user.username && (
                          <p className="text-xs text-zinc-500">
                            @{f.user.username}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 disabled:opacity-30 hover:bg-white transition-colors"
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
                  Creating...
                </span>
              ) : (
                `Create${selectedIds.size > 0 ? ` with ${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""}` : ""}`
              )}
            </button>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = ["name", "members"];
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((s) => (
        <div
          key={s}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            s === current ? "bg-zinc-300" : "bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}
