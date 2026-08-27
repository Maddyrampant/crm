import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-[120px]" />
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  );
}
