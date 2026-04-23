import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Landmark,
  ShieldCheck,
  AlertTriangle,
  Database,
  Lock,
  Eye,
  KeyRound,
  FileSearch,
  Fingerprint,
  Workflow,
  Sparkles,
} from "lucide-react";

const ThreatModel = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Landmark className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="display text-sm font-semibold">BankOps Copilot</div>
              <div className="mono text-[10px] text-muted-foreground">Threat model</div>
            </div>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to overview</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <span className="badge-dot border border-primary/30 bg-primary/10 text-primary">
          <ShieldCheck className="h-3 w-3" /> STRIDE-aligned
        </span>
        <h1 className="display mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Threat model
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          What this system defends against, what it doesn't, and how each control maps to a real
          attacker capability. Written for a bank security architect — short and specific.
        </p>

        {/* Assets */}
        <Section title="1 · Assets being protected" icon={Database}>
          <ul className="ml-4 list-disc space-y-1.5 text-sm text-muted-foreground">
            <li><span className="text-foreground">Client documents</span> — operational files containing PII, account details, dispute notes.</li>
            <li><span className="text-foreground">Prompts + LLM responses</span> — may contain sensitive data even if the source doc was clean.</li>
            <li><span className="text-foreground">Audit trail</span> — the regulator's evidence in any incident review.</li>
            <li><span className="text-foreground">Role assignments</span> — privilege escalation here = compromise of everything else.</li>
          </ul>
        </Section>

        {/* Trust boundaries */}
        <Section title="2 · Trust boundaries" icon={Workflow}>
          <p className="text-sm text-muted-foreground">Three boundaries; everything crossing them is validated server-side.</p>
          <div className="mt-4 surface-card overflow-hidden">
            <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-muted-foreground">
{`Browser  ─[1]─►  Edge Function  ─[2]─►  Postgres  ─[3]─►  External LLM
 (JWT)            (service role)           (RLS)            (Lovable AI)

 [1] JWT validated; user identity attached to every downstream call
 [2] RLS enforced even for service-role queries we route through it
 [3] PII pre-scan + redaction before any byte leaves our perimeter`}
            </pre>
          </div>
        </Section>

        {/* STRIDE */}
        <Section title="3 · STRIDE analysis" icon={AlertTriangle}>
          <div className="space-y-3">
            <Stride
              letter="S"
              name="Spoofing"
              threat="Attacker uses a stolen session token to impersonate an ops user."
              mitigation="Supabase Auth with short-lived JWTs; auth state revalidated on every privileged call; audit log records the user_id from the JWT, not from the request body."
            />
            <Stride
              letter="T"
              name="Tampering"
              threat="Insider with database access alters or deletes audit rows to hide an exfiltration."
              mitigation="Hash-chained audit log (SHA-256). Each row binds the previous row's hash. UPDATE/DELETE blocked by trigger. verify_audit_chain() detects any break in O(n)."
              icon={Fingerprint}
            />
            <Stride
              letter="R"
              name="Repudiation"
              threat="User claims 'I never downloaded that document.'"
              mitigation="Mandatory typed justification on every download (category + free-text), logged with hash chain. Cannot be retroactively edited."
              icon={FileSearch}
            />
            <Stride
              letter="I"
              name="Information disclosure"
              threat="Customer PII leaks to a third-party LLM via employee prompts."
              mitigation="Server-side regex + heuristic scan for SA IDs, card numbers (Luhn), SWIFT codes, account numbers. Redaction happens in the edge function before the AI gateway call. Findings stored separately for compliance review."
              icon={Sparkles}
            />
            <Stride
              letter="D"
              name="Denial of service"
              threat="Bulk-download script drains the document store or runs up AI gateway costs."
              mitigation="Rate-limit hooks on AI gateway response codes (429/402); anomaly alerts on bulk-access patterns; ephemeral tokens are single-document scope and expire."
              icon={AlertTriangle}
            />
            <Stride
              letter="E"
              name="Elevation of privilege"
              threat="Ops user gains compliance/manager rights and reads cross-classification documents."
              mitigation="Roles stored in separate table (never on profiles). Role checks via SECURITY DEFINER function — no recursive RLS. RLS policies use has_role() not auth.jwt() claims, which can be forged client-side. Only managers/admins can grant roles."
              icon={KeyRound}
            />
          </div>
        </Section>

        {/* Insider threat */}
        <Section title="4 · Insider-threat scenarios" icon={Eye}>
          <p className="text-sm text-muted-foreground">
            The most realistic attacker is an authorised employee, not an external one.
            These scenarios drove the design.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Scenario
              name="Bulk exfiltration"
              path="Authorised user downloads 50 client files in 10 minutes"
              defense="Anomaly alert fires in real-time on download burst; manager dashboard surfaces the user; justifications visible per-file"
            />
            <Scenario
              name="Cross-team snooping"
              path="Ops user opens a compliance-classified document via direct CID guess"
              defense="RLS denies access at the row level — the document literally does not exist for that user's session; denial logged"
            />
            <Scenario
              name="LLM exfiltration"
              path="User pastes a customer SA ID into a prompt to a public LLM"
              defense="Server-side scan catches it; SA ID redacted; original finding stored in ai_call_logs.pii_findings for compliance review"
            />
            <Scenario
              name="Audit-trail erasure"
              path="DBA-level access tries to delete an event row"
              defense="DELETE/UPDATE trigger raises exception; even if disabled at DB level, hash chain breaks and verify_audit_chain() reports the gap"
            />
          </div>
        </Section>

        {/* What it doesn't defend */}
        <Section title="5 · Out of scope (be honest)" icon={Lock}>
          <ul className="ml-4 list-disc space-y-1.5 text-sm text-muted-foreground">
            <li><span className="text-foreground">Endpoint compromise</span> — if an employee laptop is rooted, screen-scraping happens before our redaction. Mitigation: pair with EDR, not in this scope.</li>
            <li><span className="text-foreground">LLM provider compromise</span> — once data leaves for the gateway, we trust the provider's controls. Mitigation: provider with EU/SA data residency, contractual no-train clauses.</li>
            <li><span className="text-foreground">Side-channel inference</span> — a sophisticated user could probe the LLM with crafted prompts to infer redacted content. Mitigation: rate limits, not eliminated.</li>
            <li><span className="text-foreground">Production-grade key management</span> — currently uses Supabase secrets. A real deployment would integrate AWS KMS / HSM.</li>
          </ul>
        </Section>

        {/* What I'd build next */}
        <Section title="6 · What I'd build next (12-month roadmap)" icon={Workflow}>
          <div className="grid gap-3 md:grid-cols-2">
            <Roadmap when="Q1" item="Evidence-pack export — signed ZIP of audit events + chain proof for regulator submission" />
            <Roadmap when="Q1" item="DLP integration (Microsoft Purview / Forcepoint) so we sit alongside, not against, existing controls" />
            <Roadmap when="Q2" item="On-prem / VPC deployment with AWS af-south-1 dedicated tenancy for tier-1 bank requirements" />
            <Roadmap when="Q2" item="Four-eyes approval workflow for cross-classification access (currently break-glass is single-actor)" />
            <Roadmap when="Q3" item="Prompt-injection detection — block prompts that try to extract system instructions or other tenants' data" />
            <Roadmap when="Q3" item="SOC 2 Type II audit + ISO 27001 — table stakes for a bank vendor" />
          </div>
        </Section>

        <div className="mt-12 rounded-xl border border-primary/30 bg-primary/5 p-6">
          <h3 className="display text-lg font-semibold">A note on honesty</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            This is a student prototype. It demonstrates the right thinking — defense in depth,
            server-side enforcement, hash-chained logs, RLS-first access control — but a production
            deployment at a tier-1 bank would need a 12-18 month hardening cycle, formal pen-tests,
            SOC 2 Type II, and integration with existing IAM (Okta/Azure AD), DLP, and SIEM stacks.
            The architecture is buildable. The procurement is the hard part.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild>
            <Link to="/auth">Try the live demo <ArrowLeft className="ml-2 h-3.5 w-3.5 rotate-180" /></Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

const Section = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <section className="mt-10">
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="display text-xl font-semibold tracking-tight">{title}</h2>
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

const Stride = ({
  letter,
  name,
  threat,
  mitigation,
  icon: Icon,
}: {
  letter: string;
  name: string;
  threat: string;
  mitigation: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <div className="surface-card p-4">
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground display text-sm font-bold">
        {letter}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{name}</h3>
          {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        </div>
        <p className="mt-1 text-sm text-muted-foreground"><span className="text-destructive">Threat ·</span> {threat}</p>
        <p className="mt-1.5 text-sm text-muted-foreground"><span className="text-success">Mitigation ·</span> {mitigation}</p>
      </div>
    </div>
  </div>
);

const Scenario = ({ name, path, defense }: { name: string; path: string; defense: string }) => (
  <div className="surface-card p-4">
    <h3 className="text-sm font-semibold">{name}</h3>
    <p className="mt-1.5 text-xs text-muted-foreground"><span className="mono text-destructive">attack ·</span> {path}</p>
    <p className="mt-1 text-xs text-muted-foreground"><span className="mono text-success">defense ·</span> {defense}</p>
  </div>
);

const Roadmap = ({ when, item }: { when: string; item: string }) => (
  <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
    <span className="mono mt-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">{when}</span>
    <span className="text-sm text-muted-foreground">{item}</span>
  </div>
);

export default ThreatModel;