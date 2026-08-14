import { Toaster as Sonner, toast as sonnerToast } from "sonner";

const TOAST_DURATION_MS = 1800;

let activeId: string | null = null;
let sequence = 0;

/**
 * Show a short plain-text confirmation. One toast at a time: a new call
 * dismisses the current one and restarts the timer, so rapid mutations read
 * as a single status line rather than a growing stack. Each call takes a
 * fresh id — reusing one id would inherit the unmount sonner schedules while
 * a dismissed toast is still animating out, swallowing the new message.
 */
export function toast(message: string) {
  if (activeId !== null) sonnerToast.dismiss(activeId);
  sequence += 1;
  activeId = `corbits-toast-${sequence}`;
  sonnerToast(message, { id: activeId, duration: TOAST_DURATION_MS });
}

/**
 * Mount once at the app root. Sonner renders in a portal, so the toast is
 * styled here (unstyled + utility classes) instead of inheriting from a
 * surrounding component; its motion overrides live in theme.css under
 * `.corbits-toast`.
 */
export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      position="bottom-center"
      offset={{ bottom: "1.25rem" }}
      mobileOffset={{ bottom: "1.25rem" }}
      toastOptions={{
        unstyled: true,
        className:
          "corbits-toast border border-border-strong bg-card shadow-surface " +
          "px-[0.9rem] py-[0.55rem] font-sans text-[0.8rem] font-[550] text-foreground",
      }}
      {...props}
    />
  );
}
