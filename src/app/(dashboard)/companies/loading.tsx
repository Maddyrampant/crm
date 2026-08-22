import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-4 w-[250px]" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-[180px]" />
            <Skeleton className="h-4 w-[140px]" />
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-5 w-[60px] rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
