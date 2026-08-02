import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CheckCircle2, Clock, Layers, ShieldQuestion, XCircle } from "lucide-react";

type RequestStatus = "pending" | "approved" | "denied";

interface AccessRequest {
  id: string;
  requester: string;
  department: string;
  dataset: string;
  columns: string;
  reason: string;
  ttl: string;
  status: RequestStatus;
}

const initialRequests: AccessRequest[] = [
  {
    id: "REQ-1042",
    requester: "n.dlamini",
    department: "Collections",
    dataset: "vw_retail_customers",
    columns: "customer_ref, arrears_bucket",
    reason: "Arrears campaign for Q3 book",
    ttl: "14 days",
    status: "pending",
  },
  {
    id: "REQ-1039",
    requester: "t.mokoena",
    department: "Marketing",
    dataset: "vw_retail_customers",
    columns: "customer_ref, segment, email",
    reason: "Cross-sell list build",
    ttl: "7 days",
    status: "pending",
  },
  {
    id: "REQ-1031",
    requester: "s.pillay",
    department: "Fraud Ops",
    dataset: "vw_card_transactions",
    columns: "txn_id, merchant, amount",
    reason: "Chargeback pattern review",
    ttl: "30 days",
    status: "approved",
  },
  {
    id: "REQ-1024",
    requester: "b.khumalo",
    department: "Marketing",
    dataset: "vw_card_transactions",
    columns: "* (full view)",
    reason: "Ad-hoc analysis",
    ttl: "no expiry",
    status: "denied",
  },
];

interface ScopedView {
  name: string;
  owner: string;
  department: string;
  rowFilter: string;
  columns: number;
  masked: number;
  consumers: number;
  expires: string;
}

const scopedViews: ScopedView[] = [
  {
    name: "vw_collections_arrears",
    owner: "data-platform",
    department: "Collections",
    rowFilter: "portfolio = 'retail' AND arrears_days > 30",
    columns: 9,
    masked: 3,
    consumers: 12,
    expires: "2026-09-30",
  },
  {
    name: "vw_marketing_segments",
    owner: "data-platform",
    department: "Marketing",
    rowFilter: "consent_marketing = true",
    columns: 6,
    masked: 4,
    consumers: 21,
    expires: "2026-08-31",
  },
  {
    name: "vw_fraud_txn_window",
    owner: "fin-crime",
    department: "Fraud Ops",
    rowFilter: "txn_date > now() - interval '90 days'",
    columns: 11,
    masked: 2,
    consumers: 7,
    expires: "2026-10-15",
  },
  {
    name: "vw_retail_customers",
    owner: "legacy",
    department: "shared (4 depts)",
    rowFilter: "— none —",
    columns: 34,
    masked: 0,
    consumers: 96,
    expires: "never",
  },
];

interface CertLine {
  reviewer: string;
  scope: string;
  entitlements: number;
  reviewed: number;
  revoked: number;
  due: string;
}

const certification: CertLine[] = [
  { reviewer: "Head of Collections", scope: "vw_collections_arrears", entitlements: 12, reviewed: 12, revoked: 2, due: "2026-08-15" },
  { reviewer: "Head of Marketing", scope: "vw_marketing_segments", entitlements: 21, reviewed: 14, revoked: 3, due: "2026-08-15" },
  { reviewer: "Head of Fraud Ops", scope: "vw_fraud_txn_window", entitlements: 7, reviewed: 7, revoked: 0, due: "2026-08-15" },
  { reviewer: "CDO (escalated)", scope: "vw_retail_customers", entitlements: 96, reviewed: 18, revoked: 11, due: "2026-08-08" },
];

const statusBadge = (status: RequestStatus) =>
  status === "approved"
    ? "bg-success/15 text-success"
    : status === "denied"
      ? "bg-destructive/15 text-destructive"
      : "bg-warning/15 text-warning";

export const ScopedAccessPrototype = () => {
  const [requests, setRequests] = useState(initialRequests);

  const decide = (id: string, status: RequestStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(
      status === "approved"
        ? `${id} approved — a department-scoped view would be provisioned with the requested TTL.`
        : `${id} denied — requester keeps no access to the shared view.`,
      { description: "Prototype only: no real grants are issued." },
    );
  };

  const totals = useMemo(() => {
    const entitlements = certification.reduce((a, c) => a + c.entitlements, 0);
    const reviewed = certification.reduce((a, c) => a + c.reviewed, 0);
    const revoked = certification.reduce((a, c) => a + c.revoked, 0);
    return { entitlements, reviewed, revoked, pct: Math.round((reviewed / entitlements) * 100) };
  }, []);

  return (
    <article className="surface-card p-5">
      <header className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Layers className="h-4 w-4" />
        </div>
        <div>
          <h2 className="display text-base font-semibold tracking-tight">
            Prototype — request, scope, certify
          </h2>
          <p className="text-xs text-muted-foreground">
            Mock data. Nothing here provisions real grants.
          </p>
        </div>
      </header>

      <Tabs defaultValue="requests" className="mt-4">
        <TabsList>
          <TabsTrigger value="requests">Access requests</TabsTrigger>
          <TabsTrigger value="views">Scoped views</TabsTrigger>
          <TabsTrigger value="cert">Certification</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Dataset / columns</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>TTL</TableHead>
                  <TableHead className="text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="mono text-xs">{r.id}</TableCell>
                    <TableCell className="text-xs">
                      <div>{r.requester}</div>
                      <div className="text-muted-foreground">{r.department}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="mono">{r.dataset}</div>
                      <div className="text-muted-foreground">{r.columns}</div>
                    </TableCell>
                    <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                      {r.reason}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" /> {r.ttl}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => decide(r.id, "denied")}>
                            <XCircle className="mr-1 h-3.5 w-3.5" /> Deny
                          </Button>
                          <Button size="sm" onClick={() => decide(r.id, "approved")}>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Scope &amp; approve
                          </Button>
                        </div>
                      ) : (
                        <span className={`badge-dot capitalize ${statusBadge(r.status)}`}>
                          {r.status}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="views" className="mt-4 space-y-3">
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>View</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Row filter</TableHead>
                  <TableHead className="text-right">Cols / masked</TableHead>
                  <TableHead className="text-right">Consumers</TableHead>
                  <TableHead className="text-right">Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopedViews.map((v) => {
                  const risky = v.expires === "never" || v.masked === 0;
                  return (
                    <TableRow key={v.name}>
                      <TableCell className="mono text-xs">{v.name}</TableCell>
                      <TableCell className="text-xs">{v.department}</TableCell>
                      <TableCell className="mono max-w-[260px] truncate text-xs text-muted-foreground">
                        {v.rowFilter}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {v.columns} / {v.masked}
                      </TableCell>
                      <TableCell className="text-right text-xs">{v.consumers}</TableCell>
                      <TableCell className="text-right text-xs">
                        <span className={risky ? "text-warning" : "text-muted-foreground"}>
                          {v.expires}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <span>
              <span className="text-warning font-medium">vw_retail_customers</span> is the sprawl
              pattern: one legacy view, no row filter, no masking, 96 consumers across four
              departments. Every new request bolted onto it widens the blast radius instead of
              creating a scoped replacement.
            </span>
          </p>
        </TabsContent>

        <TabsContent value="cert" className="mt-4 space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Q3 2026 access certification campaign</span>
              <span className="mono text-muted-foreground">
                {totals.reviewed}/{totals.entitlements} reviewed · {totals.revoked} revoked
              </span>
            </div>
            <Progress value={totals.pct} className="mt-2.5 h-2" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead className="text-right">Entitlements</TableHead>
                  <TableHead className="text-right">Reviewed</TableHead>
                  <TableHead className="text-right">Revoked</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certification.map((c) => (
                  <TableRow key={c.scope}>
                    <TableCell className="text-xs">{c.reviewer}</TableCell>
                    <TableCell className="mono text-xs">{c.scope}</TableCell>
                    <TableCell className="text-right text-xs">{c.entitlements}</TableCell>
                    <TableCell className="text-right text-xs">
                      <span className={c.reviewed < c.entitlements ? "text-warning" : "text-success"}>
                        {c.reviewed}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs">{c.revoked}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{c.due}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            A production build would generate this report from the entitlement store on a fixed
            cadence, require named sign-off per line, auto-revoke anything unreviewed by the due
            date, and write every decision to the hash-chained audit trail as evidence.
          </p>
        </TabsContent>
      </Tabs>
    </article>
  );
};