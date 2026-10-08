export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt ignora todo lo que supere 72 bytes, así que es el techo real del hash. */
export const PASSWORD_MAX_BYTES = 72;

export type PasswordRuleId = "length" | "lowercase" | "uppercase" | "digit";

export interface PasswordRule {
  id: PasswordRuleId;
  label: string;
  isSatisfiedBy: (password: string) => boolean;
}

export type PasswordStrength = "empty" | "weak" | "fair" | "strong";

const utf8Encoder = new TextEncoder();

/**
 * Propósito: Mide la contraseña en bytes UTF-8, que es lo que bcrypt realmente consume.
 */
export function getPasswordByteLength(password: string): number {
  /**
   * Output:
   * @returns number — Cantidad de bytes UTF-8 (un emoji o tilde puede ocupar 2–4)
   */
  return utf8Encoder.encode(password).length;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_BYTES} caracteres`,
    isSatisfiedBy: (password) =>
      password.length >= PASSWORD_MIN_LENGTH &&
      getPasswordByteLength(password) <= PASSWORD_MAX_BYTES,
  },
  {
    id: "lowercase",
    label: "Una letra minúscula",
    isSatisfiedBy: (password) => /\p{Ll}/u.test(password),
  },
  {
    id: "uppercase",
    label: "Una letra mayúscula",
    isSatisfiedBy: (password) => /\p{Lu}/u.test(password),
  },
  {
    id: "digit",
    label: "Un número",
    isSatisfiedBy: (password) => /\d/.test(password),
  },
];

/**
 * Propósito: Devuelve el mensaje de la primera regla incumplida (fail-fast) o null si cumple todo.
 * Lo comparten el formulario y el schema del BFF para que el mensaje sea idéntico en ambos lados.
 */
export function getPasswordPolicyViolation(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    /**
     * Output:
     * @returns string — Mensaje de longitud mínima
     */
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`;
  }

  if (getPasswordByteLength(password) > PASSWORD_MAX_BYTES) {
    /**
     * Output:
     * @returns string — Mensaje de longitud máxima (medida en bytes)
     */
    return `La contraseña no puede superar ${PASSWORD_MAX_BYTES} caracteres`;
  }

  const unmetRule = PASSWORD_RULES.find((rule) => !rule.isSatisfiedBy(password));
  /**
   * Output:
   * @returns string | null — "La contraseña debe incluir …" o null si es válida
   */
  return unmetRule ? `La contraseña debe incluir ${unmetRule.label.toLowerCase()}` : null;
}

/**
 * Propósito: Clasifica la fortaleza para el medidor visual: reglas cumplidas + bonus por longitud.
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    /**
     * Output:
     * @returns "empty" — Aún no se ha escrito nada
     */
    return "empty";
  }

  const satisfiedRuleCount = PASSWORD_RULES.filter((rule) =>
    rule.isSatisfiedBy(password),
  ).length;
  const isAllRulesMet = satisfiedRuleCount === PASSWORD_RULES.length;
  const hasSymbol = /[^\p{L}\d]/u.test(password);
  const isLong = password.length >= 12;

  /**
   * Output:
   * @returns PasswordStrength
   *   - "strong": cumple todo y además es larga (12+) o tiene símbolo
   *   - "fair": cumple todas las reglas mínimas
   *   - "weak": le falta al menos una regla
   */
  if (isAllRulesMet && (isLong || hasSymbol)) return "strong";
  return isAllRulesMet ? "fair" : "weak";
}
