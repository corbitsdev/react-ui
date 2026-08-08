import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Hooks under test touch real DOM APIs (window, document, focus, rects) —
// registering happy-dom's globals once, before any test file loads, is
// cheaper than mocking each API per test.
GlobalRegistrator.register();

// Tells React it's safe to batch effects inside `act(...)` outside of a
// recognized test runner (bun:test isn't one of the ones React detects).
declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
