import {
  LayoutDashboard,
  UploadCloud,
  KeyRound,
  Sparkles,
  ShieldCheck,
  Users,
  Landmark,
  Building2,
  BookOpen,
  ListChecks,
  Layers,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "How it works", url: "/how-it-works", icon: BookOpen },
  { title: "Roadmap", url: "/roadmap", icon: ListChecks },
  { title: "Upload & Store", url: "/upload", icon: UploadCloud },
  { title: "Tokens", url: "/tokens", icon: KeyRound },
  { title: "AI Assist", url: "/assist", icon: Sparkles },
  { title: "Audit", url: "/audit", icon: ShieldCheck },
  { title: "Access Requests", url: "/access-requests", icon: Layers },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, roles, isManagerOrAdmin, signOut } = useAuth();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const linkClass = (active: boolean) =>
    [
      "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors",
      active
        ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
    ].join(" ");

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-primary shadow-glow">
            <Landmark className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="display text-sm font-semibold text-sidebar-foreground">BankOps</span>
              <span className="text-[11px] text-sidebar-foreground/60 mono">Copilot · v1.0</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className={() => linkClass(isActive(item.url))}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isManagerOrAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className={() => linkClass(isActive("/admin"))}>
                      <Users className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Admin & Access</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/clients" className={() => linkClass(isActive("/clients"))}>
                      <Building2 className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Clients</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed ? (
          <div className="px-2 py-2 space-y-2">
            <div className="text-[11px] text-sidebar-foreground/60 truncate">{user?.email}</div>
            <div className="flex flex-wrap gap-1">
              {roles.length === 0 && (
                <span className="badge-dot bg-muted text-muted-foreground">no role</span>
              )}
              {roles.map((r) => (
                <span key={r} className="badge-dot bg-secondary text-secondary-foreground capitalize">
                  {r}
                </span>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => signOut()}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <Button size="icon" variant="ghost" onClick={() => signOut()} className="mx-auto my-2">
            <span className="sr-only">Sign out</span>
            <KeyRound className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
