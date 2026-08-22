import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-[150px]" />
          <Skeleton className="h-4 w-[250px]" />
        </div>
        <Skeleton className="h-9 w-[100px]" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} className="space-y-3">
            <Skeleton className="h-6 w-[120px]" />
            {Array.from({ length: 3 }).map((_, card) => (
              <div key={card} className="space-y-2 rounded-lg border p-4">
                <Skeleton className="h-4 w-[160px]" />
                <Skeleton className="h-3 w-[100px]" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-[60px] rounded-full" />
                  <Skeleton className="h-4 w-[80px]" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
