import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type GeographyMapLocation = {
  id: string;
  name: string;
  coordinates: [number, number];
};

type GeographyMapProps = {
  locations: GeographyMapLocation[];
};

export function GeographyMap({ locations }: GeographyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || locations.length === 0) return;

    const map = L.map(container, { scrollWheelZoom: false, zoomControl: false, tap: true });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const bounds = L.latLngBounds([]);
    locations.forEach((location) => {
      const [lat, lng] = location.coordinates;
      bounds.extend([lat, lng]);
      L.circleMarker([lat, lng], {
        radius: 6,
        color: "#fff",
        weight: 2,
        fillColor: "#9a6a34",
        fillOpacity: 0.96,
      })
        .bindPopup(`<a href="/immobilier/${location.id}">${location.name}</a>`)
        .addTo(map);
    });

    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 10 });
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, [locations]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Carte interactive des ${locations.length} communes et quartiers couverts par Foch Immobilier`}
      className="h-72 w-full bg-muted md:h-[440px]"
    />
  );
}
