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
  Building,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FORMA — Studio IA pour architectes" },
      {
        name: "description",
        content:
          "Render AI photoréaliste, Agent IA spécialisé en réglementation française (PLU, RE2020) et génération de plans spatiaux. La plateforme haut de gamme des architectes.",
      },
      { property: "og:title", content: "FORMA — Studio IA pour architectes" },
      {
        property: "og:description",
        content:
          "Le studio de création tout-en-un alliant haute technologie et design architectural d'excellence.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  // States for interactive features
  // 1. Render AI Before/After Slider
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

  // 2. Chat Agent Auto-Typer Simulator
  const SIMULATED_CHAT = [
    {
      role: "user",
      text: "Le PLU autorise-t-il R+2 avec hauteur faîtage de 11m en zone UBa ?",
    },
    {
      role: "agent",
      text: "En zone UBa, l'art. 10 limite la hauteur sous sablière à 10m (R+2). Une dérogation à 11.5m au faîtage est accordée si vous intégrez une toiture végétalisée ou une structure bois conforme RE2020.",
    },
    {
      role: "user",
      text: "Quid de la distance minimale avec les limites séparatives ?",
    },
    {
      role: "agent",
      text: "Selon l'art. 7, la règle H/2 s'applique avec un retrait minimum de 3m. Pour un faîtage à 11m, prévoyez un retrait minimal de 5.5m par rapport aux parcelles voisines.",
    },
  ];

  const [chatStep, setChatStep] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [activeChat, setActiveChat] = useState<typeof SIMULATED_CHAT>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const current = SIMULATED_CHAT[chatStep];
    if (!current) {
      // Loop reset
      timer = setTimeout(() => {
        setActiveChat([]);
        setChatStep(0);
        setTypedText("");
      }, 5000);
      return () => clearTimeout(timer);
    }

    let index = 0;
    const interval = setInterval(() => {
      setTypedText((prev) => prev + current.text.charAt(index));
      index++;
      if (index >= current.text.length) {
        clearInterval(interval);
        // Save current to active list
        setActiveChat((prev) => [...prev, { role: current.role, text: current.text }]);
        setTypedText("");
        timer = setTimeout(() => {
          setChatStep((s) => s + 1);
        }, 2000);
      }
    }, 25);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [chatStep]);

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
      {/* Decorative blurred backgrounds - Awwwards ambient lights */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[800px] right-10 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[600px] left-10 w-[450px] h-[450px] bg-primary/4 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-border/20 bg-background/70 transition-all duration-300">
        <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-sm gold-gradient flex items-center justify-center shadow-lg shadow-primary/10 transition-transform duration-500 group-hover:rotate-[90deg]">
              <Compass className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl tracking-[0.15em] text-primary">FORMA</span>
          </Link>

          <nav className="hidden md:flex items-center gap-10 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <a href="#features" className="hover:text-primary transition-colors relative py-1 group">
              Fonctionnalités
              <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#studio" className="hover:text-primary transition-colors relative py-1 group">
              Le Studio
              <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
            <a href="#manifesto" className="hover:text-primary transition-colors relative py-1 group">
              Manifeste
              <span className="absolute bottom-0 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-xs uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all duration-300">
                Studio
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none border border-primary/20 text-xs uppercase tracking-widest px-6 h-11 shadow-gold">
                Nous rejoindre
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pt-20 pb-36 lg:pt-28 flex flex-col items-center text-center">
        <div className="absolute top-12 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 backdrop-blur-sm text-[10px] uppercase tracking-[0.3em] text-primary mb-8 animate-fade-in">
          ★ L'OS architectural piloté par l'IA
        </div>

        <h1 className="font-display text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-[0.95] tracking-tight mt-12 mb-8 max-w-5xl">
          La forme suit <br />
          <span className="text-gradient-gold italic">l'intelligence.</span>
        </h1>

        <p className="text-sm md:text-base text-muted-foreground max-w-2xl mb-12 leading-relaxed tracking-wide font-light">
          FORMA orchestre l'IA générative pour sublimer l'architecture. Rendu photoréaliste d'une précision absolue, agent expert en droit d'urbanisme français et planification 2D/3D dynamique au sein d'un écosystème d'exception.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-24 z-10">
          <Link to="/auth">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-none h-14 px-8 text-xs uppercase tracking-widest shadow-gold transition-all duration-300 group">
              Commencer l'expérience <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="rounded-none h-14 px-8 text-xs uppercase tracking-widest border-primary/30 hover:bg-primary/10 hover:text-primary hover:border-primary/60 transition-all duration-300">
              Découvrir le manifesto
            </Button>
          </a>
        </div>

        {/* Majestic Villa Hero Visual */}
        <div className="w-full relative group">
          <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-primary/10 to-primary/0 blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />
          <div className="relative border border-primary/20 bg-background/50 p-2 backdrop-blur-sm shadow-2xl rounded-lg overflow-hidden">
            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-md border border-border/40">
              <img
                src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=90"
                alt="Architecture de luxe par FORMA"
                className="w-full h-full object-cover grayscale-[20%] contrast-[110%] scale-100 group-hover:scale-105 transition-transform duration-[4000ms] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
              
              {/* Floating Architectural Blueprint overlay card */}
              <div className="absolute bottom-6 left-6 right-6 md:right-auto md:max-w-md bg-background/80 backdrop-blur-md p-6 border border-primary/20 text-left transition-all duration-500 hover:border-primary/50">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[9px] uppercase tracking-widest text-primary font-medium">Bâtiment Réf. 09-026</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <h3 className="font-display text-xl mb-1 text-foreground">Villa Horizon - Bioclimatique</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Modèle d'expérimentation généré à l'aide de l'IA avec isolation paille, panneaux solaires intégrés en façade sud, et respect des alignements réglementaires PLU Zone UBa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Bento Grid Showcase */}
      <section id="features" className="border-t border-border/20 bg-background py-32 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl mb-20 text-left">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">L'intelligence à l'œuvre</p>
            <h2 className="font-display text-4xl md:text-6xl tracking-tight leading-none">
              Quatre dimensions. <br />
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
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-primary">Dimensions Visuelles</span>
                </div>
                <h3 className="font-display text-3xl md:text-4xl mb-3">Render AI Photoréaliste</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md mb-8">
                  Passez du croquis filaire au rendu cinématographique en quelques secondes. Modifiez les lumières, la météo et le style architectural à volonté.
                </p>
              </div>

              {/* Slider Component */}
              <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
                className="w-full aspect-[16/9] bg-[#0c0c0c] border border-border/40 relative overflow-hidden select-none cursor-ew-resize rounded"
              >
                {/* Before Image (Blueprint styling) */}
                <div className="absolute inset-0 z-0 bg-[#0d0f12]">
                  {/* Grid Lines simulating blueprint */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#141c2b_1px,transparent_1px),linear-gradient(to_bottom,#141c2b_1px,transparent_1px)] bg-[size:40px_40px] opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center p-8 opacity-25">
                    <Building className="w-1/2 h-1/2 text-primary" />
                  </div>
                  <div className="absolute inset-0 flex flex-col justify-between p-6">
                    <span className="text-[10px] text-primary/70 font-mono tracking-widest">FILAIRE.DXF</span>
                    <div className="border border-primary/20 bg-background/90 px-3 py-1.5 text-[10px] font-mono text-primary max-w-max">
                      STRUCTURE 3D VECTORIELLE
                    </div>
                  </div>
                </div>

                {/* After Image (Luxurious photographic render) */}
                <div
                  className="absolute inset-y-0 left-0 right-0 z-10 overflow-hidden bg-cover bg-center transition-all duration-75"
                  style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
                >
                  <img
                    src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80"
                    alt="Rendu finalisé"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  <div className="absolute inset-0 flex flex-col justify-between p-6">
                    <span className="text-[10px] text-white/70 font-mono tracking-widest">RENDU_FINAL.PNG</span>
                    <div className="border border-emerald-500/20 bg-emerald-950/80 px-3 py-1.5 text-[10px] font-mono text-emerald-400 max-w-max">
                      PHOTORÉALISME RE2020
                    </div>
                  </div>
                </div>

                {/* Slider Handle Line */}
                <div
                  className="absolute inset-y-0 z-20 w-0.5 bg-primary/80 transition-all duration-75"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full border border-primary bg-background flex items-center justify-center shadow-lg cursor-ew-resize">
                    <Maximize2 className="h-3 w-3 text-primary rotate-45" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Chat Agent Simulator Card */}
            <div className="border border-border/30 bg-card/30 p-8 flex flex-col justify-between group hover:border-primary/40 transition-colors duration-500 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-[200px] h-[200px] bg-primary/2 rounded-full blur-[60px] pointer-events-none" />

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-primary">Urbanisme & Droit</span>
                </div>
                <h3 className="font-display text-3xl mb-3">Agent IA Réglementaire</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Un expert chevronné des normes françaises (PLU, accessibilité PMR, RE2020) connecté à vos plans en temps réel.
                </p>
              </div>

              {/* Chat Interface Simulator */}
              <div className="bg-[#0b0b0b]/90 border border-border/40 p-4 rounded h-64 flex flex-col justify-between font-mono text-[10px]">
                <div className="overflow-y-auto space-y-3 flex-1 pr-1 scrollbar-thin">
                  {activeChat.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-2.5 rounded ${
                        msg.role === "user"
                          ? "bg-primary/5 text-primary/90 border border-primary/10 ml-6"
                          : "bg-muted/30 text-muted-foreground border border-border/10 mr-6"
                      }`}
                    >
                      <div className="font-semibold text-[8px] uppercase tracking-wider mb-1 text-primary/80">
                        {msg.role === "user" ? "★ Architecte" : "✔ FORMA Agent"}
                      </div>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  ))}
                  
                  {/* Currently typing content */}
                  {SIMULATED_CHAT[chatStep] && (
                    <div
                      className={`p-2.5 rounded ${
                        SIMULATED_CHAT[chatStep].role === "user"
                          ? "bg-primary/5 text-primary/90 border border-primary/10 ml-6"
                          : "bg-muted/30 text-muted-foreground border border-border/10 mr-6"
                      }`}
                    >
                      <div className="font-semibold text-[8px] uppercase tracking-wider mb-1 text-primary/80">
                        {SIMULATED_CHAT[chatStep].role === "user" ? "★ Architecte" : "FORMA Agent"}
                      </div>
                      <p className="leading-relaxed">
                        {typedText}
                        <span className="inline-block w-1.5 h-3 bg-primary animate-pulse ml-0.5" />
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-border/30 pt-3 mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
                  <span>Modèle: Gemini 3.5 Pro</span>
                  <span className="flex items-center gap-1.5"><Zap className="h-2.5 w-2.5 text-primary" /> En ligne</span>
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
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-primary">Géométrie 2D & 3D</span>
                </div>
                <h3 className="font-display text-3xl mb-3">Mini Archi Spacial</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-6">
                  Générez des variantes d'agencement intelligentes, modifiez les pièces à la volée et visualisez instantanément le modèle en 3D.
                </p>
              </div>

              {/* Interactive SVG floor plan */}
              <div className="border border-border/40 p-4 bg-[#0a0a0a] rounded flex flex-col items-center gap-4 relative">
                <svg viewBox="0 0 200 160" className="w-full h-32 text-foreground font-sans">
                  {/* Séjour */}
                  <rect
                    x="10"
                    y="10"
                    width="110"
                    height="90"
                    fill={selectedRoom === "séjour" ? "rgba(196, 162, 100, 0.15)" : "transparent"}
                    stroke={selectedRoom === "séjour" ? "var(--primary)" : "rgba(196, 162, 100, 0.3)"}
                    strokeWidth="1.5"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedRoom("séjour")}
                  />
                  <text x="65" y="55" textAnchor="middle" className="text-[9px] fill-foreground font-medium pointer-events-none">
                    Séjour
                  </text>
                  
                  {/* Chambre */}
                  <rect
                    x="125"
                    y="10"
                    width="65"
                    height="50"
                    fill={selectedRoom === "chambre" ? "rgba(196, 162, 100, 0.15)" : "transparent"}
                    stroke={selectedRoom === "chambre" ? "var(--primary)" : "rgba(196, 162, 100, 0.3)"}
                    strokeWidth="1.5"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedRoom("chambre")}
                  />
                  <text x="157" y="38" textAnchor="middle" className="text-[8px] fill-foreground font-medium pointer-events-none">
                    Chambre
                  </text>

                  {/* Cuisine */}
                  <rect
                    x="125"
                    y="65"
                    width="65"
                    height="35"
                    fill={selectedRoom === "cuisine" ? "rgba(196, 162, 100, 0.15)" : "transparent"}
                    stroke={selectedRoom === "cuisine" ? "var(--primary)" : "rgba(196, 162, 100, 0.3)"}
                    strokeWidth="1.5"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedRoom("cuisine")}
                  />
                  <text x="157" y="85" textAnchor="middle" className="text-[8px] fill-foreground font-medium pointer-events-none">
                    Cuisine
                  </text>

                  {/* Terrasse */}
                  <rect
                    x="10"
                    y="105"
                    width="180"
                    height="45"
                    strokeDasharray="4 2"
                    fill={selectedRoom === "terrasse" ? "rgba(196, 162, 100, 0.15)" : "transparent"}
                    stroke={selectedRoom === "terrasse" ? "var(--primary)" : "rgba(196, 162, 100, 0.3)"}
                    strokeWidth="1.5"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedRoom("terrasse")}
                  />
                  <text x="100" y="130" textAnchor="middle" className="text-[8px] fill-foreground font-medium pointer-events-none">
                    Terrasse (BSO)
                  </text>
                </svg>

                {/* Room Info Tooltip Overlay */}
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
                  <span className="text-[11px] uppercase tracking-[0.2em] font-medium text-primary">Workspace</span>
                </div>
                <h3 className="font-display text-3xl md:text-4xl mb-3">Pilotage de Projets</h3>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-md mb-8">
                  Gérez vos dossiers d'architecture de l'esquisse jusqu'au chantier. Collaborez, organisez vos versions et partagez vos présentations client en plein écran.
                </p>
              </div>

              {/* Minimalist interactive Kanban interface */}
              <div className="grid grid-cols-3 gap-3 bg-[#0a0a0a] p-4 border border-border/40 rounded">
                
                {/* Column 1: Esquisse */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/20">
                    <span>1. Esquisse</span>
                    <span className="text-primary font-mono">02</span>
                  </div>
                  <div className="bg-[#121212] p-3 border border-border/20 rounded-sm space-y-2 opacity-60">
                    <div className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 max-w-max rounded-full">
                      Maison Individuelle
                    </div>
                    <div className="text-[10px] font-sans font-medium text-foreground">Villa Cap-Ferret</div>
                  </div>
                </div>

                {/* Column 2: Permis */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/20">
                    <span>2. Permis</span>
                    <span className="text-primary font-mono">01</span>
                  </div>
                  
                  {/* Animated toggle project card */}
                  <div
                    onClick={() => setActiveProjectStatus(activeProjectStatus === "review" ? "done" : "review")}
                    className={`p-3 border rounded-sm space-y-2 cursor-pointer transition-all duration-300 ${
                      activeProjectStatus === "review"
                        ? "bg-primary/5 border-primary/40 shadow-lg shadow-primary/5 scale-100"
                        : "bg-[#121212] border-border/20 opacity-60 scale-95"
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
                    <div className="text-[10px] font-sans font-medium text-foreground">Maison Sablonsière</div>
                    <div className="text-[8px] font-mono text-muted-foreground/80 flex items-center justify-between pt-1 border-t border-border/10">
                      <span>Statut:</span>
                      <span className={activeProjectStatus === "review" ? "text-amber-400" : "text-emerald-400"}>
                        {activeProjectStatus === "review" ? "REVUE RE2020" : "VALIDÉ"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Chantier */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-muted-foreground pb-2 border-b border-border/20">
                    <span>3. Chantier</span>
                    <span className="text-primary font-mono">01</span>
                  </div>
                  
                  {/* Validated/Moved card */}
                  <div
                    className={`p-3 border rounded-sm space-y-2 transition-all duration-300 ${
                      activeProjectStatus === "done"
                        ? "bg-emerald-950/20 border-emerald-500/30 scale-100 shadow-md shadow-emerald-500/5"
                        : "bg-[#121212] border-border/20 opacity-60"
                    }`}
                  >
                    <div className="text-[9px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 max-w-max rounded-full">
                      Tertiaire
                    </div>
                    <div className="text-[10px] font-sans font-medium text-foreground">Siège Ecopolis</div>
                    <div className="text-[8px] font-mono text-emerald-400 flex items-center gap-1 pt-1 border-t border-border/10">
                      <Check className="h-2.5 w-2.5" /> Gros œuvre validé
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Numeric Proof & Performance */}
      <section className="py-32 border-t border-border/20 relative bg-gradient-to-b from-background to-[#080808]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: "6x", label: "Accélération de la phase d'esquisse" },
              { num: "100%", label: "Conformité RE2020 & accessibilité PMR" },
              { num: "0", label: "Lignes de code d'infrastructure à configurer" },
              { num: "24/7", label: "Expert juridique d'urbanisme à vos côtés" },
            ].map((stat, i) => (
              <div key={i} className="text-left space-y-2 border-l border-primary/20 pl-6">
                <div className="font-display text-5xl md:text-7xl text-gradient-gold font-light">{stat.num}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest leading-relaxed">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Manifesto / Philosophy Section */}
      <section id="manifesto" className="py-44 border-t border-border/20 relative bg-[#060606] flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent blur-[120px] pointer-events-none" />
        
        <div className="mx-auto max-w-4xl px-6 text-center space-y-12">
          <div className="h-px w-24 bg-primary/40 mx-auto" />
          <p className="text-[10px] uppercase tracking-[0.4em] text-primary">Le Manifeste FORMA</p>
          
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl leading-snug tracking-wide italic font-light max-w-3xl mx-auto">
            « L'architecture est l'art savant, correct et magnifique des volumes assemblés sous la lumière. »
          </h2>
          
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-primary">Le Corbusier</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Vers une architecture, 1923</p>
          </div>
          
          <div className="h-px w-24 bg-primary/40 mx-auto" />
          
          <div className="pt-8">
            <Link to="/auth">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/95 rounded-none h-14 px-12 text-xs uppercase tracking-widest shadow-gold transition-all duration-300">
                Faire l'expérience du studio
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/20 py-20 bg-background relative">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-4 gap-12 text-left mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-sm gold-gradient flex items-center justify-center">
                <Compass className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-xl tracking-[0.15em] text-primary">FORMA</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-light">
              La plateforme logicielle d'avant-garde dédiée aux agences d'architecture. Technologie d'élite au service de l'espace.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.20em] text-primary mb-4">Écosystème</h4>
            <ul className="space-y-2 text-[11px] text-muted-foreground">
              <li><Link to="/auth" className="hover:text-primary transition-colors">Render AI</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Agent IA</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Mini Archi</Link></li>
              <li><Link to="/auth" className="hover:text-primary transition-colors">Projets Kanban</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.20em] text-primary mb-4">Technologie</h4>
            <ul className="space-y-2 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-1.5">Supabase DB <Lock className="h-2.5 w-2.5 text-primary/60" /></li>
              <li className="flex items-center gap-1.5">Gemini 3.5 Pro <Zap className="h-2.5 w-2.5 text-primary/60" /></li>
              <li>Vite & TanStack Start</li>
              <li>ThreeJS Vector</li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] uppercase tracking-[0.20em] text-primary mb-4">Contact</h4>
            <p className="text-[11px] text-muted-foreground font-mono">
              studio@forma.luxury <br />
              Paris, France
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pt-8 border-t border-border/10 flex flex-col sm:flex-row justify-between items-center text-[10px] text-muted-foreground tracking-wider uppercase">
          <span>© {new Date().getFullYear()} FORMA STUDIO. TOUS DROITS RÉSERVÉS.</span>
          <span className="flex items-center gap-1.5 mt-4 sm:mt-0">
            Fait avec rigueur pour les architectes <Compass className="h-3 w-3 text-primary" />
          </span>
        </div>
      </footer>
    </div>
  );
}
