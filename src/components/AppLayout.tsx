import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BreakGlassBanner } from "@/components/BreakGlassBanner";

export const AppLayout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="flex flex-1 items-center justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold tracking-tight">BankOps Copilot</span>
                <span className="badge-dot bg-success/15 text-success border border-success/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  LOCAL
                </span>
              </div>
              <div className="mono text-xs text-muted-foreground">
                {new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
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
