export const ERROR_LOG_LEVELS = ["warn", "error", "fatal"] as const;
export type ErrorLogLevel = (typeof ERROR_LOG_LEVELS)[number];

export const ERROR_LOG_SOURCES = ["backend", "frontend", "bff"] as const;
export type ErrorLogSource = (typeof ERROR_LOG_SOURCES)[number];

export interface SystemErrorLogEntry {
  errorId: number;
  occurredAt: string;
  level: ErrorLogLevel;
  source: ErrorLogSource;
  service: string | null;
  correlationId: string;
  fingerprint: string;
  requestMethod: string | null;
  requestPath: string | null;
  statusCode: number | null;
  actorUserId: number | null;
  errorName: string;
  errorMessage: string;
  stack: string | null;
  context: Record<string, unknown>;
}

export interface SystemErrorLogSummary {
  errorsLast24h: number;
  warningsLast24h: number;
  uniqueFingerprintsLast24h: number;
}

export interface SystemErrorLogPage {
  summary: SystemErrorLogSummary;
  entries: SystemErrorLogEntry[];
}

export const ERROR_LOG_LEVEL_LABELS: Record<ErrorLogLevel, string> = {
  warn: "Aviso",
  error: "Error",
  fatal: "Crítico",
};

export const ERROR_LOG_SOURCE_LABELS: Record<ErrorLogSource, string> = {
  backend: "API",
  frontend: "Navegador",
  bff: "Web (BFF)",
};
