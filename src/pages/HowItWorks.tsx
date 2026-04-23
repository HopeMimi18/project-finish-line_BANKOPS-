import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import {
  UploadCloud,
  KeyRound,
  Sparkles,
  ShieldCheck,
  Users,
  Building2,
  LayoutDashboard,
  AlertTriangle,
  Eye,
  FileSearch,
  Fingerprint,
  Lock,
  Workflow,
  ArrowRight,
  ScrollText,
  PlayCircle,
} from "lucide-react";

const HowItWorks = () => {
  return (
    <div>
      <PageHeader
        title="How it works"
        description="A 5-minute tour of BankOps Copilot — what each page does, who can see what, and how the safety controls fit together."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/threat-model">
              <ScrollText className="mr-2 h-4 w-4" /> Threat model
            </Link>
          </Button>
        }
      />

      <div className="mx-auto max-w-4xl space-y-10 px-6 py-8">
        {/* Persistent onboarding checklist */}
        <OnboardingChecklist />

        {/* Quick start */}
        <section className="surface-card p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <PlayCircle className="h-4 w-4" /> QUICK START
          </div>
          <h2 className="display mt-2 text-2xl font-semibold tracking-tight">
            Get a populated workspace in 60 seconds
          </h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <Step n="1" text="Open the Admin & Access page (you'll need a manager or admin role)." />
            <Step n="2" text="Click 'Seed demo data' — creates clients, documents, tokens, AI calls, and a fresh hash-chained audit trail." />
            <Step n="3" text="Use the floating Dev Roles panel (bottom-right) to switch roles and see how the UI changes." />
            <Step n="4" text="Try uploading a document, issuing a token, asking AI Assist a question, then verify the audit chain." />
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/admin">Go to Admin <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/upload">Upload a document</Link>
            </Button>
          </div>
        </section>

        {/* Roles */}
        <section>
          <h2 className="display text-xl font-semibold tracking-tight">Roles &amp; what they see</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Every page is gated by your role. Roles are enforced server-side via Postgres RLS — the UI just reflects what
            the database will allow.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <RoleCard role="support" body="Can view 'support' classification documents only. Day-to-day client queries." />
            <RoleCard role="ops" body="Operations role. Sees ops-classified documents, can issue scoped tokens." />
            <RoleCard role="compliance" body="Read access to compliance-classified docs, full audit visibility, anomaly review." />
            <RoleCard role="manager" body="All of the above + Admin & Access page, role grants, break-glass approvals." />
            <RoleCard role="admin" body="Workspace owner. Seed demo data, manage clients, rotate roles." />
          </div>
        </section>

        {/* Page tour */}
        <section>
          <h2 className="display text-xl font-semibold tracking-tight">The pages, in order</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            A typical demo flow follows the sidebar top-to-bottom.
          </p>
          <div className="mt-4 space-y-3">
            <PageRow
              icon={LayoutDashboard}
              title="Dashboard"
              path="/dashboard"
              body="Live overview: documents by classification, active tokens, recent AI calls, anomaly count, audit-chain status."
            />
            <PageRow
              icon={UploadCloud}
              title="Upload &amp; Store"
              path="/upload"
              body="Upload a document, tag its classification (support / ops / compliance) and assign it to a client. Stored encrypted, RLS-segmented per owner + classification."
            />
            <PageRow
              icon={KeyRound}
              title="Tokens"
              path="/tokens"
              body="Mint ephemeral, scoped access tokens. Each token is bound to a single document, time-bound, and revocable. Issuance + every use is audit-logged."
            />
            <PageRow
              icon={Sparkles}
              title="AI Assist"
              path="/assist"
              body="Ask a question about a document. The edge function runs PII pre-scan (SA IDs, card numbers, SWIFT) and redacts before sending to the LLM. Prompt + findings logged."
            />
            <PageRow
              icon={ShieldCheck}
              title="Audit"
              path="/audit"
              body="Every event hash-chained with SHA-256. Click 'Verify chain' — one altered row breaks the chain and the verifier reports the first break."
            />
            <PageRow
              icon={Users}
              title="Admin &amp; Access"
              path="/admin"
              body="Manager+ only. Seed demo data, grant/revoke roles, toggle break-glass mode."
            />
            <PageRow
              icon={Building2}
              title="Clients"
              path="/clients"
              body="Manager+ only. Create client records and assign staff. Drives the per-client RLS check on documents."
            />
          </div>
        </section>

        {/* Safety layers */}
        <section>
          <h2 className="display text-xl font-semibold tracking-tight">The safety controls</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Eight layered defenses. Every one of them is enforced server-side — the React client is never trusted.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Control icon={Sparkles} title="PII pre-scan" body="Redacted in the edge function before any LLM call." />
            <Control icon={Lock} title="Encrypted storage" body="Per-owner storage paths, RLS by classification + client." />
            <Control icon={KeyRound} title="Ephemeral tokens" body="Document-scoped, time-bound, revocable, fully logged." />
            <Control icon={Eye} title="Break-glass mode" body="Cross-classification override with mandatory justification." />
            <Control icon={FileSearch} title="Justified downloads" body="Every download requires a typed reason + category." />
            <Control icon={AlertTriangle} title="Anomaly alerts" body="Flags bulk-download, off-hours, unusual classification spread." />
            <Control icon={Fingerprint} title="Hash-chained audit" body="SHA-256 chain — a single altered row is detectable in one query." />
            <Control icon={Workflow} title="Role separation" body="RLS-enforced. No client-side admin shortcuts." />
          </div>
        </section>

        {/* Try it */}
        <section className="surface-card p-6">
          <h2 className="display text-xl font-semibold tracking-tight">Suggested demo script</h2>
          <ol className="mt-3 space-y-2.5 text-sm text-muted-foreground">
            <li><span className="mono text-foreground">1.</span> Seed demo data on Admin.</li>
            <li><span className="mono text-foreground">2.</span> Open AI Assist, paste a prompt with a fake SA ID — watch it get redacted before the call.</li>
            <li><span className="mono text-foreground">3.</span> Issue a token on the Tokens page; copy the token string.</li>
            <li><span className="mono text-foreground">4.</span> Visit Audit, click 'Verify chain' — should be intact.</li>
            <li><span className="mono text-foreground">5.</span> Use the Dev Roles panel to switch to <span className="mono text-foreground">support</span> — sidebar collapses, /admin redirects.</li>
          </ol>
        </section>
      </div>
    </div>
  );
};

const Step = ({ n, text }: { n: string; text: string }) => (
  <li className="flex gap-3">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 mono text-xs text-primary">
      {n}
    </span>
    <span className="pt-0.5">{text}</span>
  </li>
);

const RoleCard = ({ role, body }: { role: string; body: string }) => (
  <div className="surface-card p-4">
    <span className="badge-dot bg-secondary text-secondary-foreground capitalize">{role}</span>
    <p className="mt-2 text-sm text-muted-foreground">{body}</p>
  </div>
);

const PageRow = ({
  icon: Icon,
  title,
  path,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  path: string;
  body: string;
}) => (
  <Link
    to={path}
    className="surface-card flex items-start gap-4 p-4 transition-colors hover:border-primary/40"
  >
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold" dangerouslySetInnerHTML={{ __html: title }} />
        <span className="mono text-[11px] text-muted-foreground">{path}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
    <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
  </Link>
);

const Control = ({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) => (
  <div className="surface-card p-4">
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
  </div>
);

export default HowItWorks;