/**
 * The dock's one source of truth for motion timing. Every duration that has
 * to line up with another — the entrance pop, the scrim fade, the autofocus
 * delay — lives here so fixing one never means hunting the others down.
 */

/** How long the closed→docked entrance pop takes, in milliseconds. */
export const CHAT_DOCK_ENTRANCE_MS = 280;

/** The scrim's own fade, coordinated to finish alongside the entrance. */
export const CHAT_DOCK_SCRIM_MS = CHAT_DOCK_ENTRANCE_MS;

/**
 * The composer's autofocus delay. Must be `>=` the entrance duration — focus
 * landing before the panel has finished animating steals the caret out from
 * under a still-moving element.
 */
export const CHAT_DOCK_AUTOFOCUS_DELAY_MS = CHAT_DOCK_ENTRANCE_MS;
