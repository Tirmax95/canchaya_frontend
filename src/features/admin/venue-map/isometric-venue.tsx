"use client";

import { useI18n } from "@/core/i18n/provider";
import type { VenueMapEstablishment, VenueMapField } from "@/application/venue-map";
import type { CourtSnapshot } from "@/domain/venue-occupancy";
import { CourtTile } from "@/features/admin/venue-map/court-tile";
import { IsoBox, Upright } from "@/features/admin/venue-map/iso-primitives";
import { cn } from "@/shared/lib/cn";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const COURT_WIDTH = 230;
const COURT_DEPTH = 140;
const GRID_GAP = 46;
const GROUND_PADDING = 72;
const CLUBHOUSE_WIDTH = 210;
const CLUBHOUSE_DEPTH = 104;
const CLUBHOUSE_HEIGHT = 62;
const MAX_GRID_COLUMNS = 3;
const TILT_DEGREES = 58;
const BASE_SPIN_DEGREES = -40;
const ZOOM_STEP = 1.2;
const MIN_ZOOM_FACTOR = 0.5;
const MAX_ZOOM_FACTOR = 2.5;
const DRAG_THRESHOLD_PX = 4;
/** Altura proyectada extra para reflectores y pines sobre el suelo. */
const SCENE_HEADROOM_PX = 110;
const OVERLAY_BREAKPOINT_PX = 1024;

export interface PlacedCourt {
  field: VenueMapField;
  snapshot: CourtSnapshot;
}

interface ViewportInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const NO_INSETS: ViewportInsets = { top: 0, right: 0, bottom: 0, left: 0 };
/** Espacio ocupado por los paneles flotantes en desktop, para centrar el complejo en el hueco libre. */
const DESKTOP_PANEL_INSETS: ViewportInsets = { top: 110, right: 360, bottom: 180, left: 64 };

interface SceneLayout {
  groundWidth: number;
  groundDepth: number;
  columns: number;
  tilePositions: Array<{ x: number; y: number }>;
  treePositions: Array<{ x: number; y: number }>;
}

/**
 * Propósito: Calcula la grilla del complejo (canchas + loseta de alta) y el tamaño del terreno.
 * La fila superior se reserva para la sede (clubhouse).
 */
function computeSceneLayout(tileCount: number): SceneLayout {
  const columns = Math.min(MAX_GRID_COLUMNS, Math.max(2, Math.ceil(Math.sqrt(tileCount))));
  const rows = Math.max(1, Math.ceil(tileCount / columns));
  const gridWidth = columns * COURT_WIDTH + (columns - 1) * GRID_GAP;
  const clubhouseRowDepth = CLUBHOUSE_DEPTH + GRID_GAP;
  const groundWidth = gridWidth + GROUND_PADDING * 2;
  const groundDepth =
    GROUND_PADDING * 2 + clubhouseRowDepth + rows * COURT_DEPTH + (rows - 1) * GRID_GAP;

  const tilePositions = Array.from({ length: tileCount }, (_, tileIndex) => ({
    x: GROUND_PADDING + (tileIndex % columns) * (COURT_WIDTH + GRID_GAP),
    y:
      GROUND_PADDING +
      clubhouseRowDepth +
      Math.floor(tileIndex / columns) * (COURT_DEPTH + GRID_GAP),
  }));

  const treePositions = [
    { x: 26, y: 30 },
    { x: groundWidth - 30, y: 34 },
    { x: 24, y: groundDepth - 28 },
    { x: groundWidth - 26, y: groundDepth - 34 },
    { x: groundWidth - 40, y: groundDepth / 2 },
    { x: 30, y: groundDepth / 2 + 40 },
  ];

  /**
   * Output:
   * @returns SceneLayout — Medidas en px del plano y posiciones de cada loseta y árbol
   */
  return { groundWidth, groundDepth, columns, tilePositions, treePositions };
}

/**
 * Propósito: Zoom que encaja el terreno rotado dentro del hueco visible del viewport.
 */
function computeFitZoom(
  groundWidth: number,
  groundDepth: number,
  spinDegrees: number,
  availableWidth: number,
  availableHeight: number,
): number {
  if (availableWidth <= 0 || availableHeight <= 0) {
    /**
     * Output:
     * @returns number — 1 mientras el viewport aún no se ha medido
     */
    return 1;
  }
  const spinRadians = (spinDegrees * Math.PI) / 180;
  const tiltRadians = (TILT_DEGREES * Math.PI) / 180;
  const projectedWidth =
    Math.abs(groundWidth * Math.cos(spinRadians)) + Math.abs(groundDepth * Math.sin(spinRadians));
  const projectedHeight =
    (Math.abs(groundWidth * Math.sin(spinRadians)) +
      Math.abs(groundDepth * Math.cos(spinRadians))) *
      Math.cos(tiltRadians) +
    SCENE_HEADROOM_PX;
  /**
   * Output:
   * @returns number — Escala que deja ~8% de margen
   */
  return Math.min(availableWidth / projectedWidth, availableHeight / projectedHeight) * 0.92;
}

/**
 * Propósito: Mide el viewport con ResizeObserver para recalcular el encuadre al redimensionar.
 */
function useElementSize<TElement extends HTMLElement>() {
  const elementRef = useRef<TElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /**
   * Output:
   * @returns object — Ref a asignar y tamaño actual
   *   - elementRef: RefObject — Elemento observado
   *   - size: { width, height } — px del content box
   */
  return { elementRef, size };
}

/**
 * Propósito: Suscribe a una media query para saber si los paneles flotan sobre el mapa (breakpoint lg).
 */
function useMediaQuery(query: string): boolean {
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const syncMatch = () => setIsMatching(mediaQueryList.matches);
    syncMatch();
    mediaQueryList.addEventListener("change", syncMatch);
    return () => mediaQueryList.removeEventListener("change", syncMatch);
  }, [query]);

  /**
   * Output:
   * @returns boolean — True si la query coincide (false en SSR)
   */
  return isMatching;
}

/**
 * Propósito: Vista isométrica del complejo de una sede con cámara (zoom, giro de 90°, arrastre).
 * Es puramente presentacional: el estado de cada cancha llega ya calculado en `courts`.
 */
export function IsometricVenue({
  establishment,
  courts,
  selectedFieldId,
  onSelectField,
  createCourtHref,
  isFullscreen,
  onToggleFullscreen,
}: {
  establishment: VenueMapEstablishment | null;
  courts: PlacedCourt[];
  selectedFieldId: number | null;
  onSelectField: (fieldId: number) => void;
  /** null cuando el tenant no tiene el módulo de canchas: no se ofrece crear. */
  createCourtHref: string | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const { t } = useI18n();
  const { elementRef: viewportRef, size: viewportSize } = useElementSize<HTMLDivElement>();
  const [spinDegrees, setSpinDegrees] = useState(BASE_SPIN_DEGREES);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPan: { x: number; y: number };
    hasMoved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const layout = useMemo(() => computeSceneLayout(courts.length + 1), [courts.length]);
  const arePanelsFloating = useMediaQuery(`(min-width: ${OVERLAY_BREAKPOINT_PX}px)`);
  const insets = arePanelsFloating ? DESKTOP_PANEL_INSETS : NO_INSETS;
  const fitZoom = computeFitZoom(
    layout.groundWidth,
    layout.groundDepth,
    spinDegrees,
    viewportSize.width - insets.left - insets.right,
    viewportSize.height - insets.top - insets.bottom,
  );
  const sceneScale = fitZoom * zoomFactor;
  const centerShiftX = (insets.left - insets.right) / 2 + panOffset.x;
  const centerShiftY = (insets.top - insets.bottom) / 2 + panOffset.y;

  const resetCamera = useCallback(() => {
    setSpinDegrees(BASE_SPIN_DEGREES);
    setZoomFactor(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  /**
   * Propósito: Inicia el arrastre de cámara solo con botón primario y fuera de controles.
   */
  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("[data-camera-control]")) {
      return;
    }
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originPan: panOffset,
      hasMoved: false,
    };
  }

  /**
   * Propósito: Desplaza la cámara; captura el puntero solo cuando supera el umbral para no romper clics.
   */
  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.hasMoved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) {
      return;
    }
    if (!dragState.hasMoved) {
      dragState.hasMoved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }
    setPanOffset({ x: dragState.originPan.x + deltaX, y: dragState.originPan.y + deltaY });
  }

  /**
   * Propósito: Cierra el arrastre y marca para ignorar el clic sintético que sigue al soltar.
   */
  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }
    suppressClickRef.current = dragState.hasMoved;
    dragStateRef.current = null;
    setIsDragging(false);
  }

  /**
   * Output:
   * @returns JSX.Element — Viewport con la escena 3D y la columna de controles de cámara
   */
  return (
    <div
      ref={viewportRef}
      className={cn(
        "absolute inset-0 touch-none select-none overflow-hidden",
        isDragging ? "cursor-grabbing" : "cursor-grab",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClickCapture={(event) => {
        if (suppressClickRef.current) {
          event.stopPropagation();
          event.preventDefault();
          suppressClickRef.current = false;
        }
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_40%_45%,rgba(214,242,106,0.10),transparent_60%)]"
      />

      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: `translate(${centerShiftX}px, ${centerShiftY}px)` }}
      >
        <div
          className="iso-scene absolute"
          style={{
            width: layout.groundWidth,
            height: layout.groundDepth,
            left: -layout.groundWidth / 2,
            top: -layout.groundDepth / 2,
            ["--iso-spin" as string]: `${spinDegrees}deg`,
            transform: `scale(${sceneScale}) rotateX(var(--iso-tilt)) rotateZ(var(--iso-spin))`,
          }}
        >
          <IsoBox
            x={0}
            y={0}
            width={layout.groundWidth}
            depth={layout.groundDepth}
            height={18}
            topClassName="pitch-grid rounded-[6px] bg-[#0e1f15]"
            sideXClassName="bg-[#07120c]"
            sideYClassName="bg-[#0a1810]"
            topStyle={{ boxShadow: "inset 0 0 0 2px rgba(214,242,106,0.08)" }}
          >
            <div
              className="absolute rounded-full bg-[#1a3325]"
              style={{
                left: GROUND_PADDING / 2,
                right: GROUND_PADDING / 2,
                top: GROUND_PADDING + CLUBHOUSE_DEPTH + GRID_GAP / 2 - 7,
                height: 14,
              }}
            />
            <div
              className="absolute rounded-full bg-[#1a3325]"
              style={{
                left: GROUND_PADDING + CLUBHOUSE_WIDTH / 2 - 7,
                width: 14,
                top: GROUND_PADDING + CLUBHOUSE_DEPTH,
                height: GRID_GAP / 2,
              }}
            />

            <IsoBox
              x={GROUND_PADDING}
              y={GROUND_PADDING}
              width={CLUBHOUSE_WIDTH}
              depth={CLUBHOUSE_DEPTH}
              height={CLUBHOUSE_HEIGHT}
              topClassName="bg-[#e9e4d8]"
              sideXClassName="bg-[#bdb6a6]"
              sideYClassName="bg-[#d3cdbf]"
            >
              <div className="absolute inset-3 rounded-sm border border-ink/10 bg-[linear-gradient(135deg,#f4efe4,#dcd5c5)]" />
              <IsoBox
                x={CLUBHOUSE_WIDTH - 62}
                y={16}
                width={40}
                depth={26}
                height={14}
                topClassName="bg-[#c9c2b2]"
                sideXClassName="bg-[#a39c8c]"
                sideYClassName="bg-[#b5ae9e]"
              />
              <Upright x={CLUBHOUSE_WIDTH / 2} y={CLUBHOUSE_DEPTH - 8} lift={4}>
                <div className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1 shadow-[0_8px_20px_rgba(0,0,0,0.45)] ring-1 ring-lime/40">
                  <span className="size-1.5 rounded-full bg-lime" />
                  <span className="font-display text-[11px] font-bold tracking-wide text-bone">
                    {establishment?.name ?? t("venueMap.yourVenue")}
                  </span>
                </div>
              </Upright>
            </IsoBox>

            {courts.map(({ field, snapshot }, courtIndex) => {
              const position = layout.tilePositions[courtIndex];
              return (
                <CourtTile
                  key={field.id}
                  field={field}
                  snapshot={snapshot}
                  x={position.x}
                  y={position.y}
                  width={COURT_WIDTH}
                  depth={COURT_DEPTH}
                  isSelected={field.id === selectedFieldId}
                  onSelect={onSelectField}
                />
              );
            })}

            {createCourtHref ? (
              <CreateCourtTile
                href={createCourtHref}
                x={layout.tilePositions[courts.length].x}
                y={layout.tilePositions[courts.length].y}
              />
            ) : null}

            {layout.treePositions.map((treePosition) => (
              <Upright key={`${treePosition.x}-${treePosition.y}`} x={treePosition.x} y={treePosition.y}>
                <div className="flex flex-col items-center">
                  <div className="size-6 rounded-full bg-[radial-gradient(circle_at_35%_30%,#5f9a5a,#2f5f35)] shadow-[0_6px_10px_rgba(0,0,0,0.35)]" />
                  <div className="h-3 w-1 bg-[#5b4632]" />
                </div>
              </Upright>
            ))}
          </IsoBox>
        </div>
      </div>

      <div
        data-camera-control
        className="absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-2xl border border-white/10 bg-ink/80 p-1 backdrop-blur lg:left-4 lg:right-auto lg:top-[124px]"
      >
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? t("venueMap.exitFullscreenTitle") : t("venueMap.enterFullscreenTitle")}
          aria-label={isFullscreen ? t("venueMap.exitFullscreenAria") : t("venueMap.enterFullscreenAria")}
          aria-pressed={isFullscreen}
          className="mb-1 flex size-9 items-center justify-center rounded-xl bg-lime text-ink transition hover:bg-flare focus-visible:outline-2 focus-visible:outline-lime"
        >
          <FullscreenIcon isFullscreen={isFullscreen} />
        </button>
        <CameraButton
          label={t("venueMap.zoomIn")}
          onClick={() => setZoomFactor((current) => Math.min(MAX_ZOOM_FACTOR, current * ZOOM_STEP))}
        >
          +
        </CameraButton>
        <CameraButton
          label={t("venueMap.zoomOut")}
          onClick={() => setZoomFactor((current) => Math.max(MIN_ZOOM_FACTOR, current / ZOOM_STEP))}
        >
          −
        </CameraButton>
        <CameraButton label={t("venueMap.rotateLeft")} onClick={() => setSpinDegrees((current) => current - 90)}>
          ↺
        </CameraButton>
        <CameraButton label={t("venueMap.rotateRight")} onClick={() => setSpinDegrees((current) => current + 90)}>
          ↻
        </CameraButton>
        <CameraButton label={t("venueMap.centerView")} onClick={resetCamera}>
          ⌂
        </CameraButton>
      </div>
    </div>
  );
}

/**
 * Propósito: Loseta punteada en el terreno para dar de alta una cancha en esta sede.
 */
function CreateCourtTile({ href, x, y }: { href: string; x: number; y: number }) {
  const { t } = useI18n();
  /**
   * Output:
   * @returns JSX.Element — Enlace plano en el plano isométrico
   */
  return (
    <Link
      href={href}
      aria-label={t("venueMap.addCourtScene")}
      className="group absolute flex items-center justify-center rounded-[4px] border-2 border-dashed border-lime/35 bg-lime/[0.03] transition hover:border-lime hover:bg-lime/10"
      style={{ left: x, top: y, width: COURT_WIDTH, height: COURT_DEPTH, transform: "translateZ(1px)" }}
    >
      <span className="flex flex-col items-center gap-1 text-lime/70 group-hover:text-lime">
        <span className="font-display text-4xl leading-none">+</span>
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">{t("venueMap.newCourtTile")}</span>
      </span>
    </Link>
  );
}

/**
 * Propósito: Ícono de expandir/contraer según el modo de pantalla actual.
 */
function FullscreenIcon({ isFullscreen }: { isFullscreen: boolean }) {
  /**
   * Output:
   * @returns JSX.Element — SVG decorativo de 18px
   */
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isFullscreen ? (
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      ) : (
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      )}
    </svg>
  );
}

/**
 * Propósito: Botón cuadrado de la barra de cámara.
 */
function CameraButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  /**
   * Output:
   * @returns JSX.Element — Botón accesible con tooltip nativo
   */
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-xl text-lg text-bone transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-lime"
    >
      {children}
    </button>
  );
}
