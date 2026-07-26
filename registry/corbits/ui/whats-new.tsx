"use client";

import { X } from "lucide-react";

import { cn } from "@/registry/corbits/lib/utils";
import { Badge } from "@/registry/corbits/ui/badge";
import { Button } from "@/registry/corbits/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/registry/corbits/ui/dialog";
import { EmptyState } from "@/registry/corbits/ui/empty-state";

export type ReleaseNote = {
  readonly id: string;
  readonly title: string;
  /** ISO date. Rendered as a plain date — a release is not "3 minutes ago". */
  readonly date: string;
  readonly body: string;
  /** "New", "Fixed", "Improved". Free text; shown verbatim. */
  readonly tag?: string;
};

/**
 * What changed, in three shapes: a list you can put anywhere, a dialog the user
 * asked for, and a popup that asks for them.
 *
 * One file because they render the same notes and differ only in framing. Three
 * files would be three copies of the entry markup drifting apart, which is how
 * the popup ends up showing a date the dialog does not.
 */

function NoteList({ notes }: { notes: readonly ReleaseNote[] }) {
  if (notes.length === 0) {
    return <EmptyState title="Nothing new" description="Changes show up here as they ship." />;
  }

  return (
    <ul className="flex flex-col gap-5">
      {notes.map((note) => (
        <li key={note.id} className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {note.tag === undefined ? null : <Badge tone="accent">{note.tag}</Badge>}
            <h4 className="text-sm font-semibold">{note.title}</h4>
            <time dateTime={note.date} className="ml-auto shrink-0 text-xs text-muted-foreground">
              {new Date(note.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </time>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{note.body}</p>
        </li>
      ))}
    </ul>
  );
}

/** The notes inline — a settings page, a help panel, a changelog route. */
export function WhatsNewSection({ notes, className }: { notes: readonly ReleaseNote[]; className?: string }) {
  return (
    <div data-slot="whats-new-section" className={className}>
      <NoteList notes={notes} />
    </div>
  );
}

/** The notes as a dialog, opened deliberately from a menu or a button. */
export function WhatsNewDialog({
  open,
  onOpenChange,
  notes,
  title = "What's new",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: readonly ReleaseNote[];
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <NoteList notes={notes} />
      </DialogContent>
    </Dialog>
  );
}

/**
 * An unsolicited nudge, bottom-right.
 *
 * `role="complementary"`, never a dialog: the user did not ask for this, and
 * trapping their focus in something they did not open is hostile. It is
 * dismissible and nothing else on the page changes behaviour while it is up.
 *
 * `onDismiss` is required. A notice that appears on its own and cannot be sent
 * away is the worst version of this pattern, and the host needs the signal
 * anyway to stop showing it.
 */
export function WhatsNewPopup({
  open,
  notes,
  onDismiss,
  onSeeAll,
  title = "What's new",
  className,
}: {
  open: boolean;
  notes: readonly ReleaseNote[];
  onDismiss: () => void;
  onSeeAll?: () => void;
  title?: string;
  className?: string;
}) {
  if (!open || notes.length === 0) return null;

  return (
    <aside
      role="complementary"
      aria-label={title}
      className={cn(
        "fixed right-6 bottom-6 z-40 flex w-[min(22rem,calc(100vw-3rem))] flex-col gap-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-xl",
        "[animation:corbits-fade-in_200ms_ease-out]",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <h3 className="flex-1 text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Dismiss ${title}`}
          className="grid size-6 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      {/* Only the most recent note: a popup nobody asked for gets one thing to
          say, and the dialog is where the rest lives. */}
      <NoteList notes={notes.slice(0, 1)} />

      {onSeeAll === undefined ? null : (
        <Button variant="outline" size="sm" onClick={onSeeAll}>
          See everything
        </Button>
      )}
    </aside>
  );
}
