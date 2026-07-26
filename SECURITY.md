# Security policy

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Report it privately through GitHub's private vulnerability reporting on this
repository: **Security → Report a vulnerability**. That opens a channel visible
only to the maintainers.

Useful things to include: which registry item and which revision you copied, what an
attacker can do, and the smallest reproduction you can manage. If you have a
suggested fix, say so — but a clear report without one is still worth sending.

We aim to acknowledge a report within a few working days, and to keep you posted
while it is being worked on. Please give us a reasonable window to ship a fix
before disclosing publicly.

## Supported versions

This registry has not reached a stable release. Fixes land on `main` and are picked up
by the next `shadcn add`; there are no maintained release branches.

Note what that means, because it is unusual: this is a **source registry**, so a
component is copied into your repository and owned by you from that moment. There is
no `node_modules` copy for us to patch and no version bump that reaches an
already-copied file. When a fix ships here, applying it is a diff you take — which is
why an advisory will name the item and the change rather than only a version.

## What is in scope

Defects in the source this registry distributes:

- an item that renders untrusted input in a way that executes it —
  `dangerouslySetInnerHTML` on caller-supplied content, an `href` that accepts a
  `javascript:` URL, a `src` or `srcDoc` an attacker controls;
- an item that leaks data across a boundary the API establishes — a stale
  `DataPort` cache key that lets one tenant's rows render under another's request,
  or an error surface that renders a raw server response including tokens or
  internal identifiers;
- an item that defeats a security affordance a consumer would reasonably assume:
  an overlay that does not trap focus while modal, a confirm step that can be
  bypassed, `rel="noopener"` missing from a `target="_blank"` link;
- credentials, tokens, internal hostnames or real data in a shipped file or a
  fixture;
- an item that declares a dependency it does not have, or fetches at install time —
  anything that makes `shadcn add` itself a supply-chain step.

## What is not

- **Authentication and authorization.** This registry ships no auth. The `login` and
  `access-notice` blocks are *presentation*: they render a form and a message. What
  a submission does, whether a session is valid, and who may see a route are the
  host's, and a host that trusts a client-side check owns that decision.
- **Fetching, caching and transport.** Components never fetch. A `DataPort`
  implementation is the consumer's code — including `createTanstackDataPort()` once
  it has been copied into their repository. A port that sends a request without
  credentials scoping, over plain HTTP, or with a cache key that ignores the tenant
  is theirs to fix.
- **Sanitisation of data you supply.** An item that renders a string renders the
  string you give it. Sanitise before it reaches the component.
- **A modified copy.** Once a file is in your repository it is your source. A
  vulnerability introduced by an edit is not a defect here, though we would still
  like to hear if our structure invited it.
- **The backend cores.** `@corbits/mailbox-core`, `@corbits/artifact-core` and
  `@corbits/analytics-core` have their own security policies in their own
  repositories. Nothing in this registry imports them.
- Vulnerabilities in dependencies should be reported upstream, though we are glad to
  hear about them.
