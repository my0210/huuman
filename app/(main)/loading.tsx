import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-1 min-h-0 flex-col bg-surface-base">
      <header className="flex-none border-b border-border-subtle px-4 py-3 flex items-center justify-between safe-top">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
        <div className="flex justify-start">
          <div className="max-w-[70%] space-y-2">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      <div className="flex-none border-t border-border-subtle px-4 pt-3 safe-bottom">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10 rounded-radius-md" />
          <Skeleton className="flex-1 h-10 rounded-radius-md" />
          <Skeleton className="h-10 w-10 rounded-radius-md" />
          <Skeleton className="h-10 w-10 rounded-radius-md" />
        </div>
      </div>
    </div>
  );
}
