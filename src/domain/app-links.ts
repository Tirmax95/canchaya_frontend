/**
 * Propósito: Archivos de verificación de universal links (iOS) y App Links (Android) para la
 * app móvil. Solo `/restablecer` abre la app: el enlace del correo de recuperación lleva a la
 * pantalla de contraseña nueva si la app está instalada y, si no, a esta web.
 * Funciones puras: las rutas de `/.well-known` les pasan las variables de entorno.
 */

/** Rutas que la app reclama. Deben coincidir con `APP_LINK_PATHS` de canchaya-app. */
export const MOBILE_APP_LINK_PATHS = ["/restablecer"] as const;

const IOS_APP_ID_PATTERN = /^[A-Z0-9]{10}\.[A-Za-z0-9][A-Za-z0-9.-]*$/;
const ANDROID_PACKAGE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const SHA256_FINGERPRINT_PATTERN = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

/**
 * Propósito: Lista separada por comas → valores válidos (normalizados) sin duplicados.
 */
function parseList(raw: string | undefined, normalize: (value: string) => string, pattern: RegExp): string[] {
  /**
   * Output:
   * @returns string[] — Valores que cumplen el formato; los demás se descartan
   */
  return [
    ...new Set(
      (raw ?? "")
        .split(",")
        .map((value) => normalize(value.trim()))
        .filter((value) => pattern.test(value)),
    ),
  ];
}

/**
 * Propósito: `apple-app-site-association` con los App IDs (`TEAMID.bundle`). Null si no hay
 * ninguno válido configurado: la ruta responde 404 y iOS no asocia nada.
 */
export function buildAppleAppSiteAssociation(rawAppIds: string | undefined) {
  const appIds = parseList(rawAppIds, (value) => value, IOS_APP_ID_PATTERN);
  if (appIds.length === 0) {
    /**
     * Output:
     * @returns null — Sin configuración
     */
    return null;
  }
  /**
   * Output:
   * @returns object — Documento AASA (formato con `components`)
   */
  return {
    applinks: {
      details: [
        {
          appIDs: appIds,
          components: MOBILE_APP_LINK_PATHS.map((path) => ({ "/": path, comment: "Restablecer contraseña" })),
        },
      ],
    },
  };
}

/**
 * Propósito: `assetlinks.json` de Android con el paquete y las huellas SHA-256 del
 * certificado de firma (las de EAS / Play App Signing). Null si falta algo válido.
 */
export function buildAndroidAssetLinks(rawPackageName: string | undefined, rawFingerprints: string | undefined) {
  const packageName = (rawPackageName ?? "").trim();
  const fingerprints = parseList(rawFingerprints, (value) => value.toUpperCase(), SHA256_FINGERPRINT_PATTERN);
  if (!ANDROID_PACKAGE_PATTERN.test(packageName) || fingerprints.length === 0) {
    /**
     * Output:
     * @returns null — Sin configuración
     */
    return null;
  }
  /**
   * Output:
   * @returns object[] — Declaración de Digital Asset Links
   */
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
