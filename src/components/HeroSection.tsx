import { useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const [heroSliderPos, setHeroSliderPos] = useState(50);
  const heroContainerRef = useRef<HTMLDivElement>(null);

  const handleHeroMouseMove = (e: React.MouseEvent) => {
    if (!heroContainerRef.current) return;
    const rect = heroContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setHeroSliderPos(percentage);
  };

  const handleHeroTouchMove = (e: React.TouchEvent) => {
    if (!heroContainerRef.current) return;
    const rect = heroContainerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const x = touch.clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setHeroSliderPos(percentage);
  };

  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-36 lg:pt-28 flex flex-col items-center text-center">
      <div className="absolute top-12 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm text-[10px] uppercase tracking-[0.3em] text-primary mb-8 animate-fade-in">
        Solutions IA pour l'architecture
      </div>

      <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.95] tracking-tight mt-12 mb-8 max-w-5xl">
        La forme suit <br />
        <span className="text-gradient-gold italic">l'intelligence.</span>
      </h1>

      <p className="text-sm md:text-base text-muted-foreground max-w-2xl mb-12 leading-relaxed tracking-wide font-light">
        FORMA combine rendu photoréaliste, analyse réglementaire et pilotage de projets dans une seule plateforme. Conçue par des architectes, pour les architectes.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-24 z-10">
        <Link to="/auth">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-none h-14 px-8 text-xs uppercase tracking-widest shadow-gold transition-all duration-300 group">
            Commencer <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
        <a href="#features">
          <Button size="lg" variant="outline" className="rounded-none h-14 px-8 text-xs uppercase tracking-widest border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60 transition-all duration-300">
            Voir les fonctionnalités
          </Button>
        </a>
      </div>

      <div className="w-full relative group">
        <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/0 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />
        <div className="relative border border-primary/20 bg-background/50 p-2 backdrop-blur-sm shadow-2xl rounded-lg overflow-hidden">
          <div
            ref={heroContainerRef}
            onMouseMove={handleHeroMouseMove}
            onTouchMove={handleHeroTouchMove}
            className="relative aspect-[21/9] w-full overflow-hidden rounded-md border border-border/40 select-none cursor-ew-resize"
          >
            <div className="absolute inset-0 z-0 bg-[#0d0f12]">
              <img
                src="/sketch.jpg"
                alt="Esquisse originale"
                className="w-full h-full object-cover filter brightness-95"
              />
              <div className="absolute top-4 left-4 bg-background/80 px-3 py-1.5 text-[9px] font-mono text-muted-foreground">
                ESQUISSE
              </div>
            </div>

            <div
              className="absolute inset-y-0 left-0 right-0 z-10 overflow-hidden bg-cover bg-center transition-all duration-75"
              style={{ clipPath: `polygon(0 0, ${heroSliderPos}% 0, ${heroSliderPos}% 100%, 0 100%)` }}
            >
              <img
                src="/render.jpg"
                alt="Rendu finalisé"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 bg-background/80 px-3 py-1.5 text-[9px] font-mono text-primary">
                RENDU FORMA
              </div>
            </div>

            <div
              className="absolute inset-y-0 z-20 w-px bg-primary transition-all duration-75"
              style={{ left: `${heroSliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-9 w-9 rounded-full border border-primary bg-background flex items-center justify-center shadow-lg cursor-ew-resize">
                <Maximize2 className="h-3.5 w-3.5 text-primary rotate-45" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
