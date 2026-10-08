import { formatHourOfDay, isCourtOccupied, toLocalHourOfDay, type CourtSnapshot } from "@/domain/venue-occupancy";
import type { VenueMapField } from "@/application/venue-map";
import { cn } from "@/shared/lib/cn";
import { COURT_STATUS_PRESENTATION } from "@/features/admin/venue-map/court-status";
import { IsoBox, Upright } from "@/features/admin/venue-map/iso-primitives";

const SLAB_HEIGHT = 10;
const PLAYERS_PER_TEAM = 5;
const FLOODLIGHT_INSET = 6;

interface PlayerPlacement {
  key: string;
  leftPercent: number;
  topPercent: number;
  isHomeTeam: boolean;
  delaySeconds: number;
}

/**
 * Propósito: Generador pseudoaleatorio determinista (mulberry32) para que cada cancha
 * tenga siempre la misma formación entre renders y entre servidor/cliente.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  /**
   * Output:
   * @returns () => number — Función que devuelve floats en [0, 1)
   */
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Propósito: Reparte 5 vs 5 jugadores, cada equipo en su mitad, con arqueros cerca del arco.
 */
function buildPlayerPlacements(fieldId: number): PlayerPlacement[] {
  const random = createSeededRandom(fieldId * 7919);
  const placements: PlayerPlacement[] = [];
  for (const isHomeTeam of [true, false]) {
    for (let playerIndex = 0; playerIndex < PLAYERS_PER_TEAM; playerIndex += 1) {
      const isGoalkeeper = playerIndex === 0;
      const depthFromOwnGoal = isGoalkeeper ? 6 : 14 + random() * 32;
      placements.push({
        key: `${isHomeTeam ? "home" : "away"}-${playerIndex}`,
        leftPercent: isHomeTeam ? depthFromOwnGoal : 100 - depthFromOwnGoal,
        topPercent: isGoalkeeper ? 50 : 18 + random() * 64,
        isHomeTeam,
        delaySeconds: random() * 1.4,
      });
    }
  }
  /**
   * Output:
   * @returns PlayerPlacement[] — 10 posiciones en % de la cancha
   */
  return placements;
}

/**
 * Propósito: Cancha individual en la escena: losa, césped, demarcación, reflectores,
 * jugadores cuando está ocupada y pin informativo cuando está seleccionada.
 */
export function CourtTile({
  field,
  snapshot,
  x,
  y,
  width,
  depth,
  isSelected,
  onSelect,
}: {
  field: VenueMapField;
  snapshot: CourtSnapshot;
  x: number;
  y: number;
  width: number;
  depth: number;
  isSelected: boolean;
  onSelect: (fieldId: number) => void;
}) {
  const presentation = COURT_STATUS_PRESENTATION[snapshot.status];
  const isOccupied = isCourtOccupied(snapshot);
  const areLightsOn = isOccupied || snapshot.status === "starting_soon";
  const goalDepth = depth * 0.26;

  /**
   * Output:
   * @returns JSX.Element — Cancha 3D seleccionable
   */
  return (
    <IsoBox
      x={x}
      y={y}
      width={width}
      depth={depth}
      height={SLAB_HEIGHT}
      elevation={isSelected ? 8 : 0}
      className="transition-transform duration-300"
      sideXClassName="bg-[#0f2418]"
      sideYClassName="bg-[#173322]"
      topClassName={cn("rounded-[3px]", areLightsOn ? "iso-turf" : "iso-turf-dim")}
      topStyle={{
        boxShadow: isSelected
          ? `0 0 0 2px #d6f26a, 0 0 46px 6px ${presentation.glowColor}`
          : `0 0 0 1px rgba(244,239,228,0.08), 0 0 36px 2px ${presentation.glowColor}`,
      }}
    >
      <div className="absolute inset-[7px] rounded-[2px] border-2 border-bone/70" />
      <div className="absolute inset-y-[7px] left-1/2 w-0.5 -translate-x-1/2 bg-bone/70" />
      <div className="absolute left-1/2 top-1/2 size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bone/70" />
      {[true, false].map((isLeftSide) => (
        <div
          key={isLeftSide ? "box-left" : "box-right"}
          className={cn(
            "absolute top-1/2 h-[44%] w-[13%] -translate-y-1/2 border-2 border-bone/70",
            isLeftSide ? "left-[7px] border-l-0" : "right-[7px] border-r-0",
          )}
        />
      ))}
      {[0, width - 6].map((goalX) => (
        <IsoBox
          key={goalX}
          x={goalX}
          y={(depth - goalDepth) / 2}
          width={6}
          depth={goalDepth}
          height={9}
          topClassName="bg-bone/90"
          sideXClassName="bg-bone/50"
          sideYClassName="bg-bone/70"
        />
      ))}

      {[
        [FLOODLIGHT_INSET, FLOODLIGHT_INSET],
        [width - FLOODLIGHT_INSET, FLOODLIGHT_INSET],
        [FLOODLIGHT_INSET, depth - FLOODLIGHT_INSET],
        [width - FLOODLIGHT_INSET, depth - FLOODLIGHT_INSET],
      ].map(([poleX, poleY]) => (
        <Upright key={`${poleX}-${poleY}`} x={poleX} y={poleY}>
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "h-2 w-4 rounded-[2px] border border-black/40",
                areLightsOn
                  ? "animate-iso-glow bg-flare shadow-[0_0_18px_6px_rgba(243,255,138,0.55)]"
                  : "bg-[#3a4a40]",
              )}
            />
            <div className="h-14 w-[3px] bg-gradient-to-b from-[#9fb0a5] to-[#4b5a51]" />
          </div>
        </Upright>
      ))}

      {isOccupied
        ? buildPlayerPlacements(field.id).map((player) => (
            <Upright
              key={player.key}
              x={`${player.leftPercent}%`}
              y={`${player.topPercent}%`}
            >
              <div
                className="animate-iso-bob flex flex-col items-center"
                style={{ animationDelay: `${player.delaySeconds}s` }}
              >
                <div className="size-[7px] rounded-full bg-[#f1c9a5]" />
                <div
                  className={cn(
                    "h-[11px] w-[8px] rounded-t-[4px] rounded-b-[2px]",
                    snapshot.status === "awaiting_confirmation"
                      ? "bg-clay/80"
                      : player.isHomeTeam
                        ? "bg-lime"
                        : "bg-bone",
                  )}
                />
              </div>
            </Upright>
          ))
        : null}

      {isOccupied ? (
        <Upright x="50%" y="50%">
          <div
            className="animate-iso-drift size-[6px] rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]"
            style={{ ["--drift-x" as string]: "14px", ["--drift-y" as string]: "-5px" }}
          />
        </Upright>
      ) : null}

      <Upright x={14} y={depth - 12} lift={2}>
        <span className="block whitespace-nowrap rounded-md bg-ink/85 px-1.5 py-0.5 text-[10px] font-semibold text-bone ring-1 ring-white/10">
          {field.numberField}
        </span>
      </Upright>

      {isSelected ? (
        <Upright x="50%" y="50%" lift={34}>
          <div className="animate-iso-pin flex flex-col items-center">
            <div className="whitespace-nowrap rounded-xl bg-bone px-3 py-1.5 text-center text-ink shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
              <p className="text-[11px] font-bold leading-tight">Cancha {field.numberField}</p>
              <p className="text-[10px] leading-tight text-ink/70">
                {describeSnapshotForPin(snapshot)}
              </p>
            </div>
            <div className="size-0 border-x-[6px] border-t-[8px] border-x-transparent border-t-bone" />
          </div>
        </Upright>
      ) : null}

      <button
        type="button"
        onClick={() => onSelect(field.id)}
        aria-label={`Cancha ${field.numberField}: ${presentation.label}`}
        aria-pressed={isSelected}
        className="absolute inset-0 cursor-pointer rounded-[3px] outline-none focus-visible:ring-2 focus-visible:ring-lime"
        style={{ transform: "translateZ(1px)" }}
      />
    </IsoBox>
  );
}

/**
 * Propósito: Texto corto del pin según el estado de la cancha.
 */
function describeSnapshotForPin(snapshot: CourtSnapshot): string {
  if (snapshot.currentReservation) {
    /**
     * Output:
     * @returns string — Estado y hora de fin del partido en curso
     */
    return `${COURT_STATUS_PRESENTATION[snapshot.status].label} · hasta ${formatHourOfDay(
      toLocalHourOfDay(snapshot.currentReservation.endTime),
    )}`;
  }
  if (snapshot.nextReservation) {
    /**
     * Output:
     * @returns string — Libre con la próxima hora reservada
     */
    return `Libre · próxima ${formatHourOfDay(
      toLocalHourOfDay(snapshot.nextReservation.startTime),
    )}`;
  }
  /**
   * Output:
   * @returns string — Libre el resto del día
   */
  return "Libre el resto del día";
}
