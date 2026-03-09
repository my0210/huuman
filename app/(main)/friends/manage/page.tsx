"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Check,
  QrCode,
  Search,
  X,
  UserPlus,
  Loader2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

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

export default function FriendsManagePage() {
  const router = useRouter();
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [pendingReceived, setPendingReceived] = useState<FriendEntry[]>([]);
  const [pendingSent, setPendingSent] = useState<FriendEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/friends").then((r) => r.json()),
      fetch("/api/profile").then((r) => r.json()),
    ])
      .then(([friendsData, profileData]) => {
        setFriends(friendsData.friends ?? []);
        setPendingReceived(friendsData.pendingReceived ?? []);
        setPendingSent(friendsData.pendingSent ?? []);
        setCurrentUserId(profileData.profile?.id ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const personalLink = currentUserId ? `huuman.app/u/${currentUserId}` : "";
  const hasContent = friends.length > 0 || pendingReceived.length > 0 || pendingSent.length > 0;

  const handleAccept = async (friendshipId: string) => {
    setAcceptingId(friendshipId);
    const res = await fetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action: "accept" }),
    });
    if (res.ok) {
      const accepted = pendingReceived.find((p) => p.friendshipId === friendshipId);
      setPendingReceived((prev) => prev.filter((p) => p.friendshipId !== friendshipId));
      if (accepted) setFriends((prev) => [{ ...accepted, status: "active" }, ...prev]);
    }
    setAcceptingId(null);
  };

  const handleCopyLink = () => {
    if (!personalLink) return;
    navigator.clipboard.writeText(personalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-300" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <header className="flex-none border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/groups")}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-sm font-semibold text-zinc-100">Friends</h1>
      </header>

      {hasContent ? (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3 space-y-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-left text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            >
              <Search size={16} className="flex-none" />
              Search by name
            </button>
            {personalLink && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex flex-1 items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-left hover:bg-zinc-900 transition-colors"
                >
                  <span className="text-xs text-zinc-500 truncate">{personalLink}</span>
                  {copied ? <Check size={14} className="flex-none text-emerald-400" /> : <Copy size={14} className="flex-none text-zinc-600" />}
                </button>
                <button
                  onClick={() => setQrOpen(true)}
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
                >
                  <QrCode size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="px-4 py-3 space-y-6">
            {pendingReceived.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Requests</h2>
                {pendingReceived.map((req) => (
                  <div key={req.friendshipId} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <Avatar name={req.user.display_name || req.user.email} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{req.user.display_name || req.user.email}</p>
                    </div>
                    <button
                      onClick={() => handleAccept(req.friendshipId)}
                      disabled={acceptingId === req.friendshipId}
                      className="rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
                    >
                      {acceptingId === req.friendshipId ? <Loader2 size={12} className="animate-spin" /> : "Accept"}
                    </button>
                  </div>
                ))}
              </section>
            )}

            {pendingSent.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Sent</h2>
                {pendingSent.map((req) => (
                  <div key={req.friendshipId} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <Avatar name={req.user.display_name || req.user.email} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{req.user.display_name || req.user.email}</p>
                      <p className="text-xs text-zinc-500">Pending</p>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {friends.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Friends</h2>
                {friends.map((f) => (
                  <div key={f.friendshipId} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <Avatar name={f.user.display_name || f.user.email} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{f.user.display_name || f.user.email}</p>
                      <p className="text-xs text-zinc-500">connected {formatRelativeTime(f.acceptedAt || f.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <UserPlus size={32} className="text-zinc-700 mb-4" />
          <p className="text-sm font-medium text-zinc-200">Add friends</p>
          <p className="text-xs text-zinc-500 mt-1.5 max-w-[240px]">
            Find someone already on huuman, or share your link to invite them
          </p>

          <button
            onClick={() => setSearchOpen(true)}
            className="mt-6 w-full max-w-[260px] flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white transition-colors"
          >
            <Search size={16} />
            Search by name
          </button>

          {personalLink && (
            <div className="mt-4 w-full max-w-[260px] space-y-2">
              <button
                onClick={handleCopyLink}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-left hover:bg-zinc-800/80 transition-colors"
              >
                <span className="text-xs text-zinc-400 truncate">{personalLink}</span>
                {copied ? <Check size={14} className="flex-none text-emerald-400" /> : <Copy size={14} className="flex-none text-zinc-500" />}
              </button>
              <button
                onClick={() => setQrOpen(true)}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Show QR code
              </button>
            </div>
          )}
        </div>
      )}

      {qrOpen && <QrModal link={`https://${personalLink}`} onClose={() => setQrOpen(false)} />}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  );
}

function QrModal({ link, onClose }: { link: string; onClose: () => void }) {
  const QRCode = useQRCode();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
          <X size={16} />
        </button>
        <h2 className="text-sm font-semibold text-zinc-100 mb-6">Your QR code</h2>
        <div className="flex flex-col items-center gap-4">
          {QRCode ? (
            <div className="rounded-xl bg-white p-4"><QRCode value={link} size={200} /></div>
          ) : (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-8 text-center">
              <p className="text-sm text-zinc-300 break-all">{link}</p>
            </div>
          )}
          <p className="text-xs text-zinc-500">{link}</p>
        </div>
      </div>
    </div>
  );
}

function useQRCode() {
  const [QR, setQR] = useState<React.ComponentType<{ value: string; size: number }> | null>(null);
  useEffect(() => { import("qrcode.react").then((mod) => setQR(() => mod.QRCodeSVG)).catch(() => {}); }, []);
  return QR;
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`);
      if (res.ok) { const data = await res.json(); setResults(data.users ?? []); }
      setSearching(false);
    }, 300);
  }, []);

  const handleConnect = async (userId: string) => {
    setSendingTo(userId);
    const res = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientId: userId }) });
    if (res.ok || res.status === 409) setSentIds((prev) => new Set(prev).add(userId));
    setSendingTo(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-sm">
      <header className="flex-none border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">
          <X size={16} />
        </button>
        <h1 className="text-sm font-semibold text-zinc-100">Search for friends</h1>
      </header>
      <div className="px-4 pt-4">
        <input ref={inputRef} type="text" value={query} onChange={(e) => { setQuery(e.target.value); search(e.target.value); }} placeholder="Search by name..." className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {searching && <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-zinc-500" /></div>}
        {!searching && query && results.length === 0 && <p className="text-center text-sm text-zinc-500 py-8">No users found</p>}
        {results.map((user) => (
          <div key={user.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <Avatar name={user.display_name || user.username || "?"} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-200 truncate">{user.display_name || user.username}</p>
            </div>
            {sentIds.has(user.id) ? (
              <span className="text-xs text-zinc-500">Sent</span>
            ) : (
              <button onClick={() => handleConnect(user.id)} disabled={sendingTo === user.id} className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-50">
                {sendingTo === user.id ? <Loader2 size={12} className="animate-spin" /> : <><UserPlus size={12} /> Connect</>}
              </button>
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
