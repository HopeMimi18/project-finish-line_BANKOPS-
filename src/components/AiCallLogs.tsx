import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface Row {
  id: string;
  created_at: string;
  user_id: string | null;
  document_id: string | null;
  task: string;
  model: string | null;
  prompt_text: string;
  response_text: string | null;
  pii_findings: any;
  truncated: boolean;
  status: string;
}

export const AiCallLogs = () => {
  const [selected, setSelected] = useState<Row | null>(null);
  const q = useQuery({
    queryKey: ["ai_call_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_call_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Brain className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">AI Call Forensics</span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {q.data?.length ?? 0} sanitized prompt/response pairs
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-4 py-2.5 font-medium">Task</th>
              <th className="px-4 py-2.5 font-medium">PII</th>
              <th className="px-4 py-2.5 font-medium">Doc</th>
              <th className="px-4 py-2.5 font-medium w-20"></th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {q.data && q.data.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No AI calls logged yet.</td></tr>}
            {q.data?.map((r) => {
              const piiCount = Array.isArray(r.pii_findings)
                ? r.pii_findings.reduce((a: number, b: any) => a + (b.count ?? 0), 0)
                : 0;
              return (
                <tr key={r.id} className="border-t border-border/60 hover:bg-surface/60">
                  <td className="px-4 py-2.5 mono text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" })}
                  </td>
                  <td className="px-4 py-2.5"><span className="mono text-xs">{r.task}</span></td>
                  <td className="px-4 py-2.5">
                    {piiCount > 0 ? (
                      <span className="badge-dot bg-warning/15 text-warning border border-warning/30">{piiCount} redacted</span>
                    ) : <span className="text-xs text-muted-foreground">clean</span>}
                  </td>
                  <td className="px-4 py-2.5 mono text-[11px] text-muted-foreground">
                    {r.document_id?.slice(0, 8) ?? "—"}…
                  </td>
                  <td className="px-4 py-2.5">
                    <Button size="sm" variant="ghost" onClick={() => setSelected(r)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI call · {selected?.task}</DialogTitle>
            <DialogDescription className="mono text-xs">
              {selected && new Date(selected.created_at).toLocaleString()} · model: {selected?.model ?? "—"}
              {selected?.truncated && " · TRUNCATED"}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <section>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Sanitized prompt</h4>
                <pre className="surface-card p-3 text-xs whitespace-pre-wrap break-words max-h-64 overflow-y-auto">{selected.prompt_text}</pre>
              </section>
              <section>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Response</h4>
                <pre className="surface-card p-3 text-xs whitespace-pre-wrap break-words max-h-64 overflow-y-auto">{selected.response_text ?? "—"}</pre>
              </section>
              {Array.isArray(selected.pii_findings) && selected.pii_findings.length > 0 && (
                <section>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">PII findings</h4>
                  <pre className="surface-card p-3 text-xs">{JSON.stringify(selected.pii_findings, null, 2)}</pre>
                </section>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
