import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const SHORTCUTS: { keys: string[]; label: string; path?: string }[] = [
  { keys: ["g", "d"], label: "Go to Dashboard", path: "/dashboard" },
  { keys: ["g", "u"], label: "Go to Upload", path: "/upload" },
  { keys: ["g", "t"], label: "Go to Tokens", path: "/tokens" },
  { keys: ["g", "a"], label: "Go to AI Assist", path: "/assist" },
  { keys: ["g", "l"], label: "Go to Audit Log", path: "/audit" },
  { keys: ["g", "h"], label: "Go to How it works", path: "/how-it-works" },
  { keys: ["?"], label: "Open this shortcuts cheatsheet" },
  { keys: ["Esc"], label: "Close dialogs" },
];

/** Floating, app-wide shortcut listener + cheatsheet. Mount once near root. */
export const ShortcutsDialog = () => {
  const [open, setOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable;
      if (editable) return;

      // "?" opens cheatsheet
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        setPendingG(false);
        return;
      }

      // "g" then a letter for navigation
      if (pendingG) {
        const map: Record<string, string> = {
          d: "/dashboard",
          u: "/upload",
          t: "/tokens",
          a: "/assist",
          l: "/audit",
          h: "/how-it-works",
        };
        const dest = map[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          navigate(dest);
        }
        setPendingG(false);
        return;
      }
      if (e.key.toLowerCase() === "g") {
        setPendingG(true);
        // auto-cancel after 1.2s
        setTimeout(() => setPendingG(false), 1200);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingG, navigate]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Press <Kbd>?</Kbd> anytime to toggle this cheatsheet.
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-border/60">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && (
                      <span className="text-[10px] text-muted-foreground">then</span>
                    )}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd className="mono inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11px] font-medium text-foreground shadow-sm">
    {children}
  </kbd>
);