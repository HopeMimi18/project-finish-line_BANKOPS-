import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Clock, FileDown, ShieldAlert } from "lucide-react";

interface Event {
  id: string;
  user_id: string | null;
  action: string;
  result: string;
  created_at: string;
  meta: any;
}

interface Anomaly {
  id: string;
  type: "bulk_download" | "off_hours" | "pii_block" | "denied_burst";
  user_id: string | null;
  username?: string;
  count: number;
  detail: string;
  at: string;
}

const HOUR_START = 7;  // 07:00
const HOUR_END = 19;   // 19:00
const BULK_THRESHOLD = 5; // >=5 downloads in 10 min
const DENIED_THRESHOLD = 3; // >=3 denied actions in 10 min

export const AnomalyAlerts = () => {
  const events = useQuery({
    queryKey: ["anomaly-events"],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("audit_events")
        .select("id, user_id, action, result, created_at, meta")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Event[];
    },
    refetchInterval: 30_000,
  });

  const profiles = useQuery({
    queryKey: ["anomaly-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const userName = (uid: string | null) => {
    if (!uid) return "—";
    const p = profiles.data?.find((x) => x.user_id === uid);
    return p?.display_name || p?.username || uid.slice(0, 8) + "…";
  };

  const anomalies = useMemo<Anomaly[]>(() => {
    const out: Anomaly[] = [];
    if (!events.data) return out;

    // 1. Bulk downloads — sliding 10-minute window per user
    const downloadsByUser = new Map<string, Event[]>();
    for (const e of events.data) {
      if (e.action === "document.download" && e.result === "ok" && e.user_id) {
        const list = downloadsByUser.get(e.user_id) ?? [];
        list.push(e);
        downloadsByUser.set(e.user_id, list);
      }
    }
    downloadsByUser.forEach((evts, uid) => {
      // events are already desc-sorted; check first window
      const sorted = evts.slice().sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      const first = sorted[0];
      const windowStart = +new Date(first.created_at) - 10 * 60 * 1000;
      const inWin = sorted.filter((e) => +new Date(e.created_at) >= windowStart);
      if (inWin.length >= BULK_THRESHOLD) {
        out.push({
          id: `bulk-${uid}-${first.id}`,
          type: "bulk_download",
          user_id: uid,
          count: inWin.length,
          detail: `${inWin.length} downloads in 10 min`,
          at: first.created_at,
        });
      }
    });

    // 2. Off-hours access (downloads or AI calls outside 07:00-19:00 local)
    for (const e of events.data) {
      if (
        (e.action === "document.download" || e.action === "ai.assist") &&
        e.result === "ok" &&
        e.user_id
      ) {
        const h = new Date(e.created_at).getHours();
        if (h < HOUR_START || h >= HOUR_END) {
          out.push({
            id: `off-${e.id}`,
            type: "off_hours",
            user_id: e.user_id,
            count: 1,
            detail: `${e.action.replace(".", " ")} at ${new Date(e.created_at).toLocaleTimeString()}`,
            at: e.created_at,
          });
        }
      }
    }

    // 3. PII blocks (denied AI calls due to pii_blocked)
    for (const e of events.data) {
      if (
        e.action === "ai.assist" &&
        e.result === "denied" &&
        e.meta?.reason === "pii_blocked"
      ) {
        const findings = (e.meta?.findings as any[]) ?? [];
        const summary = findings
          .map((f: any) => `${f.count}× ${f.type}`)
          .join(", ");
        out.push({
          id: `pii-${e.id}`,
          type: "pii_block",
          user_id: e.user_id,
          count: 1,
          detail: `AI blocked: ${summary || "sensitive data detected"}`,
          at: e.created_at,
        });
      }
    }

    // 4. Burst of denied actions per user (any denied) — possible probing
    const deniedByUser = new Map<string, Event[]>();
    for (const e of events.data) {
      if (e.result === "denied" && e.user_id) {
        const list = deniedByUser.get(e.user_id) ?? [];
        list.push(e);
        deniedByUser.set(e.user_id, list);
      }
    }
    deniedByUser.forEach((evts, uid) => {
      const sorted = evts.slice().sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      const first = sorted[0];
      const windowStart = +new Date(first.created_at) - 10 * 60 * 1000;
      const inWin = sorted.filter((e) => +new Date(e.created_at) >= windowStart);
      if (inWin.length >= DENIED_THRESHOLD) {
        out.push({
          id: `denied-${uid}-${first.id}`,
          type: "denied_burst",
          user_id: uid,
          count: inWin.length,
          detail: `${inWin.length} denied actions in 10 min`,
          at: first.created_at,
        });
      }
    });

    // Sort newest first, dedupe loose duplicates (same type+user within 1 min)
    out.sort((a, b) => +new Date(b.at) - +new Date(a.at));
    const seen = new Set<string>();
    return out.filter((a) => {
      const key = `${a.type}-${a.user_id}-${Math.floor(+new Date(a.at) / 60000)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [events.data]);

  const meta: Record<Anomaly["type"], { icon: any; label: string; tone: string }> = {
    bulk_download: { icon: FileDown, label: "Bulk download", tone: "text-warning bg-warning/10 border-warning/30" },
    off_hours: { icon: Clock, label: "Off-hours access", tone: "text-warning bg-warning/10 border-warning/30" },
    pii_block: { icon: ShieldAlert, label: "PII blocked", tone: "text-destructive bg-destructive/10 border-destructive/30" },
    denied_burst: { icon: AlertTriangle, label: "Denied burst", tone: "text-destructive bg-destructive/10 border-destructive/30" },
  };

  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Insider-risk alerts
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Last 24 hours · refreshes every 30s
          </p>
        </div>
        <span className="badge-dot bg-secondary text-secondary-foreground">
          {anomalies.length} signal{anomalies.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {events.isLoading && (
          <div className="text-sm text-muted-foreground">Scanning…</div>
        )}
        {!events.isLoading && anomalies.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No anomalies detected in the last 24h
          </div>
        )}
        {anomalies.slice(0, 20).map((a) => {
          const m = meta[a.type];
          const Icon = m.icon;
          return (
            <div
              key={a.id}
              className={`flex items-start gap-3 rounded-md border p-3 ${m.tone}`}
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{m.label}</span>
                  <span className="mono text-[10px] opacity-70">
                    {new Date(a.at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-xs opacity-90">
                  <span className="font-medium">{userName(a.user_id)}</span>
                  {" · "}
                  {a.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
