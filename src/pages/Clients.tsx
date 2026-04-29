import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Loader2, Plus, Trash2, Users, Building2 } from "lucide-react";
import { toast } from "sonner";
import { writeAuditEvent } from "@/lib/security";

const clientSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/i, {
    message: "Letters, digits, _, - only",
  }),
  name: z.string().trim().min(2).max(120),
});

const Clients = () => {
  const { user, isManagerOrAdmin, isDemoUser } = useAuth();
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [assignUser, setAssignUser] = useState<string>("");

  const clients = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const profiles = useQuery({
    queryKey: ["profiles-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignments = useQuery({
    queryKey: ["client-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_assignments")
        .select("id, user_id, client_id");
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignmentsByClient = useMemo(() => {
    const m = new Map<string, { id: string; user_id: string }[]>();
    for (const a of assignments.data ?? []) {
      const list = m.get(a.client_id) ?? [];
      list.push({ id: a.id, user_id: a.user_id });
      m.set(a.client_id, list);
    }
    return m;
  }, [assignments.data]);

  const userLabel = (uid: string) => {
    const p = profiles.data?.find((x) => x.user_id === uid);
    return p?.display_name || p?.username || uid.slice(0, 8) + "…";
  };

  const create = async () => {
    if (!user) return;
    if (isDemoUser) {
      toast.info("Demo session is read-only on Clients");
      return;
    }
    const parsed = clientSchema.safeParse({ code, name });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setCreating(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({ code: parsed.data.code.toUpperCase(), name: parsed.data.name })
      .select()
      .single();
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await writeAuditEvent({
      action: "client.create",
      meta: { client_id: data.id, code: data.code, name: data.name },
    });
    toast.success("Client created");
    setCode("");
    setName("");
    qc.invalidateQueries({ queryKey: ["clients"] });
  };

  const removeClient = async (id: string, codeStr: string) => {
    if (isDemoUser) {
      toast.info("Demo session is read-only on Clients");
      return;
    }
    if (!confirm(`Delete client ${codeStr}? All assignments will be removed; documents linked to it will become unscoped.`)) {
      return;
    }
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await writeAuditEvent({ action: "client.delete", meta: { client_id: id, code: codeStr } });
    toast.success("Client deleted");
    qc.invalidateQueries({ queryKey: ["clients"] });
    qc.invalidateQueries({ queryKey: ["client-assignments"] });
  };

  const addAssignment = async () => {
    if (isDemoUser) {
      toast.info("Demo session is read-only on Clients");
      return;
    }
    if (!selectedClient || !assignUser) return;
    const exists = (assignmentsByClient.get(selectedClient) ?? []).some(
      (a) => a.user_id === assignUser,
    );
    if (exists) {
      toast.error("User already assigned");
      return;
    }
    const { error } = await supabase
      .from("client_assignments")
      .insert({ client_id: selectedClient, user_id: assignUser });
    if (error) {
      toast.error(error.message);
      return;
    }
    await writeAuditEvent({
      action: "client.assign",
      meta: { client_id: selectedClient, target_user: assignUser },
    });
    toast.success("User assigned");
    setAssignUser("");
    qc.invalidateQueries({ queryKey: ["client-assignments"] });
  };

  const removeAssignment = async (id: string, clientId: string, uid: string) => {
    if (isDemoUser) {
      toast.info("Demo session is read-only on Clients");
      return;
    }
    const { error } = await supabase.from("client_assignments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await writeAuditEvent({
      action: "client.unassign",
      meta: { client_id: clientId, target_user: uid },
    });
    toast.success("Assignment removed");
    qc.invalidateQueries({ queryKey: ["client-assignments"] });
  };

  if (!isManagerOrAdmin) {
    return (
      <div>
        <PageHeader title="Clients" description="Manager/Admin only." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Clients & Assignments"
        description="Create client records and assign which users may access documents linked to each client. Enforces 'need to know' segmentation."
      />

      {isDemoUser && (
        <div className="px-6 pt-6">
          <div className="surface-card flex items-start gap-3 border-warning/40 bg-warning/5 p-4">
            <div className="rounded-md bg-warning/15 p-2 text-warning">
              <Eye className="h-4 w-4" />
            </div>
            <div className="text-sm">
              <div className="font-semibold">Demo session — read-only</div>
              <p className="text-xs text-muted-foreground">
                Browse the populated client list and assignments to see how 'need to know'
                segmentation works. Create / delete / assign actions are disabled in the shared demo
                workspace.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-5">
        {/* Create + list */}
        <div className="surface-card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> New client
          </h2>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="ACME01"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={40}
                className="mono"
                disabled={isDemoUser}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                placeholder="Acme Holdings (Pty) Ltd"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                disabled={isDemoUser}
              />
            </div>
            <Button
              onClick={create}
              disabled={creating || isDemoUser}
              className="w-full"
              title={isDemoUser ? "Disabled in demo session" : undefined}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-1.5 h-4 w-4" /> Add client
            </Button>
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              All clients ({clients.data?.length ?? 0})
            </h3>
            {clients.isLoading && (
              <div className="text-sm text-muted-foreground">Loading…</div>
            )}
            {clients.data?.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No clients yet
              </div>
            )}
            {clients.data?.map((c) => {
              const count = assignmentsByClient.get(c.id)?.length ?? 0;
              const active = selectedClient === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClient(c.id)}
                  className={[
                    "w-full rounded-lg border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface hover:bg-muted/40",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{c.name}</div>
                      <div className="mono text-[11px] text-muted-foreground">
                        {c.code} · {count} user{count !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={isDemoUser}
                      title={isDemoUser ? "Disabled in demo session" : "Delete client"}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeClient(c.id, c.code);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Assignments */}
        <div className="surface-card p-5 lg:col-span-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Assignments
          </h2>
          {!selectedClient ? (
            <div className="mt-8 rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Select a client on the left to manage assignments.
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Add user to client</Label>
                  <Select value={assignUser} onValueChange={setAssignUser} disabled={isDemoUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a user…" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.data?.map((p) => (
                        <SelectItem key={p.user_id} value={p.user_id}>
                          {p.display_name || p.username || p.user_id.slice(0, 10)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={addAssignment}
                  disabled={!assignUser || isDemoUser}
                  title={isDemoUser ? "Disabled in demo session" : undefined}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Assign
                </Button>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Currently assigned
                </h3>
                {(assignmentsByClient.get(selectedClient) ?? []).length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No assignments yet. Documents tagged to this client will only be visible to managers/admins until users are assigned.
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {(assignmentsByClient.get(selectedClient) ?? []).map((a) => (
                    <span
                      key={a.id}
                      className="badge-dot bg-secondary text-secondary-foreground inline-flex items-center gap-1.5"
                    >
                      {userLabel(a.user_id)}
                      <button
                        type="button"
                        disabled={isDemoUser}
                        onClick={() => removeAssignment(a.id, selectedClient, a.user_id)}
                        className="rounded p-0.5 hover:bg-foreground/10 disabled:cursor-not-allowed disabled:opacity-40"
                        title={isDemoUser ? "Disabled in demo session" : "Remove"}
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients;
