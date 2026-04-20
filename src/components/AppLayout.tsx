import { Outlet, Link, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BreakGlassBanner } from "@/components/BreakGlassBanner";
import { ShieldCheck } from "lucide-react";

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
                <span className="badge-dot border border-success/30 bg-success/10 text-success">
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
      </div>
    </SidebarProvider>
  );
};
