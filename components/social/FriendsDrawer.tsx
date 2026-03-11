"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Copy,
  Check,
  QrCode,
  Search,
  X,
  UserPlus,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { Drawer } from "@/components/layout/Drawer";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

interface FriendUser {
  id: string;
  display_name?: string;
  username?: string;
  email: string;
}

interface FriendEntry {
  friendshipId: string;
  status: string;
  createdAt: string;
  acceptedAt?: string;
  user: FriendUser;
  direction: "sent" | "received";
}

interface SearchUser {
  id: string;
  display_name?: string;
  username?: string;
}

interface FriendsDrawerProps {
  open: boolean;
  onClose: () => void;
  onBack: () => void;
  currentUserId: string;
  onOpenDm?: (groupId: string) => void;
}

export function FriendsDrawer({
  open,
  onClose,
  onBack,
  currentUserId,
  onOpenDm,
}: FriendsDrawerProps) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendEntry[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const personalLink = `${typeof window !== "undefined" ? window.location.origin : ""}/u/${currentUserId}`;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/friends")
      .then((r) => r.json())
      .then((data) => {
        setFriends(data.friends ?? []);
        setPendingReceived(data.pendingReceived ?? []);
        setPendingSent(data.pendingSent ?? []);
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleAccept = async (friendshipId: string) => {
    setAcceptingId(friendshipId);
    const res = await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action: "accept" }),
    });
    if (res.ok) {
      const accepted = pendingReceived.find(
        (p) => p.friendshipId === friendshipId,
      );
      setPendingReceived((prev) =>
        prev.filter((p) => p.friendshipId !== friendshipId),
      );
      if (accepted)
        setFriends((prev) => [{ ...accepted, status: "active" }, ...prev]);
    }
    setAcceptingId(null);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(personalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartDm = async (recipientId: string) => {
    const res = await fetch("/api/dm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId }),
    });
    if (res.ok) {
      const { groupId } = await res.json();
      onOpenDm?.(groupId);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Friends" onBack={onBack}>
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
        </div>
      ) : (
        <div className="flex flex-col" style={{ minHeight: "100%" }}>
          <div className="flex-1 px-4 py-6 space-y-8">
            {pendingReceived.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Requests
                </h2>
                <div className="space-y-2">
                  {pendingReceived.map((req) => (
                    <div
                      key={req.friendshipId}
                      className="flex items-center gap-3 rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3"
                    >
                      <Avatar
                        name={req.user.display_name || req.user.email}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {req.user.display_name || req.user.email}
                        </p>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAccept(req.friendshipId)}
                        disabled={acceptingId === req.friendshipId}
                      >
                        {acceptingId === req.friendshipId ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          "Accept"
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {pendingSent.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                  Sent
                </h2>
                <div className="space-y-2">
                  {pendingSent.map((req) => (
                    <div
                      key={req.friendshipId}
                      className="flex items-center gap-3 rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3"
                    >
                      <Avatar
                        name={req.user.display_name || req.user.email}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {req.user.display_name || req.user.email}
                        </p>
                        <p className="text-xs text-text-tertiary">Pending</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Friends
              </h2>
              {friends.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-text-tertiary">No friends yet</p>
                  <p className="text-xs text-text-muted mt-1">
                    Share your link or search to connect
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map((f) => (
                    <div
                      key={f.friendshipId}
                      className="flex items-center gap-3 rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3"
                    >
                      <Avatar
                        name={f.user.display_name || f.user.email}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {f.user.display_name || f.user.email}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          connected{" "}
                          {formatRelativeTime(f.acceptedAt || f.createdAt)}
                        </p>
                      </div>
                      <IconButton
                        label="Message"
                        size="sm"
                        onClick={() => handleStartDm(f.user.id)}
                      >
                        <MessageCircle size={16} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="h-4" />
          </div>

          <div className="sticky bottom-0 border-t border-border-default bg-surface-base px-4 py-4 space-y-3">
            <button
              onClick={handleCopyLink}
              className="flex w-full items-center justify-between rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-left active:bg-surface-elevated transition-colors"
            >
              <span className="text-sm text-text-secondary truncate">
                {personalLink}
              </span>
              {copied ? (
                <Check size={16} className="flex-none text-semantic-success" />
              ) : (
                <Copy size={16} className="flex-none text-text-tertiary" />
              )}
            </button>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setQrOpen(true)}
                className="flex-1 gap-2"
              >
                <QrCode size={16} />
                Show QR code
              </Button>
              <Button
                variant="secondary"
                onClick={() => setSearchOpen(true)}
                className="flex-1 gap-2"
              >
                <Search size={16} />
                Search
              </Button>
            </div>
          </div>
        </div>
      )}

      {qrOpen && (
        <QrModal
          link={personalLink}
          onClose={() => setQrOpen(false)}
        />
      )}

      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onSent={(userId) => {
            setPendingSent((prev) => {
              if (prev.some((p) => p.user.id === userId)) return prev;
              return prev;
            });
          }}
        />
      )}
    </Drawer>
  );
}

function QrModal({
  link,
  onClose,
}: {
  link: string;
  onClose: () => void;
}) {
  const QRCode = useQRCode();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-border-default bg-surface-raised p-6">
        <IconButton
          label="Close"
          size="sm"
          onClick={onClose}
          className="absolute right-4 top-4"
        >
          <X size={16} />
        </IconButton>

        <h2 className="text-sm font-semibold text-text-primary mb-6">
          Your QR code
        </h2>

        <div className="flex flex-col items-center gap-4">
          {QRCode ? (
            <div className="rounded-radius-lg bg-white p-4">
              <QRCode value={link} size={200} />
            </div>
          ) : (
            <div className="rounded-radius-lg border border-border-default bg-surface-overlay px-4 py-8 text-center">
              <p className="text-sm text-text-secondary break-all">{link}</p>
            </div>
          )}
          <p className="text-xs text-text-tertiary">{link}</p>
        </div>
      </div>
    </div>
  );
}

function useQRCode() {
  const [QR, setQR] = useState<React.ComponentType<{
    value: string;
    size: number;
  }> | null>(null);

  useEffect(() => {
    import("qrcode.react")
      .then((mod) => setQR(() => mod.QRCodeSVG))
      .catch(() => {});
  }, []);

  return QR;
}

function SearchModal({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (userId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(
        `/api/friends/search?q=${encodeURIComponent(q)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.users ?? []);
      }
      setSearching(false);
    }, 300);
  }, []);

  const handleConnect = async (userId: string) => {
    setSendingTo(userId);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: userId }),
    });
    if (res.ok || res.status === 409) {
      setSentIds((prev) => new Set(prev).add(userId));
      onSent(userId);
    }
    setSendingTo(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-surface-base backdrop-blur-sm">
      <header className="flex-none border-b border-border-default px-4 py-3 flex items-center gap-3">
        <IconButton
          label="Close"
          size="sm"
          onClick={onClose}
        >
          <X size={16} />
        </IconButton>
        <h1 className="text-lg font-semibold text-text-primary">
          Search for friends
        </h1>
      </header>

      <div className="px-4 pt-4">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            search(e.target.value);
          }}
          placeholder="Search by name or username..."
          className="w-full rounded-radius-lg border border-border-default bg-surface-raised px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {searching && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-text-tertiary" />
          </div>
        )}

        {!searching && query && results.length === 0 && (
          <p className="text-center text-sm text-text-tertiary py-8">
            No users found
          </p>
        )}

        {results.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3"
          >
            <Avatar
              name={user.display_name || user.username || "?"}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">
                {user.display_name || user.username}
              </p>
              {user.username && user.display_name && (
                <p className="text-xs text-text-tertiary">@{user.username}</p>
              )}
            </div>
            {sentIds.has(user.id) ? (
              <span className="text-xs text-text-tertiary">Sent</span>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleConnect(user.id)}
                disabled={sendingTo === user.id}
                className="gap-1.5"
              >
                {sendingTo === user.id ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <>
                    <UserPlus size={12} />
                    Connect
                  </>
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
