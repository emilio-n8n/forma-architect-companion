import { useState, useRef } from "react";
import { Sparkles, Maximize2 } from "lucide-react";
import { BentoCard } from "@/components/BentoCard";

export function RenderAICard() {
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

  return (
    <BentoCard
      colSpan
      icon={<Sparkles className="h-4 w-4" />}
      label="Rendu"
      title="Render AI"
      description="Générez des rendus photoréalistes à partir de vos esquisses. Ajustez la lumière, les matériaux et l'environnement en quelques clics."
    >
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="w-full aspect-[16/9] bg-[#0c0c0c] border border-border/40 relative overflow-hidden select-none cursor-ew-resize rounded"
      >
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

        <div
          className="absolute inset-y-0 z-20 w-px bg-primary transition-all duration-75"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-8 w-8 rounded-full border border-primary bg-background flex items-center justify-center shadow-lg cursor-ew-resize">
            <Maximize2 className="h-3 w-3 text-primary rotate-45" />
          </div>
        </div>
      </div>
    </BentoCard>
  );
}
