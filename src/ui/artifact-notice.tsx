import { FileWarning, Loader2 } from "lucide-react";

import { EmptyState } from "./empty-state.js";

/**
 * The one place an artifact viewer says "there is nothing to draw here".
 *
 * It exists as its own file, above `EmptyState` rather than beside it, for one
 * reason: every kind renderer needs it, and `ArtifactBody` imports every kind
 * renderer. Putting it in `artifact-body.tsx` would make each renderer import
 * back into its own dispatcher — a cycle. One shared leaf breaks it.
 *
 * The distinction it encodes is the whole point. An empty payload on a *pending*
 * artifact means the producer has not finished writing; an empty payload on a
 * settled one means there is genuinely nothing. Same markup, opposite message,
 * and getting it backwards makes a working system look broken.
 */
export function ArtifactNotice({
  /** The producer is still writing. Changes the message, not the layout. */
  pending = false,
  /** Overrides the pending/empty wording — use for a specific failure. */
  message,
}: {
  readonly pending?: boolean;
  readonly message?: string;
}) {
  if (message !== undefined) {
    return <EmptyState icon={<FileWarning />} title="Nothing to preview" description={message} />;
  }
  if (pending) {
    return (
      <EmptyState
        icon={<Loader2 />}
        title="Still being produced"
        description="This artifact has no content yet — check back shortly."
      />
    );
  }
  return <EmptyState icon={<FileWarning />} title="No content" description="This artifact is empty." />;
}
