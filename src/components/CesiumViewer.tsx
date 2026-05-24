import { useEffect, useRef, useState } from "react";
import type { PlanData } from "@/lib/plans.functions";

const CESIUM_VERSION = "1.119.0";
const CESIUM_CDN = `https://cdn.jsdelivr.net/npm/cesium@${CESIUM_VERSION}/Build/Cesium`;

function loadCesiumAssets(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).Cesium) { resolve(); return; }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `${CESIUM_CDN}/Widgets/widgets.css`;
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = `${CESIUM_CDN}/Cesium.js`;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });
}

export function CesiumViewer({
  plan,
  modelUrl,
}: {
  plan: PlanData;
  modelUrl: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const modelEntityRef = useRef<any>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  // Init viewer once
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !plan.parcel) return;
    let viewer: any = null;
    let canceled = false;

    (async () => {
      await loadCesiumAssets();
      if (canceled) return;

      const Cesium = (window as any).Cesium;
      const token = (import.meta as any).env?.VITE_CESIUM_ION_TOKEN;
      if (token) Cesium.Ion.defaultAccessToken = token;

      viewer = new Cesium.Viewer(el, {
        terrain: Cesium.Terrain.fromWorldTerrain(),
        animation: false,
        timeline: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        creditContainer: document.createElement("div"),
      });
      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.enableLighting = true;
      viewerRef.current = viewer;
      if (!canceled) setState("ready");
    })();

    return () => {
      canceled = true;
      viewer?.destroy();
      viewerRef.current = null;
    };
  }, [plan.parcel?.lat, plan.parcel?.lng]);

  // Load model when blob URL changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !modelUrl || !plan.parcel) return;

    const Cesium = (window as any).Cesium;

    if (modelEntityRef.current) {
      viewer.entities.remove(modelEntityRef.current);
      modelEntityRef.current = null;
    }

    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(plan.parcel.lng, plan.parcel.lat, 0),
      model: {
        uri: modelUrl,
        scale: 1,
        minimumPixelSize: 128,
        maximumScale: 20000,
        heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      },
    });
    modelEntityRef.current = entity;

    const buildingSize = Math.max(plan.total_w, plan.total_h);
    viewer.flyTo(entity, {
      duration: 2,
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(45),
        Cesium.Math.toRadians(-30),
        buildingSize * 2 + 20,
      ),
    });
  }, [modelUrl, plan.parcel?.lat, plan.parcel?.lng]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border/40 bg-[#1a1a1a]">
      <div ref={containerRef} className="w-full h-full" />
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <p className="text-sm text-muted-foreground animate-pulse">Chargement du globe&hellip;</p>
        </div>
      )}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <p className="text-sm text-muted-foreground">Impossible de charger le globe 3D.</p>
        </div>
      )}
    </div>
  );
}
