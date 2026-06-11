import { createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/LandingHeader";
import { HeroSection } from "@/components/HeroSection";
import { BentoGrid } from "@/components/BentoGrid";
import { StudioPreview } from "@/components/StudioPreview";
import { StatsSection } from "@/components/StatsSection";
import { ManifestoSection } from "@/components/ManifestoSection";
import { LandingFooter } from "@/components/LandingFooter";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FORMA — Studio IA pour architectes" },
      {
        name: "description",
        content:
          "Render AI photoréaliste, Agent IA spécialisé en réglementation française (PLU, RE2020) et génération de plans. La plateforme des architectes.",
      },
      { property: "og:title", content: "FORMA — Studio IA pour architectes" },
      {
        property: "og:description",
        content:
          "Le studio tout-en-un alliant rendu photoréaliste, analyse réglementaire et gestion de projets.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary overflow-x-hidden relative">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[800px] right-10 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[600px] left-10 w-[450px] h-[450px] bg-primary/4 rounded-full blur-[150px] pointer-events-none" />

      <LandingHeader />
      <HeroSection />
      <BentoGrid />
      <StudioPreview />
      <StatsSection />
      <ManifestoSection />
      <LandingFooter />
    </div>
  );
}
