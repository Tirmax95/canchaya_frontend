import { cn } from "@/shared/lib/cn";
import type { CSSProperties, ReactNode } from "react";

interface IsoBoxProps {
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  elevation?: number;
  topClassName?: string;
  /** Caras perpendiculares al eje X (izquierda/derecha). */
  sideXClassName?: string;
  /** Caras perpendiculares al eje Y (frente/fondo). */
  sideYClassName?: string;
  topStyle?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

/**
 * Propósito: Prisma rectangular en el plano isométrico con sus 4 caras laterales y tapa.
 * Se dibujan todas las caras para que la escena se vea bien al rotar la cámara 90°.
 */
export function IsoBox({
  x,
  y,
  width,
  depth,
  height,
  elevation = 0,
  topClassName,
  sideXClassName = "bg-[#0d1d14]",
  sideYClassName = "bg-[#132a1d]",
  topStyle,
  className,
  children,
}: IsoBoxProps) {
  /**
   * Output:
   * @returns JSX.Element — Caja 3D posicionada; children se pintan sobre la tapa
   */
  return (
    <div
      className={cn("iso-3d absolute", className)}
      style={{
        left: x,
        top: y,
        width,
        height: depth,
        transform: `translateZ(${elevation}px)`,
      }}
    >
      <div
        className={cn("absolute left-0 top-0", sideYClassName)}
        style={{
          width,
          height,
          transformOrigin: "top",
          transform: "rotateX(90deg)",
        }}
      />
      <div
        className={cn("absolute left-0", sideYClassName)}
        style={{
          width,
          height,
          top: depth - height,
          transformOrigin: "bottom",
          transform: "rotateX(-90deg)",
        }}
      />
      <div
        className={cn("absolute left-0 top-0", sideXClassName)}
        style={{
          width: height,
          height: depth,
          transformOrigin: "left",
          transform: "rotateY(-90deg)",
        }}
      />
      <div
        className={cn("absolute top-0", sideXClassName)}
        style={{
          width: height,
          height: depth,
          left: width - height,
          transformOrigin: "right",
          transform: "rotateY(90deg)",
        }}
      />
      <div
        className={cn("iso-3d absolute inset-0", topClassName)}
        style={{ ...topStyle, transform: `translateZ(${height}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Propósito: Ancla un elemento "de pie" en un punto del plano; siempre mira a la cámara.
 * El hijo se apoya con su borde inferior centrado sobre (x, y).
 */
export function Upright({
  x,
  y,
  lift = 0,
  className,
  children,
}: {
  x: number | string;
  y: number | string;
  lift?: number;
  className?: string;
  children: ReactNode;
}) {
  /**
   * Output:
   * @returns JSX.Element — Ancla de tamaño cero con contenido contra-rotado
   */
  return (
    <div
      className="iso-upright"
      style={{ left: x, top: y, ["--iso-lift" as string]: `${lift}px` }}
    >
      <div className={cn("absolute bottom-0 left-0 -translate-x-1/2", className)}>
        {children}
      </div>
    </div>
  );
}
