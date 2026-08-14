import { useState } from "react";

import { isSafeUrl } from "../lib/url.js";
import { Button } from "./button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog.js";
import { FileInput } from "./file-input.js";
import { Input } from "./input.js";
import { Tabs } from "./tabs.js";

/** What the user is adding. */
export type ArtifactSourceKind = "link" | "text" | "files";

export type ArtifactDraft =
  | { readonly source: "link"; readonly title: string; readonly url: string }
  | { readonly source: "text"; readonly title: string; readonly text: string }
  | { readonly source: "files"; readonly files: readonly File[] };

const MODES: readonly { readonly id: ArtifactSourceKind; readonly label: string }[] = [
  { id: "link", label: "Link" },
  { id: "text", label: "Paste text" },
  { id: "files", label: "Upload" },
];

export type AddArtifactDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /**
   * Persists the draft. Rejecting shows its message inline and keeps the dialog
   * open with the user's input intact — a submit failure that also discards
   * what they typed is the worst possible outcome of a form.
   */
  readonly onSubmit: (draft: ArtifactDraft) => Promise<void>;
};

/**
 * Add an artifact from a link, pasted text, or files.
 *
 * The modes are `<Tabs>` rather than three styled buttons that swap a form.
 * Those look identical and are announced as three unrelated buttons — the tab
 * pattern is what makes it "choose a source type" instead of "here are some
 * buttons", and it is already a component here, so it is not rebuilt inline.
 *
 * Submission is a promise the host owns. This component never learns what
 * storing an artifact means — it collects a `ArtifactDraft`, hands it over, and
 * renders whatever the rejection said. That is the whole seam.
 *
 * Validation happens on submit, not on change. Telling someone their URL is
 * invalid while they are still on the third character of it is noise.
 */
export function AddArtifactDialog({ open, onOpenChange, onSubmit }: AddArtifactDialogProps) {
  const [mode, setMode] = useState<ArtifactSourceKind>("link");
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<readonly File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setMode("link");
    setTitle("");
    setValue("");
    setFiles([]);
    setError(null);
  }

  function close(next: boolean) {
    if (saving) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function draft(): ArtifactDraft | string {
    if (mode === "files") {
      if (files.length === 0) return "Choose at least one file.";
      return { source: "files", files };
    }
    const trimmedTitle = title.trim();
    const trimmedValue = value.trim();
    if (trimmedTitle === "") return "Give the artifact a name.";
    if (trimmedValue === "") return mode === "link" ? "Enter a URL." : "Enter some text.";
    if (mode === "link") {
      if (!isSafeUrl(trimmedValue)) {
        return "That does not look like a URL.";
      }
      return { source: "link", title: trimmedTitle, url: trimmedValue };
    }
    return { source: "text", title: trimmedTitle, text: trimmedValue };
  }

  function submit() {
    const next = draft();
    if (typeof next === "string") {
      setError(next);
      return;
    }
    setError(null);
    setSaving(true);
    onSubmit(next)
      .then(() => {
        setSaving(false);
        reset();
        onOpenChange(false);
      })
      .catch((cause: unknown) => {
        setSaving(false);
        setError(cause instanceof Error ? cause.message : "Could not add that. Try again.");
      });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an artifact</DialogTitle>
          <DialogDescription>Link something, paste it, or upload it.</DialogDescription>
        </DialogHeader>

        <Tabs
          tabs={MODES}
          active={mode}
          label="Source"
          variant="enclosed"
          onChange={(next) => {
            setMode(next);
            setError(null);
          }}
        >
          {(activeMode) => (
            <div className="flex flex-col gap-3">
              {activeMode === "files" ? (
                <>
                  <FileInput multiple onFiles={(list) => setFiles(Array.from(list))} label="Choose files" />
                  {files.length === 0 ? null : (
                    <ul className="max-h-40 overflow-y-auto text-xs text-muted-foreground">
                      {files.map((file) => (
                        <li key={file.name} className="truncate">
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <>
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                    Name
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Name this artifact"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-medium text-muted-foreground">
                    {activeMode === "link" ? "URL" : "Text"}
                    {activeMode === "link" ? (
                      <Input
                        type="url"
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder="https://example.com/page"
                      />
                    ) : (
                      <textarea
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        rows={6}
                        placeholder="Paste the content to store"
                        className="resize-y rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground"
                      />
                    )}
                  </label>
                </>
              )}
            </div>
          )}
        </Tabs>

        {/* role="alert" so a failure that lands below the fold is still heard. */}
        {error === null ? null : (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => close(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
