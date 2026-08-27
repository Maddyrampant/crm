import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col p-6">
      <Skeleton className="h-8 w-[180px]" />
      <div className="mt-4 flex-1 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-10 w-[60%]" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-12 w-full" />
    </div>
  );
}
