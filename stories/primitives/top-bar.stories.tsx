import type { BreadcrumbLinkProps } from "../../src/ui/top-bar.js";
import { TopBar, TopBarActions, TopBarBreadcrumbs, TopBarTitle } from "../../src/ui/top-bar.js";
import { Button } from "../../src/ui/button.js";

export default { title: "Primitives / TopBar" };

const crumbs = [
  { label: "Workspace", href: "/workspace" },
  { label: "Bench: Growth", href: "/workspace/growth" },
  { label: "Thread 42" },
];

export const TitleAndActions = () => (
  <TopBar>
    <TopBarTitle count={12} subtitle="Updated 2 minutes ago">
      Growth bench
    </TopBarTitle>
    <TopBarActions>
      <Button size="sm" variant="outline">
        Share
      </Button>
    </TopBarActions>
  </TopBar>
);

export const Breadcrumbs = () => (
  <TopBar>
    <TopBarBreadcrumbs crumbs={crumbs} />
  </TopBar>
);

/**
 * Injects a fake SPA router `Link` in place of the default `<a>` so a
 * breadcrumb click never forces a full page reload — the shape a consumer
 * on React Router, Next.js `Link`, or any other client router passes in.
 */
function SpaLink({ href, children }: BreadcrumbLinkProps) {
  return (
    <button
      type="button"
      className="truncate text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      data-spa-navigate={href}
      onClick={() => console.log(`client-side navigate to ${href}`)}
    >
      {children}
    </button>
  );
}

export const BreadcrumbsWithInjectedLink = () => (
  <TopBar>
    <TopBarBreadcrumbs crumbs={crumbs} linkComponent={SpaLink} />
  </TopBar>
);
