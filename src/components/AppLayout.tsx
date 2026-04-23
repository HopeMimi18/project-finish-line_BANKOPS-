import { Outlet, Link, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BreakGlassBanner } from "@/components/BreakGlassBanner";
import { DevRolePanel } from "@/components/DevRolePanel";
import { Keyboard, ShieldCheck } from "lucide-react";

const ROUTE_TITLES: Record<string, string> = {
  "/": "Overview",
  "/upload": "Upload & Store",
  "/tokens": "Access Tokens",
  "/assist": "AI Assist",
  "/audit": "Audit Log",
  "/admin": "Admin & Access",
  "/clients": "Clients",
};

export const AppLayout = () => {
  const location = useLocation();
  const matched = Object.keys(ROUTE_TITLES)
    .filter((p) => (p === "/" ? location.pathname === "/" : location.pathname.startsWith(p)))
    .sort((a, b) => b.length - a.length)[0];
  const crumb = matched ? ROUTE_TITLES[matched] : "";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-md">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex flex-1 items-center justify-between">
              <nav className="flex items-baseline gap-2 text-sm" aria-label="Breadcrumb">
                <Link
                  to="/"
                  className="display font-semibold tracking-tight text-foreground hover:text-primary"
                >
                  BankOps Copilot
                </Link>
                {crumb && (
                  <>
                    <span className="text-muted-foreground/50">/</span>
                    <span className="text-muted-foreground">{crumb}</span>
                  </>
                )}
              </nav>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const ev = new KeyboardEvent("keydown", { key: "?" });
                    window.dispatchEvent(ev);
                  }}
                  className="hidden items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
                  title="Keyboard shortcuts (?)"
                >
                  <Keyboard className="h-3 w-3" />
                  <kbd className="mono">?</kbd>
                </button>
                <span className="hidden badge-dot border border-success/30 bg-success/10 text-success sm:inline-flex">
                  <ShieldCheck className="h-3 w-3" />
                  Secure session
                </span>
                <div className="hidden mono text-xs text-muted-foreground md:block">
                  {new Date().toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </div>
              </div>
            </div>
          </header>

          <BreakGlassBanner />
          <main className="flex-1 animate-fade-in">
            <Outlet />
          </main>
        </div>
        <DevRolePanel variant="floating" />
      </div>
    </SidebarProvider>
  );
};
