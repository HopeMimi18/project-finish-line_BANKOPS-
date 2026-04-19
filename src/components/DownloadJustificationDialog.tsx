import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "client_request", label: "Client request" },
  { value: "internal_review", label: "Internal review" },
  { value: "audit", label: "Audit" },
  { value: "compliance_investigation", label: "Compliance investigation" },
  { value: "ops_handover", label: "Operational handover" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  documentId: string | null;
  filename: string;
}

export const DownloadJustificationDialog = ({
  open,
  onOpenChange,
  documentId,
  filename,
}: Props) => {
  const [category, setCategory] = useState("client_request");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setReason("");
    setCategory("client_request");
  };

  const submit = async () => {
    if (!documentId) return;
    if (reason.trim().length < 10) {
      toast.error("Please provide at least 10 characters of justification");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("download-document", {
        body: {
          document_id: documentId,
          reason_category: category,
          reason_text: reason.trim(),
        },
      });
      if (error) {
        let msg = error.message;
        try {
          const parsed = await (error as any).context?.text?.();
          if (parsed) msg = JSON.parse(parsed).error ?? msg;
        } catch { /* noop */ }
        throw new Error(msg);
      }
      const d = data as any;
      let blobUrl: string | null = null;
      let revoke = false;
      if (d?.content_b64 && d?.content_type) {
        const bin = atob(d.content_b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        const blob = new Blob([arr], { type: d.content_type });
        blobUrl = URL.createObjectURL(blob);
        revoke = true;
      } else if (d?.url) {
        blobUrl = d.url;
      }
      if (!blobUrl) throw new Error("No download payload");
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revoke) setTimeout(() => URL.revokeObjectURL(blobUrl!), 5000);
      toast.success(d?.watermarked ? "Watermarked download started · logged" : "Download started · logged");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Download failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          if (!v) reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Justify download
          </DialogTitle>
          <DialogDescription>
            All downloads are recorded in the audit log with your reason.
            <span className="mt-1 block mono text-[11px] text-muted-foreground">
              {filename}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat">Reason category</Label>
            <Select value={category} onValueChange={setCategory} disabled={busy}>
              <SelectTrigger id="cat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Justification</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Client requested copy of statement on call ref #12345"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={4}
              disabled={busy}
            />
            <p className="text-[11px] text-muted-foreground">
              {reason.length}/500 · min 10 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || reason.trim().length < 10}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
