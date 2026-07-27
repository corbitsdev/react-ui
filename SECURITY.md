# Security policy

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Report it privately through GitHub's private vulnerability reporting on this
repository: **Security → Report a vulnerability**. That opens a channel visible
only to the maintainers.

Useful things to include: which component and which package version, what an
attacker can do, and the smallest reproduction you can manage. If you have a
suggested fix, say so — but a clear report without one is still worth sending.

We aim to acknowledge a report within a few working days, and to keep you posted
while it is being worked on. Please give us a reasonable window to ship a fix
before disclosing publicly.

## Supported versions

This package has not reached a stable release. Fixes land on `main` and ship in the
next release from the latest version; there are no maintained release branches, and
patches are not backported to earlier 0.x versions.

## What is in scope

Defects in the components this package ships:

- a component that renders untrusted input in a way that executes it —
  `dangerouslySetInnerHTML` on caller-supplied content, an `href` that accepts a
  `javascript:` URL, a `src` or `srcDoc` an attacker controls;
- a component that leaks data across a boundary the API establishes — a stale
  `DataPort` cache key that lets one tenant's rows render under another's request,
  or an error surface that renders a raw server response including tokens or
  internal identifiers;
- a component that defeats a security affordance a consumer would reasonably assume:
  an overlay that does not trap focus while modal, a confirm step that can be
  bypassed, `rel="noopener"` missing from a `target="_blank"` link;
- credentials, tokens, internal hostnames or real data in a shipped file or a
  fixture;
- a declared dependency the package does not actually need, an undeclared one it
   does, or anything that runs at install time — the package has no install scripts,
   and adding one would be a supply-chain change.

## What is not

- **Authentication and authorization.** This package ships no auth. The `login` and
  `access-notice` blocks are *presentation*: they render a form and a message. What
  a submission does, whether a session is valid, and who may see a route are the
  host's, and a host that trusts a client-side check owns that decision.
- **Fetching, caching and transport.** Components never fetch. A `DataPort`
  implementation is the consumer's wiring, including the `request` objects handed to
  `createTanstackDataPort()`. A port that sends a request without
  credentials scoping, over plain HTTP, or with a cache key that ignores the tenant
  is theirs to fix.
- **Sanitisation of data you supply.** A component that renders a string renders the
  string you give it. Sanitise before it reaches the component.
- **A patched or vendored copy.** A vulnerability introduced by an edit to the
  installed files is not a defect here, though we would still like to hear if our
  structure invited it.
- Vulnerabilities in dependencies should be reported upstream, though we are glad to
  hear about them.
