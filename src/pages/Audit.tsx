import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const resultColor = (r: string) => {
  if (r === "ok") return "bg-success/15 text-success border border-success/30";
  if (r === "denied") return "bg-warning/15 text-warning border border-warning/30";
  return "bg-destructive/15 text-destructive border border-destructive/30";
};

const Audit = () => {
  const { isManagerOrAdmin } = useAuth();

  const events = useQuery({
    queryKey: ["audit_events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_events")
        .select("*, profiles:user_id(username, display_name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const exportCsv = () => {
    if (!events.data || events.data.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const headers = ["created_at", "user_id", "action", "resource_cid", "result", "meta"];
    const rows = events.data.map((e) =>
      [
        e.created_at,
        e.user_id ?? "",
        e.action,
        e.resource_cid ?? "",
        e.result,
        JSON.stringify(e.meta ?? {}).replace(/"/g, '""'),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bankops_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description={
          isManagerOrAdmin
            ? "All metadata events across the workspace. Append-only."
            : "Your metadata events. Managers and admins see all."
        }
        actions={
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Export CSV
          </Button>
        }
      />

      <div className="px-6 py-6">
        <div className="surface-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              {events.data?.length ?? 0} recent events
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">When</th>
                  <th className="px-4 py-2.5 font-medium">User</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Resource</th>
                  <th className="px-4 py-2.5 font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {events.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {events.data && events.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No events yet — upload a doc or create a token to populate this log.
                    </td>
                  </tr>
                )}
                {events.data?.map((e) => (
                  <tr key={e.id} className="border-t border-border/60 hover:bg-surface/60">
                    <td className="px-4 py-2.5 mono text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {(e as { profiles?: { username?: string } }).profiles?.username ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="mono text-xs">{e.action}</span>
                    </td>
                    <td className="px-4 py-2.5 mono text-[11px] text-muted-foreground">
                      {e.resource_cid ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`badge-dot capitalize ${resultColor(e.result)}`}>
                        {e.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Audit;
