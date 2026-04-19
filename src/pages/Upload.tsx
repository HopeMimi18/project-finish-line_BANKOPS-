import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Trash2, FileLock2, Copy } from "lucide-react";
import { generateCid, formatBytes, logAudit } from "@/lib/bankops";

type Tag = "support" | "ops" | "compliance";
const TAGS: Tag[] = ["support", "ops", "compliance"];

const filenameSchema = z
  .string()
  .trim()
  .min(1, { message: "Filename required" })
  .max(120)
  .regex(/^[A-Za-z0-9._\- ]+$/, {
    message: "Only letters, numbers, spaces, dots, underscores, dashes",
  });

const Upload = () => {
  const { user, roles } = useAuth();
  const qc = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [tag, setTag] = useState<Tag>(
    (roles.find((r) => TAGS.includes(r as Tag)) as Tag) ?? "ops"
  );
  const [busy, setBusy] = useState(false);

  const docs = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const isText =
      file.type.startsWith("text/") ||
      /\.(txt|md|csv|json|log)$/i.test(file.name);
    if (!isText) {
      setPreview("(binary file — no preview; text will be extracted server-side)");
      return;
    }
    file
      .text()
      .then((t) => setPreview(t.slice(0, 2500)))
      .catch(() => setPreview("(unreadable preview)"));
  }, [file]);

  const reset = () => {
    setFile(null);
    setPreview("");
  };

  const handleUpload = async () => {
    if (!user) return;
    if (!file) return toast.error("Choose a file first");
    const nameParsed = filenameSchema.safeParse(file.name);
    if (!nameParsed.success) return toast.error(nameParsed.error.issues[0].message);
    if (file.size > 10 * 1024 * 1024) return toast.error("Max file size is 10 MB");

    setBusy(true);
    const cid = generateCid();
    const safeName = nameParsed.data.replace(/\s+/g, "_");
    const storagePath = `${user.id}/${cid}_${safeName}`;

    // 1. Upload to private bucket (encrypted at rest)
    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType: file.type || "text/plain",
        upsert: false,
      });

    if (upErr) {
      setBusy(false);
      toast.error(`Upload failed: ${upErr.message}`);
      await logAudit({ action: "document.upload", result: "error", meta: { error: upErr.message } });
      return;
    }

    // 2. Insert metadata row
    const { error: insErr } = await supabase.from("documents").insert({
      cid,
      filename: nameParsed.data,
      content_type: file.type || "text/plain",
      size_bytes: file.size,
      classification: tag,
      storage_path: storagePath,
      owner_id: user.id,
    });

    if (insErr) {
      // best-effort cleanup
      await supabase.storage.from("documents").remove([storagePath]);
      setBusy(false);
      toast.error(`Metadata insert failed: ${insErr.message}`);
      await logAudit({ action: "document.upload", result: "error", meta: { error: insErr.message } });
      return;
    }

    setBusy(false);
    toast.success("Document encrypted and stored");
    await logAudit({
      action: "document.upload",
      resourceCid: cid,
      meta: { filename: nameParsed.data, classification: tag, size: file.size },
    });
    reset();
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const handleDelete = async (id: string, cid: string, storagePath: string) => {
    if (!confirm("Delete this document permanently?")) return;
    const { error: delErr } = await supabase.from("documents").delete().eq("id", id);
    if (delErr) {
      toast.error(delErr.message);
      return;
    }
    await supabase.storage.from("documents").remove([storagePath]);
    await logAudit({ action: "document.delete", resourceCid: cid });
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  return (
    <div>
      <PageHeader
        title="Upload & Store"
        description="Upload a document — it is stored in a private bucket, encrypted at rest. Metadata is tagged for role-based access."
      />

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-5">
        {/* Upload */}
        <div className="surface-card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold">New Upload</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Accepts <span className="mono">.txt .md .csv .json .log .pdf .docx</span>. Max 10 MB.
          </p>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="file">Document</Label>
              <Input
                id="file"
                type="file"
                accept=".txt,.md,.csv,.json,.log,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={busy}
              />
              {file && (
                <p className="mono text-[11px] text-muted-foreground">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tag">Classification tag</Label>
              <Select value={tag} onValueChange={(v) => setTag(v as Tag)} disabled={busy}>
                <SelectTrigger id="tag">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAGS.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Only users with the matching role (or manager/admin) will see this doc.
              </p>
            </div>

            {preview && (
              <div className="space-y-1.5">
                <Label>Preview (first 2.5 KB)</Label>
                <Textarea readOnly value={preview} className="mono h-40 text-xs" />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button onClick={handleUpload} disabled={busy || !file} className="flex-1">
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Encrypt & Store
              </Button>
              <Button variant="outline" onClick={reset} disabled={busy}>
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="surface-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Stored Documents</h2>
            <span className="text-[11px] text-muted-foreground">
              {docs.data?.length ?? 0} visible
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {docs.isLoading && (
              <div className="text-sm text-muted-foreground">Loading…</div>
            )}
            {docs.data && docs.data.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No documents yet
              </div>
            )}
            {docs.data?.map((d) => {
              const canDelete = d.owner_id === user?.id || roles.includes("manager") || roles.includes("admin");
              return (
                <div
                  key={d.id}
                  className="rounded-lg border border-border bg-surface p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileLock2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="truncate text-sm font-medium">{d.filename}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="badge-dot bg-secondary text-secondary-foreground capitalize">
                          {d.classification}
                        </span>
                        <span className="mono text-[10px] text-muted-foreground">
                          {formatBytes(d.size_bytes)}
                        </span>
                      </div>
                      <button
                        className="mt-1.5 mono inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(d.cid);
                          toast.success("CID copied");
                        }}
                        title="Copy CID"
                      >
                        {d.cid}
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(d.id, d.cid, d.storage_path)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
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

export default Upload;
