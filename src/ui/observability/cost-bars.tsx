import { formatCost } from "./format.js";

export type CostBarRow = {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly detail: string;
};

export function CostBars({
  title,
  description,
  rows,
}: {
  readonly title: string;
  readonly description: string;
  readonly rows: readonly CostBarRow[];
}) {
  const max = Math.max(0.0001, ...rows.map((row) => row.value));
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.key}
            className="grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-3"
          >
            <div className="min-w-0">
              <p className="truncate font-mono text-xs">{row.label}</p>
              <div className="mt-1 h-2 rounded-sm bg-muted">
                <div
                  className="h-full rounded-sm bg-foreground/70"
                  style={{ width: `${(row.value / max) * 100}%` }}
                />
              </div>
            </div>
            <p className="text-right font-mono text-xs">
              {formatCost(row.value)}
              <span className="block text-muted-foreground">{row.detail}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
