import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  Layers,
  MessageSquare,
  FolderKanban,
  Check,
  ChevronRight,
  Maximize2,
  Lock,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { useState, useRef } from "react";

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
  // 1. Render AI Before/After Slider (Bento)
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPos(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const x = touch.clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPos(percentage);
  };

  // 1b. Hero Before/After Slider
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

  // 2. Agent IA regulatory zone selector
  const ZONES = ["UBa", "UCa", "AU", "N"] as const;
  type ZoneKey = (typeof ZONES)[number];
  const [agentZone, setAgentZone] = useState<ZoneKey>("UBa");

  const ZONE_DATA: Record<ZoneKey, { label: string; rules: { text: string; status: "ok" | "warn" | "error" }[] }> = {
    UBa: {
      label: "Zone urbaine pavillonnaire",
      rules: [
        { text: "Hauteur max sous sablière : 10m (R+2)", status: "ok" },
        { text: "Retrait minimum H/2 ≥ 3m", status: "ok" },
        { text: "Emprise au sol ≤ 40%", status: "warn" },
        { text: "Stationnement : 2 places / 100 m²", status: "ok" },
      ],
    },
    UCa: {
      label: "Zone urbaine mixte",
      rules: [
        { text: "Hauteur max : 15m (R+4)", status: "ok" },
        { text: "Retrait minimum : 4m", status: "ok" },
        { text: "Emprise au sol ≤ 50%", status: "ok" },
        { text: "Toiture terrasse autorisée", status: "ok" },
      ],
    },
    AU: {
      label: "Zone à urbaniser",
      rules: [
        { text: "Hauteur max : 9m (R+2)", status: "ok" },
        { text: "Densité minimale : 30 logts / ha", status: "ok" },
        { text: "Espaces verts ≥ 25%", status: "ok" },
        { text: "Étude préalable requise", status: "warn" },
      ],
    },
    N: {
      label: "Zone naturelle",
      rules: [
        { text: "Hauteur max : 7m (R+1)", status: "ok" },
        { text: "Emprise au sol ≤ 10%", status: "ok" },
        { text: "Extensions limitées à 30 m²", status: "ok" },
        { text: "Permis de construire requis", status: "ok" },
      ],
    },
  };

  // 3. Mini Archi 2D Plan interactive room highlight
  const [selectedRoom, setSelectedRoom] = useState<string>("séjour");
  const ROOM_DETAILS: Record<string, { size: string; energy: string; comfort: string }> = {
    séjour: { size: "48.5 m²", energy: "Classe A (RE2020)", comfort: "Exposition Sud" },
    chambre: { size: "14.2 m²", energy: "Classe A (PMR)", comfort: "Accès terrasse" },
    cuisine: { size: "12.8 m²", energy: "Classe B", comfort: "Aération mécanique" },
    terrasse: { size: "22.0 m²", energy: "N/A", comfort: "Brise-soleil orientable" },
  };

  // 4. Projects micro status toggle
  const [activeProjectStatus, setActiveProjectStatus] = useState<string>("review");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-primary overflow-x-hidden relative">
      {/* Decorative blurred backgrounds */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[800px] right-10 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[600px] left-10 w-[450px] h-[450px] bg-primary/4 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border/20 bg-background/70 transition-all duration-300">
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <Logo variant="full" size={28} className="text-primary transition-transform duration-500 group-hover:scale-105" />
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors relative py-1 group">
              Fonctionnalités
              <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#studio" className="hover:text-primary transition-colors relative py-1 group">
              Studio
              <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#manifesto" className="hover:text-primary transition-colors relative py-1 group">
              Notre vision
              <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-xs uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all duration-300">
                Connexion
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none border border-primary/20 text-xs uppercase tracking-widest px-6 h-11 shadow-gold">
                S'inscrire
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
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

        {/* Hero Before/After Slider */}
        <div className="w-full relative group">
          <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/0 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />
          <div className="relative border border-primary/20 bg-background/50 p-2 backdrop-blur-sm shadow-2xl rounded-lg overflow-hidden">
            <div
              ref={heroContainerRef}
              onMouseMove={handleHeroMouseMove}
              onTouchMove={handleHeroTouchMove}
              className="relative aspect-[21/9] w-full overflow-hidden rounded-md border border-border/40 select-none cursor-ew-resize"
            >
              {/* Before: Sketch Image */}
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

              {/* After: Color Render Image */}
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

              {/* Slider Handle Line */}
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

      {/* Interactive Bento Grid Showcase */}
      <section id="features" className="border-t border-border/20 bg-background py-32 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-20 text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">Fonctionnalités</p>
            <h2 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
              Quatre outils. <br />
              <span className="text-gradient-gold">Un seul studio.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 1. Large Card: Render AI with Before/After Slider */}
            <div className="lg:col-span-2 border border-border/30 bg-card/30 p-8 flex flex-col justify-between group hover:border-primary/40 transition-colors duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-[80px] pointer-events-none" />

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-primary">Rendu</span>
                </div>
                <h3 className="font-display text-3xl md:text-4xl mb-3">Render AI</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md mb-8">
                  Générez des rendus photoréalistes à partir de vos esquisses. Ajustez la lumière, les matériaux et l'environnement en quelques clics.
                </p>
              </div>

              {/* Slider Component */}
              <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                className="w-full aspect-[16/9] bg-[#0c0c0c] border border-border/40 relative overflow-hidden select-none cursor-ew-resize rounded"
              >
                {/* Before Image (Sketch) */}
                <div className="absolute inset-0 z-0 bg-[#0d0f12]">
                  <img
                    src="/sketch.jpg"
                    alt="Esquisse"
                    className="w-full h-full object-cover filter brightness-95"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(196,162,100,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(196,162,100,0.08)_1px,transparent_1px)] bg-[size:30px_30px]" />
                  <div className="absolute bottom-4 left-4 bg-background/80 px-2.5 py-1 text-[9px] font-mono text-muted-foreground">
                    ESQUISSE
                  </div>
                </div>

                {/* After Image (Render) */}
                <div
                  className="absolute inset-y-0 left-0 right-0 z-10 overflow-hidden bg-cover bg-center transition-all duration-75"
                  style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
                >
                  <img
                    src="/render.jpg"
                    alt="Rendu finalisé"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 bg-background/80 px-2.5 py-1 text-[9px] font-mono text-primary">
                    RENDU
                  </div>
                </div>

                {/* Slider Handle Line */}
                <div
                  className="absolute inset-y-0 z-20 w-px bg-primary transition-all duration-75"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full border border-primary bg-background flex items-center justify-center shadow-lg cursor-ew-resize">
                    <Maximize2 className="h-3 w-3 text-primary rotate-45" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Agent IA — Regulatory Dashboard Card */}
            <div className="border border-border/30 bg-card/30 p-8 flex flex-col justify-between group hover:border-primary/40 transition-colors duration-500 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-primary/2 rounded-full blur-[60px] pointer-events-none" />

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-primary">Réglementation</span>
                </div>
                <h3 className="font-display text-3xl mb-3">Agent IA</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Analysez la conformité de vos projets face au PLU, à la RE2020 et aux règles d'accessibilité. Résultats immédiats.
                </p>
              </div>

              {/* Regulation Dashboard */}
              <div className="bg-[#0a0a0a] border border-border/40 rounded p-4">
                {/* Zone selector tabs */}
                <div className="flex gap-1 mb-3">
                  {ZONES.map((zone) => (
                    <button
                      key={zone}
                      onClick={() => setAgentZone(zone)}
                      className={`px-2.5 py-1 text-[9px] font-mono uppercase tracking-wider rounded-sm border transition-all ${
                        agentZone === zone
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {zone}
                    </button>
                  ))}
                </div>

                <div className="text-[9px] text-muted-foreground mb-3 pb-2 border-b border-border/10">
                  {ZONE_DATA[agentZone].label}
                </div>

                {/* Rules list */}
                <div className="space-y-1.5 mb-3">
                  {ZONE_DATA[agentZone].rules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2 py-1">
                      {rule.status === "ok" && (
                        <Check className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />
                      )}
                      {rule.status === "warn" && (
                        <span className="h-3 w-3 flex items-center justify-center text-amber-400 mt-0.5 shrink-0 text-[8px] font-bold">!</span>
                      )}
                      {rule.status === "error" && (
                        <span className="h-3 w-3 flex items-center justify-center text-red-400 mt-0.5 shrink-0 text-[8px]">&#10005;</span>
                      )}
                      <span className="text-[10px] text-muted-foreground leading-relaxed">{rule.text}</span>
                    </div>
                  ))}
                </div>

                {/* Status badge */}
                <div className="bg-primary/5 border border-primary/10 rounded px-3 py-2 flex items-center justify-between">
                  <span className="text-[9px] font-mono text-muted-foreground">Conformité</span>
                  <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check className="h-2.5 w-2.5" /> Vérifiée
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Mini Archi 2D Plan card */}
            <div className="border border-border/30 bg-card/30 p-8 flex flex-col justify-between group hover:border-primary/40 transition-colors duration-500 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-[200px] h-[200px] bg-primary/2 rounded-full blur-[60px] pointer-events-none" />

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Layers className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-primary">Plans</span>
                </div>
                <h3 className="font-display text-3xl mb-3">Mini Archi</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Créez et modifiez des plans d'étage en 2D. Testez plusieurs variantes d'agencement et visualisez les surfaces en un clic.
                </p>
              </div>

              {/* Interactive SVG floor plan */}
              <div className="border border-border/40 p-4 bg-[#0a0a0a] rounded flex flex-col items-center gap-4 relative">
                <svg viewBox="0 0 200 150" className="w-full h-32 text-foreground font-sans">
                  {/* Séjour */}
                  <rect
                    x="8"
                    y="8"
                    width="112"
                    height="82"
                    fill={selectedRoom === "séjour" ? "rgba(196, 162, 100, 0.12)" : "transparent"}
                    stroke={selectedRoom === "séjour" ? "var(--primary)" : "rgba(196, 162, 100, 0.25)"}
                    strokeWidth="1"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedRoom("séjour")}
                    rx="0"
                  />
                  <text x="64" y="48" textAnchor="middle" className="text-[8px] fill-foreground font-medium pointer-events-none">
                    Séjour
                  </text>
                  <text x="64" y="58" textAnchor="middle" className="text-[7px] fill-muted-foreground pointer-events-none">
                    48.5 m²
                  </text>

                  {/* Chambre */}
                  <rect
                    x="124"
                    y="8"
                    width="68"
                    height="46"
                    fill={selectedRoom === "chambre" ? "rgba(196, 162, 100, 0.12)" : "transparent"}
                    stroke={selectedRoom === "chambre" ? "var(--primary)" : "rgba(196, 162, 100, 0.25)"}
                    strokeWidth="1"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedRoom("chambre")}
                    rx="0"
                  />
                  <text x="158" y="32" textAnchor="middle" className="text-[7px] fill-foreground font-medium pointer-events-none">
                    Chambre
                  </text>
                  <text x="158" y="41" textAnchor="middle" className="text-[6px] fill-muted-foreground pointer-events-none">
                    14.2 m²
                  </text>

                  {/* Cuisine */}
                  <rect
                    x="124"
                    y="58"
                    width="68"
                    height="32"
                    fill={selectedRoom === "cuisine" ? "rgba(196, 162, 100, 0.12)" : "transparent"}
                    stroke={selectedRoom === "cuisine" ? "var(--primary)" : "rgba(196, 162, 100, 0.25)"}
                    strokeWidth="1"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedRoom("cuisine")}
                    rx="0"
                  />
                  <text x="158" y="76" textAnchor="middle" className="text-[7px] fill-foreground font-medium pointer-events-none">
                    Cuisine
                  </text>
                  <text x="158" y="84" textAnchor="middle" className="text-[6px] fill-muted-foreground pointer-events-none">
                    12.8 m²
                  </text>

                  {/* Terrasse */}
                  <rect
                    x="8"
                    y="94"
                    width="184"
                    height="48"
                    strokeDasharray="3 2"
                    fill={selectedRoom === "terrasse" ? "rgba(196, 162, 100, 0.12)" : "transparent"}
                    stroke={selectedRoom === "terrasse" ? "var(--primary)" : "rgba(196, 162, 100, 0.25)"}
                    strokeWidth="1"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedRoom("terrasse")}
                    rx="0"
                  />
                  <text x="100" y="118" textAnchor="middle" className="text-[7px] fill-foreground font-medium pointer-events-none">
                    Terrasse
                  </text>
                  <text x="100" y="127" textAnchor="middle" className="text-[6px] fill-muted-foreground pointer-events-none">
                    22.0 m²
                  </text>
                </svg>

                {/* Room Info Tooltip */}
                <div className="w-full bg-[#111] border border-border/40 p-2.5 flex items-center justify-between text-[9px] font-mono">
                  <div>
                    <div className="text-primary font-semibold uppercase">{selectedRoom}</div>
                    <div className="text-muted-foreground">{ROOM_DETAILS[selectedRoom].size}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground">{ROOM_DETAILS[selectedRoom].comfort}</div>
                    <div className="text-emerald-400 font-medium">{ROOM_DETAILS[selectedRoom].energy}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Large Card: Projects Kanban board */}
            <div className="lg:col-span-2 border border-border/30 bg-card/30 p-8 flex flex-col justify-between group hover:border-primary/40 transition-colors duration-500 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/2 rounded-full blur-[80px] pointer-events-none" />

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <FolderKanban className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-primary">Gestion</span>
                </div>
                <h3 className="font-display text-3xl md:text-4xl mb-3">Projets</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md mb-8">
                  Suivez vos projets de l'esquisse au chantier. Organisez vos documents, collaborez avec votre équipe et partagez les rendus.
                </p>
              </div>

              {/* Kanban interface */}
              <div className="grid grid-cols-3 gap-3 bg-[#0a0a0a] p-4 border border-border/40 rounded">
                {/* Column 1: Esquisse */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/20">
                    <span>Esquisse</span>
                    <span className="text-primary font-mono">2</span>
                  </div>
                  <div className="bg-[#121212] p-3 border border-border/20 rounded-sm space-y-1.5 opacity-60">
                    <div className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 max-w-max rounded-full">
                      Maison
                    </div>
                    <div className="text-[10px] font-medium text-foreground">Villa Cap-Ferret</div>
                  </div>
                  <div className="bg-[#121212] p-3 border border-border/20 rounded-sm space-y-1.5 opacity-60">
                    <div className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 max-w-max rounded-full">
                      Maison
                    </div>
                    <div className="text-[10px] font-medium text-foreground">Bordeaux Bastide</div>
                  </div>
                </div>

                {/* Column 2: Permis */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/20">
                    <span>Permis</span>
                    <span className="text-primary font-mono">1</span>
                  </div>

                  {/* Toggle card */}
                  <div
                    onClick={() => setActiveProjectStatus(activeProjectStatus === "review" ? "done" : "review")}
                    className={`p-3 border rounded-sm space-y-1.5 cursor-pointer transition-all duration-300 ${
                      activeProjectStatus === "review"
                        ? "bg-primary/5 border-primary/40 shadow-lg shadow-primary/5"
                        : "bg-[#121212] border-border/20 opacity-60"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-[9px] px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 max-w-max rounded-full">
                        Rénovation
                      </div>
                      {activeProjectStatus === "review" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </div>
                    <div className="text-[10px] font-medium text-foreground">Maison Sablonsière</div>
                    <div className="text-[8px] font-mono text-muted-foreground flex items-center justify-between pt-1 border-t border-border/10">
                      <span>Statut</span>
                      <span className={activeProjectStatus === "review" ? "text-amber-400" : "text-emerald-400"}>
                        {activeProjectStatus === "review" ? "RE2020" : "Validé"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Chantier */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/20">
                    <span>Chantier</span>
                    <span className="text-primary font-mono">1</span>
                  </div>

                  <div
                    className={`p-3 border rounded-sm space-y-1.5 transition-all duration-300 ${
                      activeProjectStatus === "done"
                        ? "bg-emerald-950/20 border-emerald-500/30 shadow-md shadow-emerald-500/5"
                        : "bg-[#121212] border-border/20 opacity-60"
                    }`}
                  >
                    <div className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 max-w-max rounded-full">
                      Tertiaire
                    </div>
                    <div className="text-[10px] font-medium text-foreground">Siège Ecopolis</div>
                    <div className="text-[8px] font-mono text-emerald-400 flex items-center gap-1 pt-1 border-t border-border/10">
                      <Check className="h-2.5 w-2.5" /> Gros œuvre
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Le Studio — Dashboard Preview */}
      <section id="studio" className="py-32 border-t border-border/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[180px] pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-16 text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">L'interface</p>
            <h2 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
              Le Studio <span className="text-gradient-gold">FORMA</span>
            </h2>
          </div>

          {/* Dashboard mockup */}
          <div className="border border-border/30 bg-card/30 rounded-lg overflow-hidden shadow-2xl">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 h-14 border-b border-border/20 bg-background/50">
              <div className="flex items-center gap-3">
                <Logo size={18} className="text-primary" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider ml-4 border-l border-border/20 pl-4">Studio</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10" />
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* Body: sidebar + content */}
            <div className="flex h-96">
              {/* Sidebar */}
              <div className="w-56 border-r border-border/20 bg-background/30 p-4 space-y-6 hidden md:block">
                {[
                  { icon: <Sparkles className="h-4 w-4" />, label: "Render AI", active: false },
                  { icon: <MessageSquare className="h-4 w-4" />, label: "Agent IA", active: true },
                  { icon: <Layers className="h-4 w-4" />, label: "Mini Archi", active: false },
                  { icon: <FolderKanban className="h-4 w-4" />, label: "Projets", active: false },
                ].map((item) => (
                  <div key={item.label} className={`flex items-center gap-3 px-3 py-2 rounded text-xs tracking-wider uppercase ${item.active ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:text-foreground'}`}>
                    {item.icon}
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content mockup */}
              <div className="flex-1 p-6 bg-[#0a0a0a] flex items-start">
                <div className="max-w-2xl w-full space-y-4">
                  <div className="bg-primary/5 border border-primary/10 p-4 rounded max-w-xs ml-auto">
                    <p className="text-[10px] font-mono text-primary/90">Quelles sont les règles PLU pour cette parcelle ?</p>
                  </div>
                  <div className="bg-muted/30 border border-border/10 p-4 rounded max-w-md">
                    <p className="text-[10px] font-mono text-muted-foreground">Selon le PLU de la zone UBa, hauteur max 10m sous sablière, R+2 autorisé avec retrait H/2...</p>
                  </div>
                  <div className="bg-primary/5 border border-primary/10 p-4 rounded max-w-xs ml-auto">
                    <p className="text-[10px] font-mono text-primary/90">Génère-moi une variante avec un étage supplémentaire</p>
                  </div>
                  <div className="bg-muted/30 border border-border/10 p-4 rounded max-w-md">
                    <p className="text-[10px] font-mono text-muted-foreground">Variante générée : R+2 avec toiture terrasse, retrait 5.5m, structure bois RE2020 conforme.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature tags */}
          <div className="mt-12 flex flex-wrap gap-3 justify-center">
            {["Rendu photoréaliste", "Agent réglementaire", "Plans 2D", "Kanban projets", "Export DXF", "Multi-utilisateurs"].map((tag) => (
              <span key={tag} className="px-4 py-2 border border-primary/20 bg-primary/5 text-[10px] uppercase tracking-wider text-primary rounded-full">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-none h-14 px-12 text-xs uppercase tracking-widest shadow-gold transition-all duration-300 group">
                Accéder au Studio <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-32 border-t border-border/20 relative bg-gradient-to-b from-background to-[#080808]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: "97 %", label: "de conformité réglementaire au premier dépôt" },
              { num: "15 000+", label: "documents d'urbanisme analysés" },
              { num: "7 200+", label: "rendus générés par nos utilisateurs" },
              { num: "3 min", label: "pour analyser un PLU complet" },
            ].map((stat, i) => (
              <div key={i} className="text-left space-y-2 border-l border-primary/20 pl-6">
                <div className="font-display text-5xl md:text-7xl text-gradient-gold font-light">{stat.num}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest leading-relaxed">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Manifesto */}
      <section id="manifesto" className="py-28 border-t border-border/20 relative bg-[#060606] flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent blur-[120px] pointer-events-none" />

        <div className="mx-auto max-w-4xl px-6 text-center space-y-8">
          <div className="h-px w-16 bg-primary/30 mx-auto" />

          <blockquote className="font-display text-3xl md:text-5xl lg:text-6xl leading-snug tracking-wide italic font-light max-w-3xl mx-auto">
            « L'architecture est l'art savant, correct et magnifique des volumes assemblés sous la lumière. »
          </blockquote>

          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-primary">Le Corbusier</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Vers une architecture, 1923</p>
          </div>

          <div className="max-w-xl mx-auto text-sm text-muted-foreground leading-relaxed">
            <p>
              Nous croyons que la technologie doit servir cette recherche de justesse — sans remplacer le regard de l'architecte, sans dicter ses choix. Nos outils accélèrent les tâches répétitives et clarifient les contraintes réglementaires, pour laisser plus de temps à ce qui compte : concevoir.
            </p>
          </div>

          <div className="h-px w-16 bg-primary/30 mx-auto" />

          <div className="pt-4">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-none h-14 px-12 text-xs uppercase tracking-widest shadow-gold transition-all duration-300">
                Créer un compte
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-20 bg-background relative">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-left mb-16">
          <div className="space-y-4">
            <Logo size={22} className="text-primary" />
            <p className="text-[11px] text-muted-foreground leading-relaxed font-light">
              La plateforme tout-en-un pour les agences d'architecture. Rendu, réglementation et gestion de projets.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.20em] text-primary mb-4">Produits</h4>
            <ul className="space-y-2 text-[11px] text-muted-foreground">
              <li><Link to="/auth" className="hover:text-primary transition-colors">Render AI</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Agent IA</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Mini Archi</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Projets</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.20em] text-primary mb-4">Technologie</h4>
            <ul className="space-y-2 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-1.5">Données chiffrées <Lock className="h-2.5 w-2.5 text-primary/60" /></li>
              <li>Analyse réglementaire par IA</li>
              <li>Rendu 3D temps réel</li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.20em] text-primary mb-4">Contact</h4>
            <p className="text-[11px] text-muted-foreground font-mono">
              bonjour@forma.archi <br />
              Paris, France
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pt-8 border-t border-border/10 flex flex-col sm:flex-row justify-between items-center text-[10px] text-muted-foreground tracking-wider uppercase">
          <span>© {new Date().getFullYear()} FORMA. Tous droits réservés.</span>
          <span className="flex items-center gap-1.5 mt-4 sm:mt-0">
            Conçu pour les architectes <Compass className="h-3 w-3 text-primary" />
          </span>
        </div>
      </footer>
    </div>
  );
}
