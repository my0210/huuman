export default function Loading() {
  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <header className="flex-none border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="h-6 w-20 bg-zinc-800 rounded animate-pulse" />
        <div className="h-8 w-8 bg-zinc-800 rounded-lg animate-pulse" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-2">
            <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-36 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex justify-end">
          <div className="h-10 w-32 bg-zinc-800 rounded-2xl animate-pulse" />
        </div>
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-2">
            <div className="h-4 w-52 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="flex-none border-t border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="flex-1 h-10 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-zinc-800 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
