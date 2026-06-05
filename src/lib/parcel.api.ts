type AddressResult = {
  label: string;
  lat: number;
  lng: number;
};

function computeGeoArea(coords: number[][][]): number {
  const ring = coords[0];
  let area = 0;
  const R = 6371000;
  for (let i = 0; i < ring.length - 1; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const lng1Rad = (lng1 * Math.PI) / 180;
    const lng2Rad = (lng2 * Math.PI) / 180;
    area += (lng2Rad - lng1Rad) * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
  }
  return Math.round(Math.abs((area * R * R) / 2));
}

export async function searchAddress(query: string): Promise<AddressResult[]> {
  const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.features ?? []).map((f: { properties: { label: string }; geometry: { coordinates: [number, number] } }) => ({
    label: f.properties.label,
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
  }));
}

type CadastreParcel = {
  geojson: any;
  surface: number;
  id: string;
};

export async function fetchCadastreParcel(lat: number, lng: number): Promise<CadastreParcel | null> {
  try {
    const res = await fetch(
      `https://cadastre.data.gouv.fr/bundler/cadastre-etalab/geojson/parcelle?lat=${lat}&lng=${lng}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const features = data.features ?? [];
    if (features.length === 0) return null;
    const f = features[0];
    const surf = f.properties?.surface_parcelle
      ? Number(f.properties.surface_parcelle)
      : computeGeoArea(f.geometry.coordinates);
    return {
      geojson: f,
      surface: surf,
      id: f.properties?.id ?? "",
    };
  } catch {
    return null;
  }
}

type CadastreByRef = {
  geojson: any;
  surface: number;
  id: string;
  address: string;
};

export async function searchCadastreByReference(
  section: string,
  number: string,
  commune: string,
): Promise<CadastreByRef | null> {
  try {
    const url = `https://cadastre.data.gouv.fr/bundler/cadastre-etalab/geojson/parcelle?code_insee=${commune}&section=${section}&numero=${number}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const features = data.features ?? [];
    if (features.length === 0) return null;
    const f = features[0];
    const coords = f.geometry.coordinates[0][0] as [number, number];
    let address = `${section} ${number} — ${commune}`;
    try {
      const addrRes = await fetch(
        `https://api-adresse.data.gouv.fr/reverse/?lon=${coords[0]}&lat=${coords[1]}`,
      );
      if (addrRes.ok) {
        const addrData = await addrRes.json();
        if (addrData.features?.length > 0) {
          address = addrData.features[0].properties.label;
        }
      }
    } catch { /* ignore */ }
    const surf = f.properties?.surface_parcelle
      ? Number(f.properties.surface_parcelle)
      : computeGeoArea(f.geometry.coordinates);
    return {
      geojson: f,
      surface: surf,
      id: f.properties?.id ?? "",
      address,
    };
  } catch {
    return null;
  }
}
