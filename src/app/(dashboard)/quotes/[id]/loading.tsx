import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-4 w-[200px]" />
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}
