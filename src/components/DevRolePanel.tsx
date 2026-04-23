import { useState } from "react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Beaker, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";

const ALL_ROLES: AppRole[] = ["support", "ops", "compliance", "manager", "admin"];

const PRESETS: { label: string; roles: AppRole[] }[] = [
  { label: "Admin only", roles: ["admin"] },
  { label: "Manager only", roles: ["manager"] },
  { label: "Compliance", roles: ["compliance"] },
  { label: "Ops", roles: ["ops"] },
  { label: "Support", roles: ["support"] },
  { label: "No role", roles: [] },
];

interface Props {
  variant?: "floating" | "card";
}

export const DevRolePanel = ({ variant = "floating" }: Props) => {
  const {
    user,
    realRoles,
    roles,
    impersonatedRoles,
    setImpersonatedRoles,
    isImpersonating,
  } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const draft = impersonatedRoles ?? realRoles;

  const toggle = (r: AppRole) => {
    const next = draft.includes(r)
      ? draft.filter((x) => x !== r)
      : [...draft, r];
    setImpersonatedRoles(next);
  };

  const applyPreset = (preset: AppRole[]) => {
    setImpersonatedRoles(preset);
    toast.success(
      preset.length
        ? `Viewing UI as: ${preset.join(", ")}`
        : "Viewing UI with no roles",
    );
  };

  const reset = () => {
    setImpersonatedRoles(null);
    toast.success("Restored real roles");
  };

  const Body = (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Real role (DB)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {realRoles.length === 0 && (
            <span className="badge-dot bg-muted text-muted-foreground">none</span>
          )}
          {realRoles.map((r) => (
            <span
              key={r}
              className="badge-dot bg-secondary text-secondary-foreground capitalize"
            >
              {r}
            </span>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
          Effective (UI sees)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {roles.length === 0 && (
            <span className="badge-dot bg-muted text-muted-foreground">none</span>
          )}
          {roles.map((r) => (
            <span
              key={r}
              className={`badge-dot capitalize ${
                isImpersonating
                  ? "bg-accent/20 text-accent"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {r}
            </span>
          ))}
        </div>
        {isImpersonating && (
          <div className="mt-2 text-[11px] text-accent">
            UI override active · DB writes still use your real role
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Toggle roles
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {ALL_ROLES.map((r) => (
            <label
              key={r}
              className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-sm hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={draft.includes(r)}
                onCheckedChange={() => toggle(r)}
              />
              <span className="capitalize">{r}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Presets
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => applyPreset(p.roles)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <Button
        size="sm"
        variant={isImpersonating ? "default" : "ghost"}
        className="w-full"
        onClick={reset}
        disabled={!isImpersonating}
      >
        <RotateCcw className="mr-2 h-3.5 w-3.5" />
        Reset to real role
      </Button>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        UI-only impersonation: sidebar links, page guards and badges react to
        the effective role. Database (RLS) still enforces your real role —
        privileged DB actions will still fail if you lack permission.
      </p>
    </div>
  );

  if (variant === "card") {
    return (
      <div className="surface-card p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Role impersonation (dev)</div>
            <div className="text-xs text-muted-foreground">
              Preview the UI as any role without signing out.
            </div>
          </div>
        </div>
        {Body}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant={isImpersonating ? "default" : "secondary"}
          className="fixed bottom-4 right-4 z-50 shadow-lg"
        >
          <Beaker className="mr-2 h-3.5 w-3.5" />
          {isImpersonating ? `As: ${roles.join(", ") || "no role"}` : "Dev · Roles"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-80">
        {Body}
      </PopoverContent>
    </Popover>
  );
};
