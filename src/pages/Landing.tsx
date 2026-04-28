import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Landmark,
  ShieldCheck,
  KeyRound,
  Sparkles,
  Lock,
  AlertTriangle,
  Eye,
  FileSearch,
  Fingerprint,
  Workflow,
  ArrowRight,
  Github,
  ScrollText,
  Database,
  Cpu,
  Loader2,
  Zap,
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);

  const startDemo = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("demo-login");
      if (error) throw error;
      const { access_token, refresh_token } = (data ?? {}) as {
        access_token?: string;
        refresh_token?: string;
      };
      if (!access_token || !refresh_token) {
        throw new Error("Demo session not returned");
      }
      const { error: setErr } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (setErr) throw setErr;
      toast.success("Welcome to the demo workspace");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      console.error("demo login failed", e);
      toast.error("Couldn't start the demo. Try again or sign up manually.");
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
              <Landmark className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="display text-sm font-semibold">BankOps Copilot</div>
              <div className="mono text-[10px] text-muted-foreground">AI governance for banks</div>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#problem" className="hover:text-foreground">Problem</a>
            <a href="#controls" className="hover:text-foreground">Controls</a>
            <a href="#architecture" className="hover:text-foreground">Architecture</a>
            <Link to="/threat-model" className="hover:text-foreground">Threat model</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Sign in</Button>
            <Button size="sm" onClick={startDemo} disabled={demoLoading}>
              {demoLoading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="mr-1.5 h-3.5 w-3.5" />
              )}
              Try the demo
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute inset-0" style={{ backgroundImage: "var(--gradient-radial)" }} />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 lg:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <span className="badge-dot border border-destructive/30 bg-destructive/10 text-destructive">
                <AlertTriangle className="h-3 w-3" />
                Built in response to the 2025 SA insider-fraud incident
              </span>
              <h1 className="display mt-5 text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                Govern AI inside the bank.{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Without slowing it down.
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
                A governance layer that sits between bank employees and large language models —
                server-side PII redaction, scoped ephemeral tokens, role-based document access,
                and a tamper-evident audit trail. So ops teams can use AI safely on real client work.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={startDemo} disabled={demoLoading}>
                  {demoLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="mr-2 h-4 w-4" />
                  )}
                  Try the live demo (no signup)
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/threat-model">
                    <ScrollText className="mr-2 h-4 w-4" /> Read the threat model
                  </Link>
                </Button>
              </div>

              {/* Demo creds */}
              <div className="mt-10 surface-card max-w-xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <KeyRound className="h-3.5 w-3.5 text-primary" /> HOW THE DEMO WORKS
                </div>
                <div className="mt-3 grid gap-2 text-xs">
                  <div className="flex items-center justify-between rounded-md border border-border/60 bg-surface/50 px-3 py-2">
                    <span className="text-muted-foreground">One-click demo →</span>
                    <span className="mono">shared <span className="text-primary">ops</span> account, pre-seeded</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Click <span className="mono text-foreground">Try the demo</span> to land in a populated
                    workspace instantly — no signup. Or create your own account from the{" "}
                    <Link to="/auth" className="underline hover:text-foreground">sign-in page</Link>{" "}
                    to explore from a clean slate.
                  </p>
                </div>
              </div>
            </div>

            {/* Right visual */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-6 rounded-3xl bg-gradient-primary opacity-20 blur-3xl" />
                <div className="relative surface-card glow-ring overflow-hidden">
                  <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                    <span className="ml-2 mono text-[11px] text-muted-foreground">/assist · ai-call</span>
                  </div>
                  <div className="space-y-3 p-5 text-xs">
                    <div className="rounded-md border border-border/60 bg-surface/50 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Employee prompt</div>
                      <div className="mt-1.5 mono text-foreground/90">
                        Summarise the dispute for client <span className="text-primary">Acme</span>, ID{" "}
                        <span className="rounded bg-destructive/15 px-1 text-destructive line-through">8001015009087</span>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <span className="badge-dot border border-warning/40 bg-warning/10 text-warning">
                        <ShieldCheck className="h-3 w-3" /> 1 PII match redacted server-side
                      </span>
                    </div>
                    <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                      <div className="text-[10px] uppercase tracking-wider text-primary">Sent to LLM</div>
                      <div className="mt-1.5 mono text-foreground/90">
                        Summarise the dispute for client Acme, ID <span className="rounded bg-primary/20 px-1 text-primary">[REDACTED_SA_ID]</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[10px]">
                      <div className="rounded border border-border/60 bg-surface/50 p-2">
                        <Fingerprint className="mx-auto h-3.5 w-3.5 text-primary" />
                        <div className="mt-1 mono text-muted-foreground">hash-chained</div>
                      </div>
                      <div className="rounded border border-border/60 bg-surface/50 p-2">
                        <Database className="mx-auto h-3.5 w-3.5 text-accent" />
                        <div className="mt-1 mono text-muted-foreground">RLS-enforced</div>
                      </div>
                      <div className="rounded border border-border/60 bg-surface/50 p-2">
                        <Eye className="mx-auto h-3.5 w-3.5 text-success" />
                        <div className="mt-1 mono text-muted-foreground">forensic log</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="border-t border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <span className="mono text-xs uppercase tracking-wider text-primary">The problem</span>
              <h2 className="display mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                Banks have two bad options for AI right now.
              </h2>
            </div>
            <div className="grid gap-4 lg:col-span-7 sm:grid-cols-2">
              <Card
                tone="destructive"
                title="Ban it"
                body="Employees use ChatGPT on their phones anyway, with zero logging or controls. Shadow AI usage and uncontrolled data leakage."
              />
              <Card
                tone="destructive"
                title="Allow it"
                body="Customer PII (SA IDs, account numbers, SWIFT codes) flows to third-party LLMs with no redaction, no audit trail, no segregation of duties."
              />
              <Card
                tone="warning"
                title="POPIA + PA Directive 3"
                body="Both require demonstrable controls on cross-border data flows and insider-risk monitoring. Neither extreme satisfies the regulator."
              />
              <Card
                tone="warning"
                title="The 2025 incident"
                body="A R500M+ insider-assisted fraud at a SA tier-1 bank. Every CISO is now being asked: 'what about AI leakage on top of that?'"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section id="controls" className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-3xl">
            <span className="mono text-xs uppercase tracking-wider text-primary">The controls</span>
            <h2 className="display mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Eight defenses, layered. Designed for the audit.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Every control is enforced server-side at the database or edge-function layer.
              Nothing relies on the client to behave.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ControlCard icon={Sparkles} title="PII pre-scan" body="SA IDs, card numbers, SWIFT codes redacted in the edge function before any LLM call." />
            <ControlCard icon={Lock} title="Encrypted storage" body="Documents stored per-owner, RLS-segmented by classification + client assignment." />
            <ControlCard icon={KeyRound} title="Ephemeral tokens" body="Scoped to a single document, time-bound, revocable, full audit trail on issuance + use." />
            <ControlCard icon={Eye} title="Break-glass mode" body="Emergency cross-classification access with mandatory justification and manager review." />
            <ControlCard icon={FileSearch} title="Justified downloads" body="Every download requires a typed reason + category. Logged immutably." />
            <ControlCard icon={AlertTriangle} title="Anomaly alerts" body="Real-time flags for bulk-download patterns, off-hours access, unusual classification spread." />
            <ControlCard icon={Fingerprint} title="Hash-chained audit" body="SHA-256 chain across all events. A single altered row breaks the chain — verifiable in one query." />
            <ControlCard icon={Workflow} title="Role separation" body="Support / ops / compliance / manager / admin. RLS-enforced. No admin shortcuts." />
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="border-t border-border/60 bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="max-w-3xl">
            <span className="mono text-xs uppercase tracking-wider text-primary">The architecture</span>
            <h2 className="display mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              No client-side trust. Anywhere.
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <ArchCard
              icon={Cpu}
              step="01"
              title="React client"
              body="Renders UI only. Holds a JWT but no privileges of its own — every meaningful check happens server-side."
            />
            <ArchCard
              icon={Workflow}
              step="02"
              title="Edge functions"
              body="PII pre-scan, AI gateway proxy, token issuance, signed downloads. Service-role key never leaves the server."
            />
            <ArchCard
              icon={Database}
              step="03"
              title="Postgres + RLS"
              body="Row-Level Security policies + SECURITY DEFINER role functions. Hash-chain trigger on every audit insert."
            />
          </div>

          <div className="mt-8 surface-card overflow-hidden">
            <pre className="overflow-x-auto p-5 text-xs leading-relaxed text-muted-foreground">
{`Employee ──► React UI ──► Edge Function ──► [PII scan] ──► Lovable AI Gateway
                              │                  │
                              ▼                  ▼
                         RLS-checked        ai_call_logs
                          Postgres        (prompt + findings)
                              │
                              ▼
                       audit_events
                  (hash-chained, immutable)`}
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h2 className="display text-3xl font-semibold tracking-tight md:text-4xl">
            See it in action in 60 seconds.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Sign up, click <span className="mono text-foreground">Seed demo data</span> on the
            Admin page, and you have a populated workspace with documents, tokens, audit events,
            and a verifiable hash chain.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={startDemo} disabled={demoLoading}>
              {demoLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Open the demo
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/threat-model">
                <ScrollText className="mr-2 h-4 w-4" /> Threat model
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-surface/30">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5" />
            <span>BankOps Copilot · student portfolio prototype</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/threat-model" className="hover:text-foreground">Threat model</Link>
            <a href="https://github.com" className="inline-flex items-center gap-1 hover:text-foreground">
              <Github className="h-3.5 w-3.5" /> Source
            </a>
            <span className="mono">v1.0 · synthetic data only</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

const Card = ({ tone, title, body }: { tone: "destructive" | "warning"; title: string; body: string }) => {
  const ring = tone === "destructive" ? "border-destructive/30 bg-destructive/5" : "border-warning/30 bg-warning/5";
  const dot = tone === "destructive" ? "bg-destructive" : "bg-warning";
  return (
    <div className={`rounded-xl border p-5 ${ring}`}>
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
};

const ControlCard = ({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) => (
  <div className="surface-card group p-5 transition-all hover:border-primary/40">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary transition-transform group-hover:scale-110">
      <Icon className="h-4 w-4" />
    </div>
    <h3 className="mt-3 text-sm font-semibold">{title}</h3>
    <p className="mt-1.5 text-xs text-muted-foreground">{body}</p>
  </div>
);

const ArchCard = ({
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
  <div className="surface-card p-6">
    <div className="flex items-center justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <span className="mono text-xs text-muted-foreground">{step}</span>
    </div>
    <h3 className="mt-4 text-base font-semibold">{title}</h3>
    <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
  </div>
);

export default Landing;