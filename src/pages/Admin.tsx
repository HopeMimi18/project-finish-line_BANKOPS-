import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { writeAuditEvent } from "@/lib/security";
import { AnomalyAlerts } from "@/components/AnomalyAlerts";
import { BreakGlassToggle } from "@/components/BreakGlassToggle";
import { SeedDemoDataButton } from "@/components/SeedDemoDataButton";
import { AuditChainVerifier } from "@/components/AuditChainVerifier";
import { DevRolePanel } from "@/components/DevRolePanel";

const ROLES: AppRole[] = ["support", "ops", "compliance", "manager", "admin"];

const ROLE_TONE: Record<AppRole, string> = {
  support: "bg-secondary text-secondary-foreground",
  ops: "bg-primary/15 text-primary",
  compliance: "bg-accent/20 text-accent",
  manager: "bg-success/15 text-success",
  admin: "bg-destructive/15 text-destructive",
};

interface ProfileRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
}

const Admin = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("ops");

  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const allRoles = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, user_id, role");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rolesByUser = useMemo(() => {
    const m = new Map<string, { id: string; role: AppRole }[]>();
    for (const r of allRoles.data ?? []) {
      const list = m.get(r.user_id) ?? [];
      list.push({ id: r.id, role: r.role as AppRole });
      m.set(r.user_id, list);
    }
    return m;
  }, [allRoles.data]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return profiles.data ?? [];
    return (profiles.data ?? []).filter(
      (p) =>
        (p.username ?? "").toLowerCase().includes(s) ||
        (p.display_name ?? "").toLowerCase().includes(s) ||
        p.user_id.toLowerCase().includes(s),
    );
  }, [search, profiles.data]);

  const assign = async (userId: string, role: AppRole) => {
    const existing = rolesByUser.get(userId) ?? [];
    if (existing.some((r) => r.role === role)) {
      toast.error("User already has that role");
      return;
    }
    const { error } = await supabase.rpc("assign_user_role", {
      _target_user: userId,
      _role: role,
    });
    if (error) {
      toast.error(error.message);
      await writeAuditEvent({
        action: "role.assign",
        result: "error",
        meta: { target_user: userId, role, error: error.message },
      });
      return;
    }
    toast.success(`Granted '${role}'`);
    await writeAuditEvent({
      action: "role.assign",
      meta: { target_user: userId, role },
    });
    setAddingFor(null);
    qc.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  const remove = async (roleId: string, userId: string, role: AppRole) => {
    if (userId === user?.id && (role === "manager" || role === "admin")) {
      if (!confirm("Remove your OWN privileged role? You may lose admin access.")) return;
    }
    const { error } = await supabase.rpc("remove_user_role", {
      _role_id: roleId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Removed '${role}'`);
    await writeAuditEvent({
      action: "role.remove",
      meta: { target_user: userId, role },
    });
    qc.invalidateQueries({ queryKey: ["admin-roles"] });
  };

  const loading = profiles.isLoading || allRoles.isLoading;

  return (
    <div>
      <PageHeader
        title="Admin & Access"
        description="Manage user roles. Roles control which classifications a user can read."
        actions={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 pl-8"
            />
          </div>
        }
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <SeedDemoDataButton />
          <AuditChainVerifier />
        </div>
        <DevRolePanel variant="card" />
        <BreakGlassToggle />
        <AnomalyAlerts />
        <div className="surface-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading users…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No users found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="w-[280px]">Assign role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const userRoles = rolesByUser.get(p.user_id) ?? [];
                  const isAdding = addingFor === p.user_id;
                  return (
                    <TableRow key={p.user_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {p.display_name || p.username || "—"}
                          </span>
                          <span className="mono text-[11px] text-muted-foreground">
                            {p.user_id.slice(0, 8)}…
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {userRoles.length === 0 && (
                            <span className="badge-dot bg-muted text-muted-foreground">
                              no role
                            </span>
                          )}
                          {userRoles.map((r) => (
                            <span
                              key={r.id}
                              className={`badge-dot capitalize ${ROLE_TONE[r.role]} group inline-flex items-center gap-1`}
                            >
                              {r.role}
                              <button
                                type="button"
                                onClick={() => remove(r.id, p.user_id, r.role)}
                                className="ml-0.5 rounded p-0.5 hover:bg-foreground/10"
                                aria-label={`Remove ${r.role}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {isAdding ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={newRole}
                              onValueChange={(v) => setNewRole(v as AppRole)}
                            >
                              <SelectTrigger className="h-8 w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLES.map((r) => (
                                  <SelectItem key={r} value={r} className="capitalize">
                                    {r}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => assign(p.user_id, newRole)}
                            >
                              Grant
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setAddingFor(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAddingFor(p.user_id);
                              setNewRole("ops");
                            }}
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add role
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Role rules: <span className="mono">support / ops / compliance</span> grant read access to documents of that classification.{" "}
          <span className="mono">manager / admin</span> can read all documents and manage roles.
        </p>
      </div>
    </div>
  );
};

export default Admin;
