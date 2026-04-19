import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { FileLock2, KeyRound, Sparkles, ShieldCheck } from "lucide-react";

const Kpi = ({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
}) => (
  <div className="kpi-card">
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-2 text-2xl font-semibold mono">{value}</div>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <div className="mt-3 text-[11px] text-muted-foreground">{hint}</div>
  </div>
);

const Dashboard = () => {
  const { user, roles } = useAuth();

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Encrypted storage, ephemeral access, and auditable AI for banking operations."
      />

      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Encrypted Docs" value="—" icon={FileLock2} hint="No documents stored yet" />
          <Kpi label="Active Tokens" value="—" icon={KeyRound} hint="Issue scoped, time-bound tokens" />
          <Kpi label="AI Requests" value="—" icon={Sparkles} hint="Local, permissioned inference" />
          <Kpi label="Audit Events" value="—" icon={ShieldCheck} hint="Append-only, metadata only" />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="surface-card p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold">What this system demonstrates</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span><span className="text-foreground font-medium">Encrypted storage</span> — no plaintext at rest, scoped per role.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span><span className="text-foreground font-medium">Ephemeral access</span> — time-bound, scoped permissions for AI tasks.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span><span className="text-foreground font-medium">Permissioned inference</span> — every AI call is gated by a valid token.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span><span className="text-foreground font-medium">Auditability</span> — metadata-only trail for compliance and governance.</span>
              </li>
            </ul>
          </div>

          <div className="surface-card p-5">
            <h2 className="text-sm font-semibold">Session</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">User</dt>
                <dd className="mono truncate max-w-[180px]">{user?.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Roles</dt>
                <dd className="flex flex-wrap justify-end gap-1">
                  {roles.length === 0 ? (
                    <span className="badge-dot bg-muted text-muted-foreground">none</span>
                  ) : (
                    roles.map((r) => (
                      <span key={r} className="badge-dot bg-secondary text-secondary-foreground capitalize">
                        {r}
                      </span>
                    ))
                  )}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Mode</dt>
                <dd>
                  <span className="badge-dot bg-warning/15 text-warning border border-warning/30">
                    Hackathon MVP
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
