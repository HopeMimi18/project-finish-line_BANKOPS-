import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Check, Circle, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "bankops:onboarding_progress";

type StepId = "seed" | "upload" | "token" | "assist" | "audit";

const STEPS: { id: StepId; title: string; body: string; path: string; cta: string }[] = [
  {
    id: "seed",
    title: "Seed demo data",
    body: "Populate your workspace with clients, documents, tokens, AI calls, and a fresh hash chain.",
    path: "/admin",
    cta: "Open Admin",
  },
  {
    id: "upload",
    title: "Upload a document",
    body: "Tag a classification and assign it to a client. RLS picks it up automatically.",
    path: "/upload",
    cta: "Go to Upload",
  },
  {
    id: "token",
    title: "Issue a scoped token",
    body: "Mint a time-bound, document-scoped token. Issuance and use are both audit-logged.",
    path: "/tokens",
    cta: "Open Tokens",
  },
  {
    id: "assist",
    title: "Try AI Assist",
    body: "Ask a question with a fake SA ID — watch the PII pre-scan redact it before the LLM call.",
    path: "/assist",
    cta: "Open AI Assist",
  },
  {
    id: "audit",
    title: "Verify the audit chain",
    body: "Run the SHA-256 chain verifier — should report intact across all rows.",
    path: "/audit",
    cta: "Open Audit",
  },
];

const loadProgress = (): Record<StepId, boolean> => {
  if (typeof window === "undefined") return {} as Record<StepId, boolean>;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : ({} as Record<StepId, boolean>);
  } catch {
    return {} as Record<StepId, boolean>;
  }
};

export const OnboardingChecklist = () => {
  const [done, setDone] = useState<Record<StepId, boolean>>(() => loadProgress());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
    } catch {
      // ignore quota / privacy errors
    }
  }, [done]);

  const toggle = (id: StepId) => setDone((p) => ({ ...p, [id]: !p[id] }));
  const reset = () => setDone({} as Record<StepId, boolean>);

  const completed = STEPS.filter((s) => done[s.id]).length;
  const pct = Math.round((completed / STEPS.length) * 100);

  return (
    <section className="surface-card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary">
            ONBOARDING CHECKLIST
          </div>
          <h2 className="display mt-2 text-2xl font-semibold tracking-tight">
            Walk through the demo, step by step
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Progress is saved in your browser. Tick steps as you complete them.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={reset} className="shrink-0">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="mono">
            {completed} / {STEPS.length} complete
          </span>
          <span className="mono">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ol className="mt-6 space-y-2.5">
        {STEPS.map((step, idx) => {
          const isDone = !!done[step.id];
          return (
            <li
              key={step.id}
              className={[
                "flex items-start gap-3 rounded-lg border p-3.5 transition-colors",
                isDone
                  ? "border-success/40 bg-success/5"
                  : "border-border/60 bg-surface/40 hover:border-primary/40",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => toggle(step.id)}
                aria-label={isDone ? `Mark step ${idx + 1} incomplete` : `Mark step ${idx + 1} complete`}
                className={[
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  isDone
                    ? "border-success bg-success text-success-foreground"
                    : "border-border text-muted-foreground hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[11px] text-muted-foreground">
                    Step {idx + 1}
                  </span>
                  <h3
                    className={[
                      "text-sm font-semibold",
                      isDone ? "text-muted-foreground line-through" : "text-foreground",
                    ].join(" ")}
                  >
                    {step.title}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{step.body}</p>
              </div>
              <Button asChild size="sm" variant={isDone ? "ghost" : "outline"} className="shrink-0">
                <Link to={step.path}>
                  {step.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </li>
          );
        })}
      </ol>
    </section>
  );
};