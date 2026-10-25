import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, LocateFixed, MapPin, Move, ZoomIn, ZoomOut, X } from "lucide-react";
import * as L from "leaflet";
import type { PropertySearchItem } from "@/types/api";
import { PropertyPreviewLink } from "@/features/listings/components/PropertyPreviewLink";
import { SearchCountBadge } from "@/features/listings/components/SearchCountBadge";
import { formatPrice, formatPropertyTypeLabel } from "@/features/listings/utils/formatting";
import { resolveApproximatePropertyMapLocation } from "@/features/listings/utils/propertyMapLocations";
import { PaginationBar } from "@/features/listings/components/PaginationBar";
import { getPropertyImageSrcSet, getPropertyImageUrl } from "@/features/listings/utils/propertyImageUrls";
import "leaflet/dist/leaflet.css";
import "./property-map.css";

interface PropertyMapSplitViewProps {
  items: PropertySearchItem[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

const DEFAULT_CENTER: L.LatLngTuple = [49.4943, 0.1078];
const SELECTED_PROPERTY_ZOOM = 15;
const MIN_MAP_ZOOM = 8;
const MAX_MAP_ZOOM = 19;
const MAP_FLY_DURATION_SECONDS = 0.5;
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

function makePriceIcon(item: PropertySearchItem, selected: boolean): L.DivIcon {
  const compactPrice = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(item.priceAmount);
  const selectedClass = selected ? " foch-price-marker--selected" : "";

  return L.divIcon({
    className: "foch-price-icon",
    html: `<span class="foch-price-marker${selectedClass}">${compactPrice}</span>`,
    iconSize: [108, 38],
    iconAnchor: [54, 19],
  });
}

function setMarkerSelected(marker: L.Marker, selected: boolean) {
  marker.getElement()?.querySelector(".foch-price-marker")?.classList.toggle("foch-price-marker--selected", selected);
  marker.setZIndexOffset(selected ? 1000 : 0);
}

export function PropertyMapSplitView({ items, page, pageSize, total, onPageChange }: PropertyMapSplitViewProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markerRefs = useRef(new Map<number, L.Marker>());
  const rowRefs = useRef(new Map<number, HTMLButtonElement>());
  const onSelectRef = useRef<(id: number) => void>(() => undefined);
  const selectedIdRef = useRef<number | null>(null);
  const highlightedIdRef = useRef<number | null>(null);
  const singleFingerPanEnabledRef = useRef(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [usesCooperativeMapGestures, setUsesCooperativeMapGestures] = useState(false);
  const [singleFingerPanEnabled, setSingleFingerPanEnabled] = useState(false);
  const [mapZoom, setMapZoom] = useState(11);

  const positions = useMemo(
    () => items.map((item) => ({ item, ...resolveApproximatePropertyMapLocation(item) })),
    [items],
  );
  const locationByPropertyId = useMemo(
    () => new Map(positions.map(({ item, label, basis }) => [item.id, { label, basis }] as const)),
    [positions],
  );
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const selectedMapLocation = selectedId == null ? undefined : locationByPropertyId.get(selectedId);

  const selectProperty = (id: number | null) => {
    selectedIdRef.current = id;
    setSelectedId(id);
  };

  onSelectRef.current = (id) => selectProperty(id);

  useEffect(() => {
    if (!mapElementRef.current) return;

    const markersForCleanup = markerRefs.current;
    const cooperativeViewport = window.matchMedia("(max-width: 1023px)");

    const map = L.map(mapElementRef.current, {
      center: DEFAULT_CENTER,
      zoom: 11,
      minZoom: MIN_MAP_ZOOM,
      maxZoom: MAX_MAP_ZOOM,
      zoomControl: false,
      scrollWheelZoom: false,
      touchZoom: true,
      dragging: !cooperativeViewport.matches,
    });
    const syncMapZoom = () => setMapZoom(map.getZoom());
    map.on("zoomend", syncMapZoom);
    syncMapZoom();
    L.tileLayer(TILE_URL, {
      maxZoom: MAX_MAP_ZOOM,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Contributeurs OpenStreetMap</a>',
    }).addTo(map);
    const markerLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markerLayerRef.current = markerLayer;

    const syncMapGestureMode = () => {
      const useCooperativeGestures = cooperativeViewport.matches;
      setUsesCooperativeMapGestures(useCooperativeGestures);
      if (!useCooperativeGestures) {
        singleFingerPanEnabledRef.current = false;
        setSingleFingerPanEnabled(false);
      }

      if (!useCooperativeGestures || singleFingerPanEnabledRef.current) map.dragging.enable();
      else map.dragging.disable();
    };
    syncMapGestureMode();
    cooperativeViewport.addEventListener("change", syncMapGestureMode);

    return () => {
      cooperativeViewport.removeEventListener("change", syncMapGestureMode);
      map.off("zoomend", syncMapZoom);
      markerLayer.clearLayers();
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      markersForCleanup.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();
    markerRefs.current.clear();

    positions.forEach(({ item, position }) => {
      const marker = L.marker(position, {
        icon: makePriceIcon(item, item.id === selectedIdRef.current),
        title: `${formatPrice(item.priceAmount, item.transaction)} · ${item.title}`,
        alt: `Repère pour ${item.title}`,
        riseOnHover: true,
        keyboard: true,
      });
      marker.bindTooltip(item.title, { direction: "top", offset: [0, -14], opacity: 1 });
      marker.on("click", () => onSelectRef.current(item.id));
      marker.addTo(markerLayer);
      if (item.id === selectedIdRef.current) marker.setZIndexOffset(1000);
      markerRefs.current.set(item.id, marker);
    });

    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions.map(({ position }) => position)), {
        padding: [36, 36],
        maxZoom: 12,
        animate: false,
      });
    } else if (positions.length === 1) {
      map.setView(positions[0].position, 13, { animate: false });
    } else {
      map.setView(DEFAULT_CENTER, 11, { animate: false });
    }
  }, [positions]);

  useEffect(() => {
    const map = mapRef.current;
    const previousMarker = highlightedIdRef.current == null
      ? undefined
      : markerRefs.current.get(highlightedIdRef.current);
    if (previousMarker && highlightedIdRef.current !== selectedId) {
      setMarkerSelected(previousMarker, false);
    }

    highlightedIdRef.current = selectedId;
    if (selectedId == null) return;

    const row = rowRefs.current.get(selectedId);
    row?.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const marker = markerRefs.current.get(selectedId);
    if (!marker || !map) return;

    const item = items.find((candidate) => candidate.id === selectedId);
    if (item) setMarkerSelected(marker, true);

    // A new click takes over from the current flight, so rapid selections always
    // animate toward the latest property instead of finishing an old flight.
    map.stop();
    map.flyTo(marker.getLatLng(), SELECTED_PROPERTY_ZOOM, {
      duration: MAP_FLY_DURATION_SECONDS,
      easeLinearity: 0.25,
    });
  }, [items, selectedId]);

  const recenterMap = () => {
    const map = mapRef.current;
    if (!map) return;

    if (positions.length > 1) {
      map.fitBounds(L.latLngBounds(positions.map(({ position }) => position)), {
        padding: [36, 36],
        maxZoom: 12,
      });
    } else if (positions.length === 1) {
      map.setView(positions[0].position, 13);
    } else {
      map.setView(DEFAULT_CENTER, 11);
    }
  };

  const zoomMap = (direction: "in" | "out") => {
    const map = mapRef.current;
    if (!map) return;
    if (direction === "in") map.zoomIn();
    else map.zoomOut();
  };

  const toggleSingleFingerPan = () => {
    const nextEnabled = !singleFingerPanEnabledRef.current;
    singleFingerPanEnabledRef.current = nextEnabled;
    setSingleFingerPanEnabled(nextEnabled);

    const map = mapRef.current;
    if (!map) return;
    if (nextEnabled || !window.matchMedia("(max-width: 1023px)").matches) map.dragging.enable();
    else map.dragging.disable();
  };

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <section
        aria-label="Annonces de la page"
        className="flex h-[580px] min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-[min(74vh,780px)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div>
            <h2 className="font-display text-xl">Les biens</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Repères approximatifs basés sur la ville, le code postal et le secteur de l’annonce.</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <SearchCountBadge size="compact">{items.length.toLocaleString("fr-FR")}</SearchCountBadge>
            <span>sur cette page</span>
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {items.map((item) => {
            const isSelected = item.id === selectedId;
            const mapLocation = locationByPropertyId.get(item.id);
            const locality = mapLocation && mapLocation.label !== item.city.name ? ` · ${mapLocation.label}` : "";
            return (
              <article
                key={item.id}
                className={`border-b border-border/60 px-3 py-3 transition-colors ${isSelected ? "bg-brand-soft/45" : "hover:bg-muted/35"}`}
              >
                <button
                  ref={(element) => {
                    if (element) rowRefs.current.set(item.id, element);
                    else rowRefs.current.delete(item.id);
                  }}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => selectProperty(item.id)}
                  className="grid w-full grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-xl text-left outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:grid-cols-[112px_minmax(0,1fr)]"
                >
                  <img
                    src={getPropertyImageUrl(item.coverImageUrl, 200)}
                    srcSet={getPropertyImageSrcSet(item.coverImageUrl, [200, 400])}
                    sizes="112px"
                    alt=""
                    loading="lazy"
                    className="h-[82px] w-[92px] rounded-lg object-cover sm:h-[94px] sm:w-[112px]"
                  />
                  <span className="flex min-w-0 flex-col justify-between py-0.5">
                    <span className="flex items-center gap-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                      <span>Réf. {item.id}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{formatPropertyTypeLabel(item.type)}</span>
                    </span>
                    <span className="line-clamp-2 font-display text-base leading-snug text-foreground sm:text-lg">
                      {item.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {item.city.name}{locality} · {item.surfaceM2} m²
                    </span>
                    <span className="text-sm font-semibold text-brand-strong">
                      {formatPrice(item.priceAmount, item.transaction)}
                    </span>
                  </span>
                </button>
                <div className="mt-1 flex justify-end">
                  <PropertyPreviewLink
                    item={item}
                    browseItems={items}
                    browseTotal={total}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-brand-strong underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Voir l’annonce <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                  </PropertyPreviewLink>
                </div>
              </article>
            );
          })}
        </div>

        <div className="border-t border-border/70 px-3 py-2">
          <PaginationBar page={page} pageSize={pageSize} total={total} onChange={onPageChange} />
        </div>
      </section>

      <section aria-label="Carte des biens" className="relative isolate h-[440px] overflow-hidden rounded-2xl border border-border bg-muted lg:h-[min(74vh,780px)]">
        <div ref={mapElementRef} className="foch-property-map h-full w-full" />

        {usesCooperativeMapGestures && (
          <>
            <div className="pointer-events-none absolute bottom-14 left-3 z-[500] max-w-[calc(100%-13rem)] rounded-full border border-border/70 bg-background/90 px-3 py-2 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
              {singleFingerPanEnabled ? "Déplacement à un doigt activé" : "Deux doigts pour déplacer ou zoomer la carte"}
            </div>
            <button
              type="button"
              onClick={toggleSingleFingerPan}
              aria-pressed={singleFingerPanEnabled}
              aria-label={singleFingerPanEnabled ? "Arrêter le déplacement de la carte à un doigt" : "Activer le déplacement de la carte à un doigt"}
              className="absolute bottom-14 right-3 z-[1000] inline-flex min-h-10 items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Move aria-hidden="true" className="h-4 w-4 text-brand-strong" />
              {singleFingerPanEnabled ? "Arrêter le déplacement" : "Déplacer à un doigt"}
            </button>
          </>
        )}

        <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={recenterMap}
            className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3 py-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Recentrer la carte sur les biens"
          >
            <LocateFixed aria-hidden="true" className="h-4 w-4 text-brand-strong" />
            Recentrer
          </button>

          <div role="group" aria-label="Réglage du zoom de la carte" className="overflow-hidden rounded-xl border border-border/80 bg-background/95 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => zoomMap("in")}
              disabled={mapZoom >= MAX_MAP_ZOOM}
              title="Zoom avant"
              aria-label="Zoom avant"
              className="inline-flex h-10 w-10 items-center justify-center text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <ZoomIn aria-hidden="true" className="h-4 w-4" />
            </button>
            <div aria-hidden="true" className="h-px bg-border/80" />
            <button
              type="button"
              onClick={() => zoomMap("out")}
              disabled={mapZoom <= MIN_MAP_ZOOM}
              title="Zoom arrière"
              aria-label="Zoom arrière"
              className="inline-flex h-10 w-10 items-center justify-center text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <ZoomOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {selectedItem && (
          <div className="absolute left-3 top-3 z-[1000] flex w-[min(19rem,calc(100%-5.5rem))] gap-3 rounded-2xl border border-border/70 bg-background/95 p-2.5 shadow-lg backdrop-blur">
            <img
              src={getPropertyImageUrl(selectedItem.coverImageUrl, 200)}
              srcSet={getPropertyImageSrcSet(selectedItem.coverImageUrl, [200, 400])}
              sizes="80px"
              alt=""
              className="h-16 w-20 shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {selectedItem.city.name}
                {selectedMapLocation && selectedMapLocation.label !== selectedItem.city.name ? ` · ${selectedMapLocation.label}` : ""}
                {` · Réf. ${selectedItem.id}`}
              </p>
              <h3 className="mt-1 line-clamp-1 font-display text-sm">{selectedItem.title}</h3>
              <p className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-brand-strong">
                  {formatPrice(selectedItem.priceAmount, selectedItem.transaction)}
                </span>
                <PropertyPreviewLink
                  item={selectedItem}
                  browseItems={items}
                  browseTotal={total}
                  aria-label={`Voir l’annonce ${selectedItem.title}`}
                  className="rounded-full p-1 text-brand-strong hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                </PropertyPreviewLink>
              </p>
            </div>
            <button
              type="button"
              onClick={() => selectProperty(null)}
              aria-label="Effacer la sélection sur la carte"
              className="absolute right-1 top-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-7 left-3 z-[500] inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm backdrop-blur">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-brand-strong" />
          Localisation indicative
        </div>
      </section>
    </div>
  );
}
