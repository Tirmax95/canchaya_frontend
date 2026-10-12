import type { CourtLiveStatus } from "@/domain/venue-occupancy";

interface CourtStatusPresentation {
  chipClassName: string;
  dotClassName: string;
  /** Color del halo de la cancha en la escena 3D. */
  glowColor: string;
}

export const COURT_STATUS_PRESENTATION: Record<CourtLiveStatus, CourtStatusPresentation> = {
  in_play: {
    chipClassName: "bg-lime/15 text-lime",
    dotClassName: "bg-lime",
    glowColor: "rgba(214, 242, 106, 0.85)",
  },
  awaiting_confirmation: {
    chipClassName: "bg-clay/20 text-clay",
    dotClassName: "bg-clay",
    glowColor: "rgba(228, 211, 180, 0.8)",
  },
  starting_soon: {
    chipClassName: "bg-sky-300/15 text-sky-200",
    dotClassName: "bg-sky-300",
    glowColor: "rgba(125, 211, 252, 0.7)",
  },
  free: {
    chipClassName: "bg-white/8 text-mist",
    dotClassName: "bg-mist/50",
    glowColor: "rgba(200, 212, 204, 0.0)",
  },
};
