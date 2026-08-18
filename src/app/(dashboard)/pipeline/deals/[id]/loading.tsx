import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-[250px]" />
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-[80px]" />
            <Skeleton className="h-5 w-[60px] rounded-full" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-[60px]" />
            <Skeleton className="h-4 w-[120px]" />
          </div>
        </div>
      </div>
      <div className="rounded-lg border p-6 space-y-3">
        <Skeleton className="h-5 w-[120px]" />
        <div className="flex items-center gap-3 py-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px]" />
        </div>
      </div>
      <div className="rounded-lg border p-6 space-y-3">
        <Skeleton className="h-5 w-[120px]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-4 w-[180px]" />
            <Skeleton className="h-3 w-[100px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
