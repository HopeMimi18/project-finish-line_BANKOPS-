import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { writeAuditEvent } from "@/lib/security";

export const BreakGlassToggle = () => {
  const { isManagerOrAdmin } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "break_glass")
      .maybeSingle();
    setEnabled(!!(data?.value as any)?.enabled);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!isManagerOrAdmin) return null;

  const toggle = async (next: boolean) => {
    if (next && !confirm("Enable break-glass mode? This freezes ALL token issuance, AI calls, and downloads workspace-wide.")) return;
    setBusy(true);
    const { error } = await supabase
      .from("system_settings")
      .update({ value: { enabled: next }, updated_at: new Date().toISOString() })
      .eq("key", "break_glass");
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setEnabled(next);
    toast.success(next ? "Break-glass ENABLED — workspace frozen" : "Break-glass disabled");
    await writeAuditEvent({ action: next ? "breakglass.enable" : "breakglass.disable", meta: {} });
  };

  return (
    <div className="surface-card p-4 flex items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className={`rounded-md p-2 ${enabled ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>
          <ShieldOff className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">Break-glass mode</h3>
          <p className="text-xs text-muted-foreground max-w-md">
            Emergency freeze. Blocks token issuance, AI calls, and downloads workspace-wide while incident response is underway.
          </p>
        </div>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Switch checked={enabled} disabled={busy} onCheckedChange={toggle} />
      )}
    </div>
  );
};
