"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Drawer } from "@/components/layout/Drawer";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("name");
    setName("");
    setSelectedIds(new Set());
    setError(null);
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
    setError(null);
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
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create group. Try again.");
      }
    } catch {
      setError("Something went wrong. Try again.");
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
              <span className="text-xs font-medium text-text-secondary">
                Group name
              </span>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Morning runners, Gym buddies..."
                autoFocus
                className="mt-2"
              />
            </label>
            <Button
              onClick={() => setStep("members")}
              disabled={!name.trim()}
              variant="primary"
              size="lg"
              fullWidth
            >
              Next
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-text-secondary">
              Select friends to add to{" "}
              <span className="text-text-primary">{name}</span>
            </p>

            {loadingFriends ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-text-tertiary">No friends yet</p>
                <p className="text-xs text-text-muted mt-1">
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
                      className={`flex w-full items-center gap-3 rounded-radius-lg border px-4 py-3 text-left transition-colors ${
                        selected
                          ? "border-semantic-info/40 bg-semantic-info/10"
                          : "border-border-default bg-surface-raised active:bg-surface-overlay"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-md border transition-colors ${
                          selected
                            ? "border-semantic-info bg-semantic-info"
                            : "border-border-strong bg-surface-overlay"
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
                        <p className="text-sm text-text-primary truncate">
                          {f.user.display_name ||
                            f.user.username ||
                            f.user.email}
                        </p>
                        {f.user.username && (
                          <p className="text-xs text-text-tertiary">
                            @{f.user.username}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="rounded-radius-lg border border-semantic-error/50 bg-semantic-error/10 px-3 py-2 text-xs text-semantic-error">
                {error}
              </div>
            )}

            <Button
              onClick={handleCreate}
              disabled={creating}
              variant="primary"
              size="lg"
              fullWidth
            >
              {creating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
                  Creating...
                </span>
              ) : (
                `Create${selectedIds.size > 0 ? ` with ${selectedIds.size} member${selectedIds.size > 1 ? "s" : ""}` : ""}`
              )}
            </Button>
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
            s === current ? "bg-text-secondary" : "bg-surface-elevated"
          }`}
        />
      ))}
    </div>
  );
}
