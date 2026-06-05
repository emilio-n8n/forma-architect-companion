import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

const MAPLIBRE_VERSION = "4.0.0";
const MAPLIBRE_CDN = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl`;

function loadMapLibre(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).maplibregl) { resolve(); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${MAPLIBRE_CDN}.css`;
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = `${MAPLIBRE_CDN}.js`;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });
}

export function MiniMap({
  lat,
  lng,
  geojson,
  surface,
}: {
  lat: number;
  lng: number;
  geojson?: any;
  surface?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const el = containerRef.current;
    if (!el) return;

    let canceled = false;
    (async () => {
      try {
        await loadMapLibre();
        if (canceled) return;
        const ml = (window as any).maplibregl;
        if (!ml) { setState("error"); return; }

        const map = new ml.Map({
          container: el,
          style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
          center: [lng, lat],
          zoom: 16,
          attributionControl: false,
        });

        map.on("load", () => {
          if (canceled) return;
          if (geojson) {
            map.addSource("parcelle", {
              type: "geojson",
              data: geojson as any,
            });
            map.addLayer({
              id: "parcelle-fill",
              type: "fill",
              source: "parcelle",
              paint: {
                "fill-color": "#dcb383",
                "fill-opacity": 0.15,
              },
            });
            map.addLayer({
              id: "parcelle-outline",
              type: "line",
              source: "parcelle",
              paint: {
                "line-color": "#dcb383",
                "line-width": 2,
                "line-opacity": 0.8,
              },
            });
            const bounds = new ml.LngLatBounds();
            (geojson.geometry as any).coordinates[0].forEach((c: number[]) => bounds.extend(c));
            map.fitBounds(bounds, { padding: 40, maxZoom: 18 });
          } else {
            new ml.Marker({ color: "#dcb383" }).setLngLat([lng, lat]).addTo(map);
          }
          if (!canceled) setState("ready");
        });

        map.on("error", () => { if (!canceled) setState("ready"); });
      } catch {
        if (!canceled) setState("error");
      }
    })();

    return () => { canceled = true; initialized.current = false; };
  }, [lat, lng]);

  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden border border-border/40 bg-card">
      <div ref={containerRef} className="w-full h-full" />
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Chargement de la carte…
          </div>
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <p className="text-xs text-muted-foreground">Carte non disponible</p>
        </div>
      )}
      {surface && state === "ready" && (
        <div className="absolute bottom-2 left-2 z-10 bg-background/80 backdrop-blur rounded px-2 py-1 text-[10px] text-muted-foreground">
          {surface.toLocaleString("fr-FR")} m²
        </div>
      )}
    </div>
  );
}
