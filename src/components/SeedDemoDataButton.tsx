import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Database, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const SeedDemoDataButton = () => {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const seed = async () => {
    setBusy(true);
    setOpen(false);
    try {
      const { data, error } = await supabase.functions.invoke("seed-demo-data", {
        method: "POST",
      });
      if (error) {
        console.error("seed-demo-data error", error);
        toast.error(`Seed failed: ${error.message}`);
        return;
      }
      const payload = data as
        | { ok?: boolean; error?: string; summary?: Record<string, number> }
        | null;
      if (payload?.error) {
        toast.error(`Seed failed: ${payload.error}`);
        return;
      }
      const s = payload?.summary ?? {};
      toast.success(
        `Seeded · ${s.clients_created ?? 0} clients · ${s.documents_created ?? 0} docs · ${s.tokens_created ?? 0} tokens · ${s.audit_events_created ?? 0} events`,
      );
      qc.invalidateQueries();
    } catch (e) {
      console.error("seed-demo-data threw", e);
      toast.error(`Seed failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
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
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button size="sm" disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Database className="mr-2 h-3.5 w-3.5" />}
              Seed demo data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Seed demo data?</AlertDialogTitle>
              <AlertDialogDescription>
                Adds sample clients (ACME, Blue River), 5 documents, 3 tokens and ~11 audit events
                to this workspace. Safe to run multiple times — duplicates are skipped where possible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={seed}>Seed now</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};