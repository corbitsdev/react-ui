import { ChevronRight } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils.js";

/**
 * The row above the page. It owns no content of its own — a title or a
 * breadcrumb trail on the left, whatever the page contributes on the right.
 *
 * Deliberately a `<header>` with parts rather than a `title`/`actions` prop
 * pair: pages need a search box, a filter row or a context strip in that space,
 * and a fixed prop list would push every one of them through a `ReactNode` prop
 * that does the same job as a child.
 */
export function TopBar({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="top-bar"
      className={cn("flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2", className)}
      {...props}
    />
  );
}

export function TopBarTitle({
  count,
  subtitle,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { count?: number; subtitle?: string }) {
  return (
    <div data-slot="top-bar-title" className={cn("flex min-w-0 shrink items-center gap-2", className)} {...props}>
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-base font-semibold tracking-tight">{children}</h1>
        {subtitle === undefined ? null : <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {count === undefined ? null : (
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

export type Crumb = {
  readonly label: string;
  /** Omit on the last crumb — the current page is not a link. */
  readonly href?: string;
};

/**
 * Props a breadcrumb link receives, whether it renders as a plain `<a>` or a
 * caller-supplied component. Only non-last crumbs render through this — see
 * `TopBarBreadcrumbs` for why the last crumb is never a link.
 */
export type BreadcrumbLinkProps = {
  readonly href: string;
  readonly children: React.ReactNode;
};

function DefaultBreadcrumbLink({ href, children }: BreadcrumbLinkProps) {
  return (
    <a href={href} className="truncate text-muted-foreground hover:text-foreground">
      {children}
    </a>
  );
}

/**
 * Breadcrumb trail. The last crumb is the current page: it is rendered as text
 * with `aria-current="page"` even if a caller passes an href, because linking
 * to where you already are is a known screen-reader annoyance.
 *
 * Every other crumb renders through `linkComponent`, defaulting to a plain
 * `<a>`. A consumer routing through a SPA router passes its own `Link` so a
 * breadcrumb click does not force a full page reload.
 */
export function TopBarBreadcrumbs({
  crumbs,
  linkComponent: LinkComponent = DefaultBreadcrumbLink,
  className,
  ...props
}: Omit<React.ComponentProps<"nav">, "children"> & {
  crumbs: readonly Crumb[];
  linkComponent?: React.ComponentType<BreadcrumbLinkProps>;
}) {
  return (
    <nav data-slot="top-bar-breadcrumbs" aria-label="Breadcrumb" className={cn("min-w-0", className)} {...props}>
      <ol className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          return (
            <li key={crumb.label} className="flex min-w-0 items-center gap-1">
              {index === 0 ? null : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              )}
              {isLast || crumb.href === undefined ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn("truncate", isLast ? "font-medium" : "text-muted-foreground")}
                >
                  {crumb.label}
                </span>
              ) : (
                <LinkComponent href={crumb.href}>{crumb.label}</LinkComponent>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Trailing controls. Pushes itself to the right; put it last. */
export function TopBarActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="top-bar-actions"
      className={cn("ml-auto flex shrink-0 items-center gap-1", className)}
      {...props}
    />
  );
}
