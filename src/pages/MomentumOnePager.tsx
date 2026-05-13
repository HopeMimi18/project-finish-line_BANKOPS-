import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import {
  ShieldCheck,
  KeyRound,
  Sparkles,
  Lock,
  AlertTriangle,
  Eye,
  FileSearch,
  Fingerprint,
  Workflow,
  Database,
  Cpu,
  ArrowLeft,
  Printer,
  Download,
  Loader2,
  HeartPulse,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MomentumOnePager = () => {
  const sheetRef = useRef<HTMLElement | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPdf = async () => {
    if (!sheetRef.current || exporting) return;
    setExporting(true);
    const toastId = toast.loading("Generating PDF…");
    try {
      const bg =
        getComputedStyle(document.documentElement).getPropertyValue("--background").trim();
      const backgroundColor = bg ? `hsl(${bg})` : "#ffffff";

      const canvas = await html2canvas(sheetRef.current, {
        scale: Math.max(3, window.devicePixelRatio * 3),
        backgroundColor,
        useCORS: true,
        imageTimeout: 0,
        logging: false,
        windowWidth: sheetRef.current.scrollWidth,
        windowHeight: sheetRef.current.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableW = pageW - margin * 2;
      const imgH = (canvas.height * usableW) / canvas.width;

      if (imgH <= pageH - margin * 2) {
        pdf.addImage(imgData, "PNG", margin, margin, usableW, imgH, undefined, "FAST");
      } else {
        const pageHpx = ((pageH - margin * 2) * canvas.width) / usableW;
        let rendered = 0;
        let pageIdx = 0;
        while (rendered < canvas.height) {
          const sliceH = Math.min(pageHpx, canvas.height - rendered);
          const slice = document.createElement("canvas");
          slice.width = canvas.width;
          slice.height = sliceH;
          const ctx = slice.getContext("2d");
          if (!ctx) break;
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, slice.width, slice.height);
          ctx.drawImage(canvas, 0, rendered, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceData = slice.toDataURL("image/png");
          const sliceImgH = (sliceH * usableW) / canvas.width;
          if (pageIdx > 0) pdf.addPage();
          pdf.addImage(sliceData, "PNG", margin, margin, usableW, sliceImgH, undefined, "FAST");
          rendered += sliceH;
          pageIdx += 1;
        }
      }

      pdf.save("bankops-copilot-momentum-one-pager.pdf");
      toast.success("PDF saved", { id: toastId, description: "bankops-copilot-momentum-one-pager.pdf" });
    } catch (err) {
      console.error("PDF export failed", err);
      toast.error("Couldn't generate PDF", {
        id: toastId,
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Print/screenshot toolbar — hidden on print */}
      <div className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-[920px] items-center justify-between px-6 py-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/landing">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to landing
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <span className="mono text-[11px] text-muted-foreground">A4 · screenshot-friendly</span>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Print
            </Button>
            <Button size="sm" onClick={handleExportPdf} disabled={exporting}>
              {exporting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              {exporting ? "Generating…" : "Save as PDF"}
            </Button>
          </div>
        </div>
      </div>

      {/* Page sheet */}
      <main
        ref={sheetRef}
        className="mx-auto max-w-[920px] px-8 py-10 print:px-10 print:py-8"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-6 border-b border-border/60 pb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <HeartPulse className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="display text-2xl font-semibold leading-tight">BankOps Copilot</div>
              <div className="mono text-[11px] uppercase tracking-wider text-muted-foreground">
                AI governance for insurers · Momentum pitch
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="badge-dot border border-primary/30 bg-primary/10 text-primary">
              <Stethoscope className="h-3 w-3" />
              Life · Health · Disability
            </span>
            <div className="mono mt-2 text-[10px] text-muted-foreground">v1.0 · synthetic data</div>
          </div>
        </header>

        {/* Tagline */}
        <section className="pt-6">
          <h1 className="display text-3xl font-semibold leading-tight tracking-tight">
            Govern AI inside the insurer.{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Without slowing it down.
            </span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A governance layer between insurance employees and LLMs — server-side PII redaction,
            scoped ephemeral tokens, RLS-enforced policyholder access, and a tamper-evident audit
            trail. Claims handlers, underwriters, and call-centre agents get to use AI on real
            policyholder work; compliance gets a defensible record.
          </p>
          <p className="mono mt-2 text-[11px] italic text-muted-foreground">
            Designed to complement — not replace — enterprise stacks like Microsoft Purview and Azure OpenAI.
          </p>
          <p className="mono mt-1 text-[11px] italic text-muted-foreground">
            Inspired by the 2025 SA insider-assisted data-breach incident.
          </p>
        </section>

        {/* Problem / Solution row */}
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <Block tone="destructive" label="Problem">
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>• Banning AI pushes claims handlers onto personal ChatGPT — zero logging.</li>
              <li>• Allowing it leaks PII (SA IDs, policy numbers, medical history) to third-party LLMs.</li>
              <li>• POPIA + FAIS conduct standards require demonstrable insider-risk controls.</li>
              <li>• Brokers, assessors, and BPO administrators create a blurred insider/outsider boundary.</li>
            </ul>
          </Block>
          <Block tone="primary" label="Solution">
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>• Edge-function proxy redacts PII <em>before</em> any LLM call.</li>
              <li>• Postgres + RLS segregates claims files by role, product line, and broker channel.</li>
              <li>• Ephemeral, document-scoped tokens replace standing system access.</li>
              <li>• SHA-256 hash-chained audit trail — verifiable in a single query.</li>
            </ul>
          </Block>
        </section>

        {/* Controls grid */}
        <section className="mt-6">
          <SectionHeading>Eight layered controls</SectionHeading>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <Mini icon={Sparkles} title="PII pre-scan" body="SA IDs, policy numbers, medical codes redacted server-side." />
            <Mini icon={Lock} title="Encrypted storage" body="Per-owner, RLS-segmented by product + classification." />
            <Mini icon={KeyRound} title="Ephemeral tokens" body="Claim-scoped, time-bound, revocable." />
            <Mini icon={Eye} title="Break-glass" body="Cross-class access w/ justification." />
            <Mini icon={FileSearch} title="Justified downloads" body="Typed reason + category, logged." />
            <Mini icon={AlertTriangle} title="Anomaly alerts" body="Bulk, off-hours, unusual spread." />
            <Mini icon={Fingerprint} title="Hash-chained audit" body="Single altered row breaks chain." />
            <Mini icon={Workflow} title="Role separation" body="Claims / underwriting / compliance / mgr." />
          </div>
        </section>

        {/* Why not just Copilot? */}
        <section className="mt-6">
          <SectionHeading>Why not just Copilot?</SectionHeading>
          <p className="mt-3 text-xs text-muted-foreground">
            Microsoft 365 Copilot + Azure OpenAI + Purview cover encryption, tenant residency, and
            edge DLP. Three gaps remain at the prompt boundary — exactly where this layer sits.
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
            <Gap
              n="01"
              title="PII-in-prompt"
              body="Purview blocks PII in email & files, but an underwriter pasting a policyholder's SA ID or medical history into a Copilot prompt is in-tenant — and not redacted before the model sees it."
            />
            <Gap
              n="02"
              title="Standing access"
              body="Policy admin system permissions are persistent. There is no native concept of a claim-scoped, time-bound, single-use token tied to a justified underwriting or claims review task."
            />
            <Gap
              n="03"
              title="Cross-employee segmentation"
              body="Entra groups gate folders, not row-level policyholder records. A call-centre agent can still query Copilot across policyholders they don't service — without a row-level deny."
            />
          </div>
        </section>

        {/* Insurance-specific angle */}
        <section className="mt-6">
          <SectionHeading>Built for insurance, not just documents</SectionHeading>
          <p className="mt-3 text-xs text-muted-foreground">
            Momentum's data spans both unstructured claims files <em>and</em> structured policy systems.
            The governance layer is designed to hook into both — PDFs, application forms, medical reports,
            <em>and</em> policy-admin extract queries — so AI assistance is safe across the full workflow.
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <Mini icon={Stethoscope} title="Life underwriting" body="Medical history, income proofs, HIV consent forms." />
            <Mini icon={HeartPulse} title="Health claims" body="Diagnosis codes, provider invoices, member records." />
            <Mini icon={Lock} title="Disability claims" body="Occupational assessments, earnings history." />
            <Mini icon={Eye} title="Broker channel" body="Third-party access with scoped, revocable tokens." />
          </div>
        </section>

        {/* Architecture */}
        <section className="mt-6">
          <SectionHeading>Architecture · no client-side trust</SectionHeading>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Arch icon={Cpu} step="01" title="React client" body="Renders UI only. Holds JWT, no privileges." />
            <Arch icon={Workflow} step="02" title="Edge functions" body="PII scan, AI proxy, signed downloads." />
            <Arch icon={Database} step="03" title="Postgres + RLS" body="SECURITY DEFINER + hash-chain trigger." />
          </div>
          <pre className="mt-3 overflow-x-auto rounded-lg border border-border/60 bg-surface/40 p-3 text-[10px] leading-relaxed text-muted-foreground">
{`Employee → React UI → Edge Function → [PII scan] → Lovable AI Gateway
                          │                  │
                          ▼                  ▼
                    RLS-checked PG      ai_call_logs
                          │
                          ▼
                   audit_events (hash-chained, immutable)`}
          </pre>
        </section>

        {/* Outcome strip */}
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat value="0" label="PII tokens reaching the LLM in tests" />
          <Stat value="100%" label="AI calls logged with redaction findings" />
          <Stat value="1 query" label="To verify the full audit hash chain" />
        </section>

        {/* Footer */}
        <footer className="mt-8 flex items-center justify-between border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>BankOps Copilot · student portfolio prototype · synthetic data only</span>
          </div>
          <div className="mono">bankopspilot.lovable.app</div>
        </footer>
      </main>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="h-px flex-1 bg-border/60" />
    <span className="mono text-[10px] uppercase tracking-wider text-primary">{children}</span>
    <span className="h-px flex-1 bg-border/60" />
  </div>
);

const Block = ({
  tone,
  label,
  children,
}: {
  tone: "destructive" | "primary";
  label: string;
  children: React.ReactNode;
}) => {
  const ring =
    tone === "destructive"
      ? "border-destructive/30 bg-destructive/5"
      : "border-primary/30 bg-primary/5";
  const accent = tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className={`rounded-xl border p-4 ${ring}`}>
      <div className={`mono text-[10px] uppercase tracking-wider ${accent}`}>{label}</div>
      {children}
    </div>
  );
};

const Mini = ({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) => (
  <div className="rounded-lg border border-border/60 bg-surface/40 p-3">
    <div className="flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
        <Icon className="h-3 w-3" />
      </span>
      <div className="text-[12px] font-semibold">{title}</div>
    </div>
    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{body}</p>
  </div>
);

const Arch = ({
  icon: Icon,
  step,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  step: string;
  title: string;
  body: string;
}) => (
  <div className="rounded-lg border border-border/60 bg-surface/40 p-4">
    <div className="flex items-center justify-between">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground shadow-glow">
        <Icon className="h-4 w-4" />
      </span>
      <span className="mono text-[10px] text-muted-foreground">{step}</span>
    </div>
    <div className="mt-2 text-sm font-semibold">{title}</div>
    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{body}</p>
  </div>
);

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-lg border border-border/60 bg-surface/40 p-4 text-center">
    <div className="display text-2xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
      {value}
    </div>
    <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
  </div>
);

const Gap = ({ n, title, body }: { n: string; title: string; body: string }) => (
  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
    <div className="flex items-center justify-between">
      <div className="text-[12px] font-semibold">{title}</div>
      <span className="mono text-[10px] text-destructive">{n}</span>
    </div>
    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{body}</p>
  </div>
);

export default MomentumOnePager;
