import type { EstablishmentAmenity } from "@/domain/establishment";
import { cn } from "@/shared/lib/cn";

const AMENITY_ICON_PATHS: Record<EstablishmentAmenity, string> = {
  parking: "M5 21V4h7a5 5 0 0 1 0 10H5",
  locker_rooms: "M5 3h6v18H5V3Zm8 0h6v18h-6V3ZM8 8v2m8-2v2",
  showers: "M4 20 14 10M14 10a5 5 0 0 1 7 0M8 14l-1 1m4 1-1 1m-4-5-1 1m8 6-1 1",
  cafeteria: "M4 8h13v5a6 6 0 0 1-6 6H10a6 6 0 0 1-6-6V8Zm13 1h1a3 3 0 0 1 0 6h-1M8 2v3m4-3v3",
  wifi: "M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01",
  night_lighting: "M9 18h6m-5 3h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z",
  covered: "M3 11 12 4l9 7M5 10v10h14V10",
  equipment_rental: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4 3.5 2.5-1.3 4h-4.4l-1.3-4L12 7Z",
  first_aid: "M4 7h16v13H4V7Zm5-3h6v3H9V4Zm3 6v7m-3.5-3.5h7",
  accessible: "M12 4a1.5 1.5 0 1 0 0 .01M9 9h6m-3 0v5h4l2 5M10 13a5 5 0 1 0 5 6",
  store: "M4 9h16l-1-5H5L4 9Zm0 0v11h16V9M9 20v-6h6v6",
  grill_area: "M4 10h16a8 8 0 0 1-16 0Zm4 8-2 3m10-3 2 3M9 3c-1 1.5 1 2.5 0 4m3-4c-1 1.5 1 2.5 0 4m3-4c-1 1.5 1 2.5 0 4",
};

/**
 * Propósito: Glifo lineal de un servicio de la sede (sin hooks: sirve en servidor y cliente).
 */
export function AmenityIcon({
  amenity,
  className,
}: {
  amenity: EstablishmentAmenity;
  className?: string;
}) {
  /**
   * Output:
   * @returns JSX.Element — SVG 20×20 con stroke currentColor
   */
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("size-5 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={AMENITY_ICON_PATHS[amenity]} />
    </svg>
  );
}

const CONTACT_ICON_PATHS = {
  phone:
    "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  whatsapp:
    "M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Zm5-11c0 3 3 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2L9 9Z",
  email: "M4 6h16v12H4V6Zm0 0 8 7 8-7",
  website: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9Z",
  instagram:
    "M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm8 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5-1.5h.01",
  pin: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  route: "M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 17h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7",
} as const;

export type ContactIconName = keyof typeof CONTACT_ICON_PATHS;

/**
 * Propósito: Íconos de contacto y ubicación de la ficha de sede.
 */
export function ContactIcon({ name, className }: { name: ContactIconName; className?: string }) {
  /**
   * Output:
   * @returns JSX.Element — SVG 18×18 con stroke currentColor
   */
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("size-[18px] shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={CONTACT_ICON_PATHS[name]} />
    </svg>
  );
}
