import { Toaster as Sonner, toast } from "sonner";

/**
 * Mount once at the app root. Sonner renders in a portal outside the Tailwind
 * tree, so the Corbits tokens are handed to it as inline CSS variables rather
 * than utility classes.
 */
export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      className="font-sans"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--success)",
          "--success-text": "var(--success-foreground)",
          "--error-bg": "var(--destructive)",
          "--error-text": "var(--destructive-foreground)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { toast };
