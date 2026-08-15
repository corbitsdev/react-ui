/**
 * The canvas side's content/focus contract, generic over one content type —
 * this package renders whatever a consumer hands it through
 * `CanvasHostContent`, it never knows what a "profile card" or "artifact"
 * is. A host with more than one content family (say, profiles and
 * documents) picks its own discriminant and puts it in `kind`; from here
 * it's all one shape.
 *
 * These are pure transition functions, not a hook: `CanvasHost` itself
 * (`blocks/canvas-host/canvas-host.tsx`) owns no state of its own — it is
 * `content`/`focus` in as props, `onFocusChange`/`onClose` out as
 * callbacks. A host wires these transitions into whatever state container
 * it already uses (`useState`, a reducer, a store) rather than this package
 * prescribing one.
 */
export type CanvasHostContent<TData = unknown> = {
  readonly kind: string;
  readonly title: string;
  readonly data: TData;
};

export type CanvasHostState<TData = unknown> = {
  readonly content: CanvasHostContent<TData> | null;
  readonly focus: boolean;
};

export function initialCanvasHostState<TData = unknown>(): CanvasHostState<TData> {
  return { content: null, focus: false };
}

/**
 * Open (or replace) the canvas's content. Focus is left exactly as it was —
 * swapping to a second piece of content while already focused stays
 * focused, since the reader was already reading the canvas full-width.
 */
export function openCanvasContent<TData>(
  state: CanvasHostState<TData>,
  content: CanvasHostContent<TData>,
): CanvasHostState<TData> {
  return { ...state, content };
}

/** Close the canvas outright: content and focus both clear, since there is nothing left to focus on. */
export function closeCanvas<TData>(state: CanvasHostState<TData>): CanvasHostState<TData> {
  return { ...state, content: null, focus: false };
}

export function focusCanvas<TData>(state: CanvasHostState<TData>): CanvasHostState<TData> {
  return { ...state, focus: true };
}

/** Exit focus without closing the canvas — it settles back to the even split. */
export function unfocusCanvas<TData>(state: CanvasHostState<TData>): CanvasHostState<TData> {
  return { ...state, focus: false };
}

/** Toggles between the even split and canvas-dominant focus. A no-op with nothing open — there is no content to read full-screen. */
export function toggleCanvasFocus<TData>(state: CanvasHostState<TData>): CanvasHostState<TData> {
  if (state.content === null) return state;
  return state.focus ? unfocusCanvas(state) : focusCanvas(state);
}
