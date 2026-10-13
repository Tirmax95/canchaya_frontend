/**
 * Propósito: Constantes públicas de la app. Sin dependencias de Node ni de process.env
 * secreto: este módulo sí puede llegar al navegador.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "CanchaYa";
export const APP_TIMEZONE = "America/Bogota";
export const APP_LOCALE = "es-CO";
export const APP_CURRENCY = "COP";
