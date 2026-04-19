import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, FileText, Tags, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Task = "summarize" | "keywords" | "classify";

const TASKS: { value: Task; label: string; icon: any; hint: string }[] = [
  { value: "summarize", label: "Summarize", icon: FileText, hint: "3–5 bullet summary" },
  { value: "keywords", label: "Keywords", icon: Tags, hint: "Comma-separated key phrases" },
  { value: "classify", label: "Classify", icon: ShieldCheck, hint: "support / ops / compliance" },
];

interface AssistResult {
  task: Task;
  document: { cid: string; filename: string; classification: string };
  output: string;
  truncated: boolean;
}

const Assist = () => {
  const [token, setToken] = useState("");
  const [task, setTask] = useState<Task>("summarize");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AssistResult | null>(null);

  const run = async () => {
    if (!token.trim()) {
      toast.error("Paste an ephemeral token first");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assist", {
        body: { token: token.trim(), task },
      });
      if (error) {
        // Try to surface the JSON error from the function response
        const msg = (error as any)?.context?.body
          ? await (error as any).context.text?.()
          : null;
        throw new Error(msg || error.message || "AI request failed");
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as AssistResult);
      toast.success("AI Assist completed");
    } catch (e: any) {
      toast.error(e.message ?? "AI Assist failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Assist"
        description="Token-gated AI tasks. Each call is recorded in the audit log with the token id."
      />
      <div className="grid gap-6 p-6 lg:grid-cols-[420px_1fr]">
        {/* Controls */}
        <div className="surface-card space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="token">Ephemeral token</Label>
            <Input
              id="token"
              placeholder="tk_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Issue one on the Tokens page. Token must include the selected task in its permissions.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Task</Label>
            <div className="grid gap-2">
              {TASKS.map((t) => {
                const Icon = t.icon;
                const active = task === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTask(t.value)}
                    className={[
                      "flex items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50",
                    ].join(" ")}
                  >
                    <Icon
                      className={[
                        "h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      ].join(" ")}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className="text-[11px] text-muted-foreground">{t.hint}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={run} disabled={busy} className="w-full">
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Run AI Assist
              </>
            )}
          </Button>
        </div>

        {/* Result */}
        <div className="surface-card p-5">
          {!result && !busy && (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              <Sparkles className="mb-3 h-8 w-8 opacity-40" />
              No result yet. Pick a task and run with a valid token.
            </div>
          )}

          {busy && (
            <div className="flex h-full flex-col items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mb-3 h-8 w-8 animate-spin opacity-60" />
              Validating token and calling AI…
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
                <span className="badge-dot bg-primary/15 text-primary capitalize">
                  {result.task}
                </span>
                <span className="badge-dot bg-secondary text-secondary-foreground capitalize">
                  {result.document.classification}
                </span>
                <span className="text-sm font-medium">{result.document.filename}</span>
                <span className="mono text-[11px] text-muted-foreground">
                  {result.document.cid}
                </span>
                {result.truncated && (
                  <span className="badge-dot bg-warning/15 text-warning ml-auto">
                    input truncated
                  </span>
                )}
              </div>
              <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                {result.output || "(empty response)"}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Assist;
