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

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function CesiumViewer({
  plan,
  modelBlob,
}: {
  plan: PlanData;
  modelBlob: Blob | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const initializedRef = useRef(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  // One-time init of Cesium viewer
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !plan.parcel) return;
    
    let viewer: any = null;
    let canceled = false;
    initializedRef.current = true; // Mark as initializing

    (async () => {
      try {
        await loadCesiumAssets();
        if (canceled) return;

        const C = (window as any).Cesium;
        const token = (import.meta as any).env?.VITE_CESIUM_ION_TOKEN;
        if (token) C.Ion.defaultAccessToken = token;

        viewer = new Cesium.Viewer(el, {
          terrain: C.Terrain.fromWorldTerrain(),
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
      } catch (error) {
        console.error("Cesium initialization error:", error);
        if (!canceled) setState("error");
      }
    })();

    return () => {
      // ⭐ FIX: Memory Leak - Cleanup properly
      canceled = true;
      initializedRef.current = false;
      
      if (viewerRef.current) {
        try {
          // Destroy the viewer and all its resources
          const v = viewerRef.current;
          if (v.entities) v.entities.removeAll();
          if (v.scene) {
            // Cleanup scene resources
            if (v.scene.primitives) v.scene.primitives.removeAll();
            if (v.scene.imageryLayers) v.scene.imageryLayers.removeAll();
          }
          v.destroy();
        } catch (e) {
          console.error("Cesium cleanup error:", e);
        }
        viewerRef.current = null;
      }
      
      // Also cleanup the local viewer reference
      if (viewer) {
        try {
          viewer.destroy();
        } catch (e) {
          console.error("Cesium cleanup error (local):", e);
        }
      }
    };
  }, [plan.parcel]);

  // Load model + set camera when modelBlob is ready
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !modelBlob || !plan.parcel) return;

    const C = (window as any).Cesium;
    if (!C) return;

    (async () => {
      try {
        const dataUri = await blobToDataUri(modelBlob);
        viewer.entities.removeAll();

        const pos = C.Cartesian3.fromDegrees(
          plan.parcel.lng,
          plan.parcel.lat,
          0,
        );

        viewer.entities.add({
          position: pos,
          model: {
            uri: dataUri,
            scale: 1,
            minimumPixelSize: 256,
            maximumScale: 20000,
            heightReference: C.HeightReference.RELATIVE_TO_GROUND,
          },
        });

        if (plan.parcel.contour.length > 0) {
          const rad = (plan.parcel.lat * Math.PI) / 180;
          const mPerDeg = 111111 * Math.cos(rad);
          const outline = plan.parcel.contour.map((p) => [
            plan.parcel.lng + p.x / (111111 * Math.cos(rad)),
            plan.parcel.lat - p.z / 111111,
          ]);
          viewer.entities.add({
            polygon: {
              hierarchy: C.Cartesian3.fromDegreesArray(outline.flat()),
              material: C.Color.YELLOW.withAlpha(0.15),
              outline: true,
              outlineColor: C.Color.YELLOW.withAlpha(0.6),
              outlineWidth: 2,
              heightReference: C.HeightReference.CLAMP_TO_GROUND,
            },
          });
        }

        const buildingSize = Math.max(plan.total_w, plan.total_h);
        const altitude = Math.max(buildingSize * 2.5, 30);

        const dest = C.Cartesian3.fromDegrees(
          plan.parcel.lng,
          plan.parcel.lat,
          altitude,
        );

        viewer.camera.flyTo({
          destination: dest,
          orientation: {
            heading: C.Math.toRadians(45),
            pitch: C.Math.toRadians(-35),
            roll: 0,
          },
          duration: 1.5,
        });
      } catch (e) {
        console.error("Failed to load model in Cesium", e);
      }
    })();
  }, [modelBlob]);

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-border/40 bg-[#1a1a1a]">
      <div ref={containerRef} className="w-full h-full" />
      {state === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <p className="text-sm text-muted-foreground animate-pulse">Chargement du globe&hellip;</p>
        </div>
      )}
    </div>
  );
}
