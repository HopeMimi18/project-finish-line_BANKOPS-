import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface Result {
  total_rows: number;
  verified_rows: number;
  first_break_id: string | null;
  first_break_at: string | null;
  intact: boolean;
}

export const AuditChainVerifier = () => {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const verify = async () => {
    setBusy(true);
    setResult(null);
    // @ts-expect-error - rpc function exists in DB but not in generated types yet
    const { data, error } = await supabase.rpc("verify_audit_chain");
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const row = Array.isArray(data) ? (data[0] as Result) : (data as Result);
    setResult(row);
    if (row?.intact) toast.success(`Chain intact across ${row.total_rows} events`);
    else toast.error("Chain broken — see details");
  };

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Fingerprint className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Tamper-evident audit chain</div>
            <div className="text-xs text-muted-foreground">
              SHA-256 hash chain across all audit events. Any altered or deleted row breaks the chain.
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={verify} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-2 h-3.5 w-3.5" />}
          Verify chain
        </Button>
      </div>

      {result && (
        <div className={`mt-4 rounded-lg border p-3 text-xs ${result.intact ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}>
          <div className="flex items-center gap-2">
            {result.intact ? (
              <ShieldCheck className="h-4 w-4 text-success" />
            ) : (
              <ShieldAlert className="h-4 w-4 text-destructive" />
            )}
            <span className={`font-semibold ${result.intact ? "text-success" : "text-destructive"}`}>
              {result.intact ? "Chain intact" : "Chain compromised"}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 mono">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Total events</div>
              <div className="text-foreground">{result.total_rows}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Verified</div>
              <div className="text-foreground">{result.verified_rows}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">First break</div>
              <div className="text-foreground">
                {result.first_break_at
                  ? new Date(result.first_break_at).toLocaleString()
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};