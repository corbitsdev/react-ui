"use client";

import { MessageCircle, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";

/**
 * The three ways a conversation can sit in a layout: a launcher button, a
 * floating panel, and a bar docked to the bottom of the shell.
 *
 * All three are frames. None of them owns open/closed state — the host does,
 * because whether opening the chat also closes a sidebar, or restores the last
 * thread, is an application decision and not a chat one.
 */

export function ChatLauncher({
  open,
  onToggle,
  unreadCount = 0,
  className,
}: {
  open: boolean;
  onToggle: () => void;
  unreadCount?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? "Close chat" : unreadCount > 0 ? `Open chat, ${unreadCount} unread` : "Open chat"}
      className={cn(
        "fixed right-6 bottom-6 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-colors hover:bg-primary-active",
        className,
      )}
    >
      {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
      {!open && unreadCount > 0 ? (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-destructive px-1 font-mono text-[11px] text-destructive-foreground"
        >
          {unreadCount}
        </span>
      ) : null}
    </button>
  );
}

/**
 * A panel floating above the page, anchored bottom-right.
 *
 * `role="complementary"` rather than `dialog`: it sits beside the app instead
 * of blocking it, the page stays usable behind it, and calling it a dialog
 * would promise a focus trap that would then fight the user every time they
 * clicked back into the page.
 */
export function FloatingChat({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <aside
      role="complementary"
      aria-label="Chat"
      className={cn(
        "fixed right-6 bottom-24 z-40 flex max-h-[min(38rem,calc(100vh-8rem))] w-[min(24rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-lg border border-border shadow-xl",
        "[animation:corbits-fade-in_150ms_ease-out]",
        className,
      )}
    >
      {children}
    </aside>
  );
}

/**
 * A bar docked to the bottom of the shell, spanning its width.
 *
 * The height is one expression so the spacer below cannot drift from the panel:
 * `DOCKED_CHAT_HEIGHT` is exported for exactly that, and the clamp degrades on a
 * short viewport instead of eating the screen.
 */
export const DOCKED_CHAT_HEIGHT = "min(clamp(22rem, 58vh, 47rem), calc(100vh - 12rem))";

export function DockedChat({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <aside
      role="complementary"
      aria-label="Chat"
      style={{ height: DOCKED_CHAT_HEIGHT }}
      className={cn(
        "fixed bottom-4 left-1/2 z-45 flex w-[min(72rem,calc(100vw-2rem))] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-border shadow-xl",
        "[animation:corbits-fade-in_150ms_ease-out]",
        className,
      )}
    >
      {children}
    </aside>
  );
}
