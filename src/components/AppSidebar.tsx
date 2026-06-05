import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sparkles, MessageSquare, LayoutGrid, FolderKanban, Settings, LogOut, Layers,
  Users, BrainCircuit,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { title: "Render AI", url: "/dashboard/render", icon: Sparkles },
  { title: "Agent IA", url: "/dashboard/agent", icon: MessageSquare },
  { title: "Mini Archi", url: "/dashboard/mini-archi", icon: Layers },
  { title: "Projets", url: "/dashboard/projets", icon: FolderKanban },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-sm gold-gradient flex items-center justify-center">
            <LayoutGrid className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-display text-2xl tracking-wide text-primary">FORMA</span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 uppercase tracking-widest text-[10px]">
            Studio
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = path === item.url || path.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}
                      className="hover:bg-primary/15 hover:text-primary data-[active=true]:bg-primary/20 data-[active=true]:text-primary">
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path.startsWith("/dashboard/studio")}
                  className="hover:bg-primary/15 hover:text-primary">
                  <Link to="/dashboard/studio" className="flex items-center gap-3">
                    <Users className="h-4 w-4" />
                    {!collapsed && <span>Équipe</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path.startsWith("/dashboard/memories")}
                  className="hover:bg-primary/15 hover:text-primary">
                  <Link to="/dashboard/memories" className="flex items-center gap-3">
                    <BrainCircuit className="h-4 w-4" />
                    {!collapsed && <span>Mémoires</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground/70 uppercase tracking-widest text-[10px]">
            Compte
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={path.startsWith("/dashboard/settings")}
                  className="hover:bg-primary/15 hover:text-primary">
                  <Link to="/dashboard/settings" className="flex items-center gap-3">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>Paramètres</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut}
              className="hover:bg-primary/15 hover:text-primary">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
