import { Skeleton } from "../../src/ui/skeleton.js";

export default { title: "Primitives / Skeleton" };

export const Loading = () => (
  <div role="status" aria-label="Loading workflows" className="flex flex-col gap-2">
    <Skeleton className="h-4 w-48" />
    <Skeleton className="h-4 w-64" />
    <Skeleton className="h-4 w-40" />
  </div>
);

export const CardShape = () => (
  <div role="status" aria-label="Loading" className="flex items-center gap-3">
    <Skeleton className="size-10 rounded-full" />
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  </div>
);
