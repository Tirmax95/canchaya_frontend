import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const SOURCE_ROOT = join(process.cwd(), "src");
const NAMED_IMPORT = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+"(@\/[^"]+)"/g;

/**
 * Propósito: Archivos .ts/.tsx de src (sin tests).
 */
function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.tsx?$/.test(entry) && !entry.endsWith(".test.ts") ? [path] : [];
  });
}

/**
 * Propósito: True si el archivo empieza con la directiva "use client".
 */
function isClientModule(path: string): boolean {
  return /^\s*["']use client["']/.test(readFileSync(path, "utf8"));
}

/**
 * Propósito: Ruta real de un import `@/…`.
 */
function resolveAlias(specifier: string): string | null {
  const base = join(SOURCE_ROOT, specifier.slice(2));
  const candidate = [".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext).find(existsSync);
  return candidate ?? null;
}

test("el código de servidor no llama funciones ni constantes de módulos 'use client'", () => {
  const violations: string[] = [];
  for (const file of listSourceFiles(SOURCE_ROOT)) {
    if (isClientModule(file)) continue;
    for (const match of readFileSync(file, "utf8").matchAll(NAMED_IMPORT)) {
      if (match[1]) continue;
      const target = resolveAlias(match[3]);
      if (!target || !isClientModule(target)) continue;
      const nonComponents = match[2]
        .split(",")
        .map((name) => name.trim().split(" as ")[0])
        .filter((name) => name && !name.startsWith("type ") && (/^[a-z]/.test(name) || /^[A-Z0-9_]+$/.test(name)));
      if (nonComponents.length > 0) {
        violations.push(`${file.replace(SOURCE_ROOT, "src")} → ${match[3]}: ${nonComponents.join(", ")}`);
      }
    }
  }
  // Un Server Component solo puede renderizar componentes cliente; llamar sus funciones falla.
  assert.deepEqual(violations, []);
});
