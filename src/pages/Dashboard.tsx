import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FileLock2,
  KeyRound,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  UploadCloud,
  Building2,
  AlertTriangle,
  Activity,
  TrendingUp,
  Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Kpi = ({
  label,
  value,
  icon: Icon,
  hint,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  trend?: string;
}) => (
  <div className="kpi-card">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mono mt-2 display text-3xl font-semibold">{value}</div>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <div className="mt-3 flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{hint}</span>
      {trend && (
        <span className="badge-dot bg-success/10 text-success">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </span>
      )}
    </div>
  </div>
);

const QuickAction = ({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) => (
  <Link
    to={to}
    className="group flex items-center gap-3 rounded-lg border border-border bg-surface/50 p-3 transition-all hover:border-primary/40 hover:bg-surface"
  >
    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
  </Link>
);

const Dashboard = () => {
  const { user, roles, isManagerOrAdmin } = useAuth();

  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();
      const [docsRes, tokensRes, aiRes, auditRes, deniedRes] = await Promise.all([
        supabase.from("documents").select("*", { count: "exact", head: true }),
        supabase
          .from("tokens")
          .select("*", { count: "exact", head: true })
          .eq("revoked", false)
          .gt("expires_at", nowIso),
        supabase
          .from("audit_events")
          .select("*", { count: "exact", head: true })
          .eq("action", "ai.assist")
          .gte("created_at", dayAgo),
        supabase
          .from("audit_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", dayAgo),
        supabase
          .from("audit_events")
          .select("*", { count: "exact", head: true })
          .eq("result", "denied")
          .gte("created_at", dayAgo),
      ]);
      return {
        docs: docsRes.count ?? 0,
        tokens: tokensRes.count ?? 0,
        ai: aiRes.count ?? 0,
        audit: auditRes.count ?? 0,
        denied: deniedRes.count ?? 0,
      };
    },
    refetchInterval: 30_000,
  });

  const recent = useQuery({
    queryKey: ["dashboard-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_events")
        .select("id, action, result, created_at, meta")
        .order("created_at", { ascending: false })
        .limit(6);
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const fmt = (n: number | undefined) =>
    stats.isLoading || n === undefined ? "—" : n.toLocaleString();

  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
        ? "Good afternoon"
        : "Good evening";
  const name = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "there";

  return (
    <div>
      <PageHeader
        title={`${greeting}, ${name}`}
        description="Encrypted storage, ephemeral access, and auditable AI for banking operations."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link to="/landing">
                <Home className="mr-2 h-4 w-4" />
                Public landing
              </Link>
            </Button>
          <Link to="/upload">
            <Button size="sm">
              <UploadCloud className="mr-2 h-4 w-4" />
              New upload
            </Button>
          </Link>
          </>
        }
      />

      <div className="space-y-6 px-6 py-6">
        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="Encrypted Docs"
            value={fmt(stats.data?.docs)}
            icon={FileLock2}
            hint="Visible under your roles"
          />
          <Kpi
            label="Active Tokens"
            value={fmt(stats.data?.tokens)}
            icon={KeyRound}
            hint="Not revoked, not expired"
          />
          <Kpi
            label="AI Requests · 24h"
            value={fmt(stats.data?.ai)}
            icon={Sparkles}
            hint="Token-gated assist calls"
          />
          <Kpi
            label="Denied · 24h"
            value={fmt(stats.data?.denied)}
            icon={AlertTriangle}
            hint="Policy blocks · PII · expired tokens"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Governance overview */}
          <div className="surface-card relative overflow-hidden p-6 lg:col-span-2">
            <div className="absolute inset-0 grid-bg opacity-30" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Governance controls in this workspace</h2>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                <Bullet
                  title="Encrypted storage"
                  desc="Role-based and per-client segmentation enforced at the database row level."
                />
                <Bullet
                  title="Ephemeral, scoped tokens"
                  desc="Single-document, time-bound, permission-limited — never share an unbounded API key."
                />
                <Bullet
                  title="PII pre-scan"
                  desc="SA IDs, cards, accounts, SWIFT, emails detected and redacted before AI."
                />
                <Bullet
                  title="Justification on download"
                  desc="Reason category + free-text required, recorded in the audit log forever."
                />
                <Bullet
                  title="Insider-risk alerts"
                  desc="Bulk downloads, off-hours access, and denial bursts surface to managers."
                />
                <Bullet
                  title="PDF watermarking"
                  desc="Every PDF download embeds a traceable user / time / reason stamp."
                />
              </ul>
            </div>
          </div>

          {/* Session card */}
          <div className="surface-card p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Your session</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">User</dt>
                <dd className="mono max-w-[200px] truncate text-right text-xs">{user?.email}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="text-muted-foreground">Roles</dt>
                <dd className="flex flex-wrap justify-end gap-1">
                  {roles.length === 0 ? (
                    <span className="badge-dot bg-muted text-muted-foreground">none</span>
                  ) : (
                    roles.map((r) => (
                      <span
                        key={r}
                        className="badge-dot bg-secondary capitalize text-secondary-foreground"
                      >
                        {r}
                      </span>
                    ))
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Audit · 24h</dt>
                <dd className="mono">{fmt(stats.data?.audit)} events</dd>
              </div>
            </dl>

            <div className="my-5 h-px bg-border" />

            <div className="space-y-2">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Quick actions
              </div>
              <div className="space-y-1.5">
                <QuickAction
                  to="/upload"
                  icon={UploadCloud}
                  title="Upload a document"
                  desc="Encrypt and tag for AI"
                />
                <QuickAction
                  to="/tokens"
                  icon={KeyRound}
                  title="Issue an AI token"
                  desc="Scoped, time-bound"
                />
                <QuickAction to="/assist" icon={Sparkles} title="Run AI Assist" desc="Summarize · keywords · classify" />
                {isManagerOrAdmin && (
                  <QuickAction
                    to="/clients"
                    icon={Building2}
                    title="Manage clients"
                    desc="Need-to-know segmentation"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Recent activity</h2>
            </div>
            <Link to="/audit" className="text-xs text-primary hover:underline">
              View full audit →
            </Link>
          </div>
          <ul className="divide-y divide-border/60">
            {recent.isLoading && (
              <li className="px-5 py-4 text-sm text-muted-foreground">Loading…</li>
            )}
            {recent.data && recent.data.length === 0 && (
              <li className="px-5 py-6 text-center text-sm text-muted-foreground">
                Nothing yet. Upload a document or issue a token to populate this feed.
              </li>
            )}
            {recent.data?.map((e) => (
              <li
                key={e.id}
                className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-surface/40"
              >
                <span
                  className={[
                    "h-2 w-2 shrink-0 rounded-full",
                    e.result === "ok"
                      ? "bg-success"
                      : e.result === "denied"
                        ? "bg-warning"
                        : "bg-destructive",
                  ].join(" ")}
                />
                <span className="mono text-xs text-foreground">{e.action}</span>
                <span className="ml-auto mono text-[11px] text-muted-foreground">
                  {new Date(e.created_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const Bullet = ({ title, desc }: { title: string; desc: string }) => (
  <li className="flex gap-2.5">
    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-primary" />
    <div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-[11px] text-muted-foreground">{desc}</div>
    </div>
  </li>
);

export default Dashboard;
