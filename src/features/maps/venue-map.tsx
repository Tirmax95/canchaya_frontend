"use client";

import "leaflet/dist/leaflet.css";
import { DEFAULT_MAP_CENTER, type GeoPoint } from "@/domain/establishment";
import { cn } from "@/shared/lib/cn";
import type { Map as LeafletMap, Marker as LeafletMarker, LayerGroup } from "leaflet";
import { useEffect, useRef } from "react";

/**
 * Teselas de OpenStreetMap. Su política de uso pide tráfico moderado y atribución visible;
 * con mucho volumen en producción, cambia esta URL por un proveedor con plan (MapTiler,
 * Stadia, Mapbox) sin tocar el resto del componente.
 */
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';
const DEFAULT_ZOOM = 12;
const FOCUSED_ZOOM = 16;

/** Pin propio en SVG estático: Leaflet no resuelve sus íconos PNG con el bundler de Next. */
const PIN_HTML =
  '<svg viewBox="0 0 32 42" width="32" height="42" aria-hidden="true"><path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 41 16 41s15-14 15-25.2C31 7.6 24.3 1 16 1Z" fill="#d6f26a" stroke="#08110c" stroke-width="2"/><circle cx="16" cy="15.5" r="5.5" fill="#08110c"/></svg>';

const NO_MARKERS: VenueMapMarker[] = [];

export interface VenueMapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  href?: string;
}

/**
 * Propósito: Mapa de sedes sobre Leaflet. Dos modos:
 * - Vista: pinta `markers` con popup (nombre, dirección y enlace) y encuadra todos.
 * - Selector: con `onPick`, un clic en el mapa o arrastrar el pin elige `value`.
 * Leaflet se carga dentro del efecto porque usa `window` y no puede correr en el servidor.
 */
export function VenueMap({
  markers = NO_MARKERS,
  value = null,
  onPick,
  className,
  ariaLabel,
}: {
  markers?: VenueMapMarker[];
  value?: GeoPoint | null;
  onPick?: (point: GeoPoint) => void;
  className?: string;
  ariaLabel: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const pickerMarkerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const isPicker = Boolean(onPick);

  useEffect(() => {
    let isCancelled = false;

    /**
     * Propósito: Crea el mapa una sola vez por montaje.
     */
    async function setupMap() {
      const leaflet = (await import("leaflet")).default;
      if (isCancelled || !containerRef.current || mapRef.current) {
        return;
      }
      leafletRef.current = leaflet;
      const map = leaflet.map(containerRef.current, {
        center: [DEFAULT_MAP_CENTER.latitude, DEFAULT_MAP_CENTER.longitude],
        zoom: DEFAULT_ZOOM,
        scrollWheelZoom: isPicker,
        attributionControl: true,
      });
      leaflet.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      if (isPicker) {
        map.on("click", (event) => {
          onPickRef.current?.({
            latitude: Number(event.latlng.lat.toFixed(7)),
            longitude: Number(event.latlng.lng.toFixed(7)),
          });
        });
      }
      mapRef.current = map;
      syncMarkers();
      syncPicker();
      /**
       * Output:
       * Side effects — Mapa montado en el contenedor
       */
    }

    void setupMap();
    return () => {
      isCancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      pickerMarkerRef.current = null;
    };
    // El mapa se crea una vez; markers y value se sincronizan en sus propios efectos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPicker]);

  /**
   * Propósito: Pinta los marcadores de vista y encuadra el mapa para que se vean todos.
   * El popup se arma con nodos DOM y textContent: los nombres los escriben los dueños.
   */
  function syncMarkers() {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!leaflet || !map || !layer) {
      return;
    }
    layer.clearLayers();
    const icon = leaflet.divIcon({
      html: PIN_HTML,
      className: "venue-map-pin",
      iconSize: [32, 42],
      iconAnchor: [16, 41],
      popupAnchor: [0, -36],
    });
    for (const marker of markers) {
      const popup = document.createElement("div");
      popup.className = "venue-map-popup";
      const title = document.createElement(marker.href ? "a" : "strong");
      title.textContent = marker.title;
      if (marker.href && title instanceof HTMLAnchorElement) {
        title.href = marker.href;
      }
      popup.append(title);
      if (marker.subtitle) {
        const subtitle = document.createElement("span");
        subtitle.textContent = marker.subtitle;
        popup.append(subtitle);
      }
      leaflet
        .marker([marker.latitude, marker.longitude], { icon, title: marker.title, keyboard: true })
        .bindPopup(popup)
        .addTo(layer);
    }
    if (!isPicker && markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], FOCUSED_ZOOM);
    } else if (!isPicker && markers.length > 1) {
      map.fitBounds(
        leaflet.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude])),
        { padding: [40, 40], maxZoom: FOCUSED_ZOOM },
      );
    }
    /**
     * Output:
     * Side effects — Capa de marcadores actualizada
     */
  }

  /**
   * Propósito: Mueve (o crea) el pin arrastrable del selector según `value`.
   */
  function syncPicker() {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    if (!leaflet || !map || !isPicker) {
      return;
    }
    if (!value) {
      pickerMarkerRef.current?.remove();
      pickerMarkerRef.current = null;
      return;
    }
    const position: [number, number] = [value.latitude, value.longitude];
    if (!pickerMarkerRef.current) {
      const marker = leaflet.marker(position, {
        draggable: true,
        autoPan: true,
        icon: leaflet.divIcon({
          html: PIN_HTML,
          className: "venue-map-pin",
          iconSize: [32, 42],
          iconAnchor: [16, 41],
        }),
      });
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        onPickRef.current?.({
          latitude: Number(point.lat.toFixed(7)),
          longitude: Number(point.lng.toFixed(7)),
        });
      });
      marker.addTo(map);
      pickerMarkerRef.current = marker;
      map.setView(position, Math.max(map.getZoom(), FOCUSED_ZOOM));
    } else {
      pickerMarkerRef.current.setLatLng(position);
      if (!map.getBounds().pad(-0.2).contains(position)) {
        map.panTo(position);
      }
    }
    /**
     * Output:
     * Side effects — Pin del selector sincronizado
     */
  }

  useEffect(syncMarkers, [markers, isPicker]);
  useEffect(syncPicker, [value?.latitude, value?.longitude, isPicker]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Output:
   * @returns JSX.Element — Contenedor del mapa
   */
  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={ariaLabel}
      className={cn(
        "venue-map relative z-0 overflow-hidden rounded-[24px] border border-white/10 bg-pitch",
        isPicker && "cursor-crosshair",
        className,
      )}
    />
  );
}
