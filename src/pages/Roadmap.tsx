import { PageHeader } from "@/components/PageHeader";
import {
  ShieldCheck,
  Sparkles,
  Fingerprint,
  KeyRound,
  Eye,
  Lock,
  AlertTriangle,
  FileSearch,
  Workflow,
  CheckCircle2,
  CircleAlert,
  Rocket,
} from "lucide-react";

type Status = "shipped" | "partial" | "gap";

interface Control {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  shipped: string[];
  gaps: string[];
  upgrades: string[];
}

const controls: Control[] = [
  {
    id: "rls",
    title: "Row-Level Security & Role Separation",
    icon: Workflow,
    shipped: [
      "Postgres RLS on every table; classification + per-client gates via has_role / user_can_view_doc_v2",
      "Roles stored in a separate user_roles table (no privilege escalation via profile edits)",
      "Security-definer helpers with locked search_path",
    ],
    gaps: [
      "No SSO / SCIM — email-password only, no automated deprovisioning",
      "No row-level field masking (compliance can see whole rows, not column-redacted views)",
      "Dev role impersonation panel could mislead viewers about real enforcement boundary",
    ],
    upgrades: [
      "SAML/OIDC against Entra ID or Okta + SCIM for joiner-mover-leaver",
      "Column-level grants + masked views for sensitive fields (e.g. account numbers)",
      "Attribute-based access control (ABAC) layered on top of RBAC for dynamic context",
      "Periodic access recertification workflow (quarterly review with manager sign-off)",
    ],
  },
  {
    id: "pii",
    title: "PII Pre-Scan & Redaction",
    icon: Sparkles,
    shipped: [
      "Server-side regex redaction before LLM call (SA IDs, card PANs, SWIFT, emails, account numbers)",
      "pii_override gated to manager/admin and audit-logged",
    ],
    gaps: [
      "Regex misses names, addresses, paraphrased PII, foreign ID formats, OCR'd image PII",
      "No contextual classification (e.g. 'the customer mentioned in case 1234')",
      "No detection of secrets (API keys, JWTs) leaking into prompts",
    ],
    upgrades: [
      "Microsoft Presidio or AWS Comprehend for NER-based PII detection",
      "Custom NER model fine-tuned on bank-specific entities (account refs, branch codes)",
      "Secret-scanning layer (trufflehog-style) on prompt + response",
      "Prompt-injection detection (Lakera, Rebuff) before model call",
      "Output filtering — scan model response for PII before returning to user",
    ],
  },
  {
    id: "audit",
    title: "Hash-Chained Audit Trail",
    icon: Fingerprint,
    shipped: [
      "SHA-256 chain (prev_hash → row_hash) via immutable trigger",
      "verify_audit_chain() RPC for manager-initiated integrity check",
      "Append-only — audit_events_protect_hash blocks UPDATE/DELETE",
    ],
    gaps: [
      "service_role can still rewrite history and recompute hashes (single-writer trust)",
      "No external anchoring — chain integrity is self-attested",
      "Unbounded growth — no partitioning, archival, or retention policy",
      "verify_audit_chain is O(n), will time out past ~1M rows",
    ],
    upgrades: [
      "Periodic root-hash anchoring to external notary (AWS QLDB, blockchain, or signed S3 Object Lock)",
      "WORM storage tier (S3 Object Lock / Azure Immutable Blob) for cold audit archive",
      "Time-based partitioning + monthly chain checkpoints (verify last partition only)",
      "Dual-control on schema changes to audit_events (4-eyes via migration approval)",
      "Stream audit events to SIEM (Splunk, Sentinel) in real time",
    ],
  },
  {
    id: "tokens",
    title: "Ephemeral Scoped Tokens",
    icon: KeyRound,
    shipped: [
      "Single-document, time-bound (15–300s), permission-scoped, revocable",
      "Token hash stored (not plaintext); preview only for display",
      "Issuance + every use audit-logged",
    ],
    gaps: [
      "Tokens are bearer credentials — no proof-of-possession (DPoP, mTLS)",
      "No rate limiting per-issuer or per-document",
      "Revocation is eventual (no real-time push to active sessions)",
    ],
    upgrades: [
      "DPoP or mTLS-bound tokens so a stolen token is unusable elsewhere",
      "Per-user / per-client rate limits with sliding window",
      "Real-time revocation via Postgres LISTEN/NOTIFY or Redis pub/sub",
      "Token introspection endpoint for downstream services",
      "Risk-scored TTL (high-classification docs get shorter TTL automatically)",
    ],
  },
  {
    id: "breakglass",
    title: "Break-Glass Mode",
    icon: Eye,
    shipped: [
      "System-wide kill switch on token issuance + AI calls",
      "Toggle restricted to manager/admin, audit-logged",
    ],
    gaps: [
      "Binary toggle — no dual approval, no time-box, no auto-expiry",
      "No incident ticket auto-creation, no SIEM alert fan-out",
      "Cross-classification override path exists but isn't fully workflow-driven",
    ],
    upgrades: [
      "4-eyes approval (manager A requests, manager B approves) before activation",
      "Mandatory time-box (max 60 min) with auto-revert + extension workflow",
      "Auto-create ServiceNow / Jira incident on activation, post to #sec-ops Slack",
      "Post-incident report template auto-generated from audit slice",
      "Step-up auth (WebAuthn) required to toggle",
    ],
  },
  {
    id: "storage",
    title: "Encrypted Storage & Downloads",
    icon: Lock,
    shipped: [
      "Private bucket, signed URLs only, per-owner storage paths",
      "Justification (category + free-text) required on download",
      "PDF watermarking with user / time / reason",
    ],
    gaps: [
      "Encryption-at-rest is platform default (AES-256) — no per-tenant KMS or BYOK",
      "No DLP scan on upload (malware, hidden PII in EXIF, embedded scripts)",
      "Signed URLs are bearer — anyone with the link in TTL window can fetch",
    ],
    upgrades: [
      "Envelope encryption with per-tenant KMS keys (AWS KMS, Azure Key Vault, HSM-backed)",
      "Bring-Your-Own-Key (BYOK) for regulated tenants",
      "ClamAV + custom DLP scan on every upload",
      "Short-lived signed URLs (≤60s) + IP/UA binding",
      "Data residency pinning (EU / SA region selection per tenant)",
    ],
  },
  {
    id: "anomaly",
    title: "Anomaly & Insider-Risk Detection",
    icon: AlertTriangle,
    shipped: [
      "Heuristic alerts: bulk downloads, off-hours access, denial bursts, unusual classification spread",
    ],
    gaps: [
      "Hand-tuned thresholds — high false-positive rate at scale",
      "No per-user baseline modeling",
      "No correlation across signals (one alert at a time)",
      "No feedback loop — analysts can't mark false positives",
    ],
    upgrades: [
      "UEBA: per-user baseline (access volume, hours, classifications) with z-score alerting",
      "Sequence models (LSTM / transformer) on event streams for behavioral drift",
      "Triage queue with analyst feedback that re-trains thresholds",
      "Cross-signal correlation (bulk download + off-hours + denial → escalate)",
      "Integrate with SOAR (Splunk SOAR, Tines) for auto-response playbooks",
    ],
  },
  {
    id: "ai",
    title: "AI Gateway & Model Governance",
    icon: Sparkles,
    shipped: [
      "All LLM calls through Lovable AI Gateway — no user-supplied keys",
      "Prompt + redaction findings logged per call",
    ],
    gaps: [
      "Gateway lock-in — no routing to bank's own Azure OpenAI tenant or on-prem models",
      "No per-tenant model allow-list",
      "No prompt-template versioning or evaluation harness",
      "No content-safety scoring on responses",
    ],
    upgrades: [
      "Pluggable model backend (Azure OpenAI, Bedrock, on-prem vLLM)",
      "Per-tenant model allow-list + cost cap",
      "Versioned prompt templates with eval suite (regression on safety + accuracy)",
      "Response moderation (Azure Content Safety, Llama Guard) before return",
      "PII / hallucination scoring with reviewer queue for high-risk outputs",
    ],
  },
  {
    id: "ops",
    title: "Operations, Compliance & Resilience",
    icon: ShieldCheck,
    shipped: [
      "Single-region managed Postgres + Storage",
      "Audit chain provides core compliance evidence",
    ],
    gaps: [
      "No multi-region failover or DR runbook",
      "No SOC 2 / ISO 27001 evidence collection automation",
      "No formal change management on migrations",
      "No penetration test cadence",
    ],
    upgrades: [
      "Cross-region read replica + tested failover (RPO < 5min, RTO < 30min)",
      "Vanta / Drata integration for continuous SOC 2 evidence",
      "Migration approval workflow (4-eyes) + automated rollback plan",
      "Quarterly external pentest + annual red-team exercise",
      "Chaos engineering on edge functions (latency, dependency failure)",
    ],
  },
];

const Roadmap = () => {
  const totals = controls.reduce(
    (acc, c) => {
      acc.shipped += c.shipped.length;
      acc.gaps += c.gaps.length;
      acc.upgrades += c.upgrades.length;
      return acc;
    },
    { shipped: 0, gaps: 0, upgrades: 0 },
  );

  return (
    <div>
      <PageHeader
        title="Requirements & limitations"
        description="A control-by-control map of what's shipped today, the known gaps, and the upgrades a production deployment would need."
      />

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        {/* Summary */}
        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryCard
            icon={CheckCircle2}
            label="Shipped controls"
            value={totals.shipped}
            tone="success"
          />
          <SummaryCard
            icon={CircleAlert}
            label="Known gaps"
            value={totals.gaps}
            tone="warning"
          />
          <SummaryCard
            icon={Rocket}
            label="Production upgrades"
            value={totals.upgrades}
            tone="primary"
          />
        </section>

        <section className="surface-card p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            <FileSearch className="h-4 w-4" /> HOW TO READ THIS
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Each control below is split into three lanes: <span className="text-success font-medium">Shipped</span> is
            what runs today in this demo, <span className="text-warning font-medium">Gaps</span> are honest limitations
            we'd flag in a real review, and <span className="text-primary font-medium">Upgrades</span> are the concrete
            next steps to take this from portfolio-grade to production-grade for a regulated bank.
          </p>
        </section>

        {/* Controls */}
        <section className="space-y-5">
          {controls.map((c) => (
            <ControlCard key={c.id} control={c} />
          ))}
        </section>
      </div>
    </div>
  );
};

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "success" | "warning" | "primary";
}) => {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "warning"
        ? "bg-warning/15 text-warning"
        : "bg-primary/15 text-primary";
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="display text-xl font-semibold">{value}</div>
        </div>
      </div>
    </div>
  );
};

const ControlCard = ({ control }: { control: Control }) => {
  const Icon = control.icon;
  return (
    <article className="surface-card p-5">
      <header className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="display text-base font-semibold tracking-tight">{control.title}</h2>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Lane
          tone="success"
          label="Shipped"
          status="shipped"
          items={control.shipped}
        />
        <Lane tone="warning" label="Known gaps" status="gap" items={control.gaps} />
        <Lane
          tone="primary"
          label="Production upgrades"
          status="partial"
          items={control.upgrades}
        />
      </div>
    </article>
  );
};

const Lane = ({
  tone,
  label,
  status,
  items,
}: {
  tone: "success" | "warning" | "primary";
  label: string;
  status: Status;
  items: string[];
}) => {
  const headerClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : "text-primary";
  const dotClass =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : "bg-primary";

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${headerClass}`}>
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {label}
        <span className="ml-auto mono text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      <ul className="mt-2.5 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
            <span className={`mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full ${dotClass}`} aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <span className="sr-only">{status}</span>
    </div>
  );
};

export default Roadmap;