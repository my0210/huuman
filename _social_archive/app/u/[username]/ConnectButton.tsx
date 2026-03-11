"use client";

import { useState } from "react";
import { UserPlus, Check, Loader2 } from "lucide-react";

export function ConnectButton({ recipientId }: { recipientId: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "exists">("idle");

  const handleConnect = async () => {
    setStatus("sending");
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId }),
    });

    if (res.ok) {
      setStatus("sent");
    } else if (res.status === 409) {
      setStatus("exists");
    } else {
      setStatus("idle");
    }
  };

  if (status === "sent") {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-6 py-3 text-sm text-zinc-300">
        <Check size={16} className="text-emerald-400" />
        Request sent
      </div>
    );
  }

  if (status === "exists") {
    return (
      <p className="text-sm text-zinc-400">Already connected</p>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={status === "sending"}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-white transition-colors disabled:opacity-50"
    >
      {status === "sending" ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <>
          <UserPlus size={16} />
          Connect
        </>
      )}
    </button>
  );
}
