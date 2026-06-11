import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [onboardingCheckDone, setOnboardingCheckDone] = useState(false);
  const [onboardingNeeded, setOnboardingNeeded] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // Re-check onboarding status on every location change (handles post-onboarding redirect)
  useEffect(() => {
    if (loading || !user) return;

    const checkOnboarding = async () => {
      try {
        // Auto-create studio if needed (once per user)
        const { data: membership } = await supabase
          .from("studio_members")
          .select("studio_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!membership) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("agency_name, email")
            .eq("id", user.id)
            .single();

          const studioName = profile?.agency_name || profile?.email?.split("@")[0] || "Mon Agence";

          const { data: studio } = await supabase
            .from("studios")
            .insert({ name: studioName, created_by: user.id })
            .select("id")
            .single();

          if (studio) {
            await supabase.from("studio_members").insert({
              studio_id: studio.id, user_id: user.id, role: "admin",
            });
            await supabase.from("profiles").update({ studio_id: studio.id }).eq("id", user.id);
          }
        }

        // Check onboarding
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", user.id)
          .single();

        setOnboardingNeeded(profile ? !profile.onboarding_completed : false);
      } catch {
        setOnboardingNeeded(false);
      } finally {
        setOnboardingCheckDone(true);
      }
    };

    checkOnboarding();
  }, [loading, user, location.pathname]);

  // Redirect to onboarding if needed and not already there
  useEffect(() => {
    if (onboardingCheckDone && onboardingNeeded && !location.pathname.includes("/dashboard/onboarding")) {
      navigate({ to: "/dashboard/onboarding" });
    }
  }, [onboardingCheckDone, onboardingNeeded, location.pathname, navigate]);

  if (loading || !user || !onboardingCheckDone) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Chargement…</div>
      </div>
    );
  }

  // Don't show the full layout for onboarding page
  if (location.pathname.includes("/dashboard/onboarding")) {
    return <Outlet />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center gap-3 border-b border-border/40 px-4">
            <SidebarTrigger className="hover:bg-primary/15 hover:text-primary" />
            <Logo variant="wordmark" size={14} className="text-muted-foreground" />
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
