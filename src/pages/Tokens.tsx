import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Copy, KeyRound, Ban, Loader2 } from "lucide-react";
import { generateTokenString, timeRemaining } from "@/lib/bankops";
import { buildTokenRecord, writeAuditEvent } from "@/lib/security";
import { RowSkeleton } from "@/components/RowSkeleton";

type Permission = "summarize" | "keywords" | "classify" | "pii_override";
const PERMS: { value: Permission; hint?: string; privileged?: boolean }[] = [
  { value: "summarize" },
  { value: "keywords" },
  { value: "classify" },
  { value: "pii_override", hint: "Bypass SA-ID/card AI block", privileged: true },
];

const Tokens = () => {
  const { user, isManagerOrAdmin } = useAuth();
  const qc = useQueryClient();

  const [docId, setDocId] = useState<string>("");
  const [perms, setPerms] = useState<Permission[]>(["summarize", "keywords"]);
  const [ttl, setTtl] = useState(60);
  const [busy, setBusy] = useState(false);

  // refresh countdowns every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, cid, filename, classification")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const tokens = useQuery({
    queryKey: ["tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tokens_safe" as any)
        .select("id, token_preview, scope_cid, document_id, permissions, expires_at, revoked, created_at, created_by, documents(filename, classification)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const togglePerm = (p: Permission) =>
    setPerms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const handleCreate = async () => {
    if (!user) return;
    if (!docId) return toast.error("Pick a document");
    if (perms.length === 0) return toast.error("Select at least one permission");

    // Break-glass guard
    const { data: bg } = await supabase
      .from("system_settings").select("value").eq("key", "break_glass").maybeSingle();
    if ((bg?.value as any)?.enabled) {
      return toast.error("Break-glass mode active — token issuance is frozen.");
    }

    setBusy(true);
    const doc = docs.data?.find((d) => d.id === docId);
    if (!doc) {
      setBusy(false);
      return toast.error("Document not found");
    }

    const tokenStr = generateTokenString();
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

    const tokenRecord = await buildTokenRecord(tokenStr);

    const { error } = await supabase.from("tokens").insert({
      ...tokenRecord,
      scope_cid: doc.cid,
      document_id: doc.id,
      permissions: perms,
      expires_at: expiresAt,
      created_by: user.id,
    });
    setBusy(false);

    if (error) {
      toast.error(error.message);
      await writeAuditEvent({ action: "token.create", result: "error", meta: { error: error.message } });
      return;
    }
    await writeAuditEvent({
      action: "token.create",
      resource_cid: doc.cid,
      document_id: doc.id,
      meta: { ttl, permissions: perms },
    });
    toast.success("Token created");
    navigator.clipboard.writeText(tokenStr).catch(() => {});
    qc.invalidateQueries({ queryKey: ["tokens"] });
  };

  const handleRevoke = async (id: string, scopeCid: string) => {
    const { error } = await supabase.from("tokens").update({ revoked: true }).eq("id", id);
    if (error) return toast.error(error.message);
    await writeAuditEvent({ action: "token.revoke", resource_cid: scopeCid });
    toast.success("Token revoked");
    qc.invalidateQueries({ queryKey: ["tokens"] });
  };

  return (
    <div>
      <PageHeader
        title="Tokens"
        description="Issue scoped, time-bound access tokens. Tokens grant a single document a small set of AI permissions for a few seconds."
      />

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-5">
        {/* Create */}
        <div className="surface-card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold">Create Token</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="doc">Document scope</Label>
              <Select value={docId} onValueChange={setDocId} disabled={busy}>
                <SelectTrigger id="doc">
                  <SelectValue placeholder={docs.data?.length ? "Pick a document…" : "No documents"} />
                </SelectTrigger>
                <SelectContent>
                  {docs.data?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <span className="mr-2">{d.filename}</span>
                      <span className="mono text-[10px] text-muted-foreground">
                        [{d.classification}]
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Permissions</Label>
              <div className="flex flex-wrap gap-3">
                {PERMS.map((p) => {
                  const disabled = busy || (p.privileged && !isManagerOrAdmin);
                  return (
                    <label
                      key={p.value}
                      className={[
                        "flex cursor-pointer items-center gap-2 rounded-md border bg-surface px-3 py-1.5 text-sm capitalize",
                        p.privileged
                          ? "border-warning/40 text-warning"
                          : "border-border",
                        disabled ? "opacity-50 cursor-not-allowed" : "",
                      ].join(" ")}
                      title={p.hint || ""}
                    >
                      <Checkbox
                        checked={perms.includes(p.value)}
                        onCheckedChange={() => togglePerm(p.value)}
                        disabled={disabled}
                      />
                      {p.value.replace("_", " ")}
                    </label>
                  );
                })}
              </div>
              {!isManagerOrAdmin && (
                <p className="text-[11px] text-muted-foreground">
                  <span className="text-warning">pii_override</span> requires manager/admin.
                </p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ttl">TTL (seconds)</Label>
                <span className="mono text-xs text-muted-foreground">{ttl}s</span>
              </div>
              <Slider
                id="ttl"
                value={[ttl]}
                min={15}
                max={300}
                step={15}
                onValueChange={([v]) => setTtl(v)}
                disabled={busy}
              />
            </div>

            <div className="md:col-span-2">
              <Button onClick={handleCreate} disabled={busy || !docId} className="w-full">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Token (auto-copied to clipboard)
              </Button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Active & Recent</h2>
            <span className="text-[11px] text-muted-foreground">
              {tokens.data?.length ?? 0}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {tokens.isLoading && <RowSkeleton rows={4} cols={2} />}
            {tokens.data && tokens.data.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm">
                <div className="font-medium text-foreground">No tokens issued yet</div>
                <div className="mt-1 text-muted-foreground">
                  Pick a document on the left and grant short-lived AI permissions.
                </div>
              </div>
            )}
            {tokens.data?.map((t) => {
              const remaining = timeRemaining(t.expires_at);
              const isActive = !t.revoked && !remaining.expired;
              return (
                <div key={t.id} className="rounded-lg border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <KeyRound className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate text-sm font-medium">
                          {t.documents?.filename ?? "(deleted doc)"}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {t.permissions.map((p) => (
                          <span key={p} className="badge-dot bg-secondary text-secondary-foreground capitalize">
                            {p}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                        {t.revoked ? (
                          <span className="badge-dot bg-destructive/15 text-destructive border border-destructive/30">
                            revoked
                          </span>
                        ) : remaining.expired ? (
                          <span className="badge-dot bg-muted text-muted-foreground">expired</span>
                        ) : (
                          <span className="badge-dot bg-success/15 text-success border border-success/30">
                            <span className="h-1 w-1 rounded-full bg-success" />
                            {remaining.label}
                          </span>
                        )}
                      </div>
                      <button
                        className="mt-1.5 mono inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                      >
                        {t.token_preview}
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    {isActive && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Revoke"
                        onClick={() => handleRevoke(t.id, t.scope_cid)}
                      >
                        <Ban className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tokens;
