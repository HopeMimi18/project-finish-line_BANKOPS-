import { Skeleton } from "@/components/ui/skeleton";

/** Generic table-row / list-row skeleton for loading states. */
export const RowSkeleton = ({
  rows = 4,
  cols = 1,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: rows }).map((_, r) => (
      <div
        key={r}
        className="flex items-center gap-3 rounded-lg border border-border/60 bg-surface/40 p-3"
      >
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-2/3" />
          {cols > 1 && <Skeleton className="h-3 w-1/3" />}
        </div>
      </div>
    ))}
  </div>
);

export const TableRowSkeleton = ({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} className="border-t border-border/60">
        {Array.from({ length: cols }).map((_, c) => (
          <td key={c} className="px-4 py-3">
            <Skeleton className="h-3.5 w-full max-w-[160px]" />
          </td>
        ))}
      </tr>
    ))}
  </>
);