import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Database, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const SeedDemoDataButton = () => {
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const seed = async () => {
    if (!confirm("Seed demo data into this workspace? This adds sample clients, documents, tokens and audit events.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("seed-demo-data", {
      method: "POST",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const s = (data as { summary?: Record<string, number> })?.summary ?? {};
    toast.success(
      `Seeded · ${s.clients_created ?? 0} clients · ${s.documents_created ?? 0} docs · ${s.tokens_created ?? 0} tokens · ${s.audit_events_created ?? 0} events`,
    );
    qc.invalidateQueries();
  };

  return (
    <div className="surface-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20 text-accent">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold">Demo data seeder</div>
            <div className="text-xs text-muted-foreground">
              Populates the workspace with realistic sample data — perfect before a live demo.
            </div>
          </div>
        </div>
        <Button size="sm" onClick={seed} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Database className="mr-2 h-3.5 w-3.5" />}
          Seed demo data
        </Button>
      </div>
    </div>
  );
};