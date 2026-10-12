import type { TranslateFn } from "@/core/i18n/translate";
import {
  getPasswordByteLength,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  type PasswordRuleId,
} from "@/domain/password-policy";

const RULE_KEYS: Record<
  PasswordRuleId,
  "password.ruleLength" | "password.ruleLowercase" | "password.ruleUppercase" | "password.ruleDigit"
> = {
  length: "password.ruleLength",
  lowercase: "password.ruleLowercase",
  uppercase: "password.ruleUppercase",
  digit: "password.ruleDigit",
};

/**
 * Propósito: Misma política que getPasswordPolicyViolation, con copy del diccionario activo.
 */
export function translatePasswordPolicyViolation(
  password: string,
  t: TranslateFn,
): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    /**
     * Output:
     * @returns string — Longitud mínima localizada
     */
    return t("password.minLength", { min: PASSWORD_MIN_LENGTH });
  }
  if (getPasswordByteLength(password) > PASSWORD_MAX_BYTES) {
    /**
     * Output:
     * @returns string — Longitud máxima localizada
     */
    return t("password.maxLength", { max: PASSWORD_MAX_BYTES });
  }
  const unmetRule = PASSWORD_RULES.find((rule) => !rule.isSatisfiedBy(password));
  if (!unmetRule) {
    /**
     * Output:
     * @returns null — Cumple todas las reglas
     */
    return null;
  }
  const ruleLabel = t(RULE_KEYS[unmetRule.id], {
    min: PASSWORD_MIN_LENGTH,
    max: PASSWORD_MAX_BYTES,
  }).toLowerCase();
  /**
   * Output:
   * @returns string — "debe incluir …" en el idioma activo
   */
  return t("password.mustInclude", { rule: ruleLabel });
}
