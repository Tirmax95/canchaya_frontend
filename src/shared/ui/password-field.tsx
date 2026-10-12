"use client";

import { useI18n } from "@/core/i18n/provider";
import {
  getPasswordStrength,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  type PasswordRuleId,
  type PasswordStrength,
} from "@/domain/password-policy";
import { cn } from "@/shared/lib/cn";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";

type NativeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "maxLength" | "autoComplete"
>;

interface PasswordFieldProps extends NativeInputProps {
  label: string;
  /** Obligatorio para que los gestores de contraseñas sepan si deben autocompletar o sugerir. */
  autoComplete: "current-password" | "new-password";
  hint?: string;
  error?: string;
  /** Muestra checklist de requisitos y medidor de fortaleza (solo para contraseñas nuevas). */
  showRequirements?: boolean;
}

const STRENGTH_FILLED_SEGMENTS: Record<PasswordStrength, number> = {
  empty: 0,
  weak: 1,
  fair: 2,
  strong: 3,
};

const STRENGTH_COLOR_CLASSES: Record<PasswordStrength, string> = {
  empty: "bg-white/10",
  weak: "bg-danger",
  fair: "bg-flare",
  strong: "bg-lime",
};

/**
 * Propósito: Campo de contraseña estándar: mostrar/ocultar, aviso de Bloq Mayús, límite de
 * longitud compatible con bcrypt y, opcionalmente, requisitos con medidor de fortaleza.
 * Vuelve a ocultar el valor al enviar el formulario para que el navegador lo guarde como contraseña.
 */
export function PasswordField({
  label,
  hint,
  error,
  showRequirements = false,
  id,
  className,
  onChange,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...inputProps
}: PasswordFieldProps) {
  const { t } = useI18n();
  const generatedId = useId();
  const fieldId = id ?? inputProps.name ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  useEffect(() => {
    const parentForm = inputRef.current?.form;
    if (!parentForm) return;
    const hidePassword = () => setIsPasswordVisible(false);
    parentForm.addEventListener("submit", hidePassword);
    return () => parentForm.removeEventListener("submit", hidePassword);
  }, []);

  /**
   * Propósito: Sincroniza el valor local (para requisitos) sin romper el onChange del consumidor.
   */
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setPasswordValue(event.target.value);
    onChange?.(event);
    /**
     * Output:
     * Side effects — Actualiza checklist/medidor y propaga el evento
     */
  }

  /**
   * Propósito: Detecta Bloq Mayús en cada pulsación; es la causa más común de "contraseña incorrecta".
   */
  function handleCapsLockDetection(event: KeyboardEvent<HTMLInputElement>) {
    setIsCapsLockOn(event.getModifierState("CapsLock"));
    if (event.type === "keydown") onKeyDown?.(event);
    else onKeyUp?.(event);
    /**
     * Output:
     * Side effects — Muestra u oculta el aviso de Bloq Mayús
     */
  }

  const describedByIds = [
    error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : null,
    isCapsLockOn ? `${fieldId}-capslock` : null,
    showRequirements ? `${fieldId}-requirements` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const strength = getPasswordStrength(passwordValue);
  const toggleLabel = isPasswordVisible ? t("password.hide") : t("password.show");

  /**
   * Output:
   * @returns JSX.Element — Campo de contraseña con toggle de visibilidad y ayudas accesibles
   */
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="block text-sm font-medium text-mist">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={fieldId}
          type={isPasswordVisible ? "text" : "password"}
          maxLength={PASSWORD_MAX_BYTES}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds || undefined}
          className={cn(
            "w-full rounded-2xl border bg-ink/40 py-3 pl-4 pr-12 text-bone outline-none transition placeholder:text-mist/50 focus:border-lime/70",
            error ? "border-danger/70" : "border-white/10",
            className,
          )}
          onChange={handleChange}
          onKeyDown={handleCapsLockDetection}
          onKeyUp={handleCapsLockDetection}
          onBlur={(event) => {
            setIsCapsLockOn(false);
            onBlur?.(event);
          }}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
          aria-label={toggleLabel}
          aria-pressed={isPasswordVisible}
          aria-controls={fieldId}
          title={toggleLabel}
          disabled={inputProps.disabled}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-mist transition hover:bg-white/5 hover:text-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {isCapsLockOn ? (
        <span id={`${fieldId}-capslock`} role="status" className="block text-xs text-flare">
          {t("password.capsLock")}
        </span>
      ) : null}

      {error ? (
        <span id={`${fieldId}-error`} className="block text-xs text-danger">
          {error}
        </span>
      ) : hint ? (
        <span id={`${fieldId}-hint`} className="block text-xs text-mist/70">
          {hint}
        </span>
      ) : null}

      {showRequirements ? (
        <PasswordRequirements
          listId={`${fieldId}-requirements`}
          password={passwordValue}
          strength={strength}
        />
      ) : null}
    </div>
  );
}

interface PasswordRequirementsProps {
  listId: string;
  password: string;
  strength: PasswordStrength;
}

/**
 * Propósito: Medidor de fortaleza + checklist de reglas en vivo, leído por lectores de pantalla.
 */
const PASSWORD_RULE_KEYS: Record<PasswordRuleId, "password.ruleLength" | "password.ruleLowercase" | "password.ruleUppercase" | "password.ruleDigit"> = {
  length: "password.ruleLength",
  lowercase: "password.ruleLowercase",
  uppercase: "password.ruleUppercase",
  digit: "password.ruleDigit",
};

const STRENGTH_KEYS: Record<Exclude<PasswordStrength, "empty">, "password.weak" | "password.fair" | "password.strong"> = {
  weak: "password.weak",
  fair: "password.fair",
  strong: "password.strong",
};

function PasswordRequirements({ listId, password, strength }: PasswordRequirementsProps) {
  const { t } = useI18n();
  const filledSegments = STRENGTH_FILLED_SEGMENTS[strength];

  /**
   * Output:
   * @returns JSX.Element — Barra de 3 segmentos y lista de requisitos con estado cumplido/pendiente
   */
  return (
    <div id={listId} className="space-y-2 pt-1">
      <div className="flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3].map((segment) => (
            <span
              key={segment}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                segment <= filledSegments
                  ? STRENGTH_COLOR_CLASSES[strength]
                  : "bg-white/10",
              )}
            />
          ))}
        </div>
        <span className="min-w-16 text-right text-xs text-mist/80" aria-live="polite">
          {strength === "empty" ? "" : t(STRENGTH_KEYS[strength])}
        </span>
      </div>
      <ul className="grid gap-1 text-xs sm:grid-cols-2">
        {PASSWORD_RULES.map((rule) => {
          const isRuleMet = rule.isSatisfiedBy(password);
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 transition-colors",
                isRuleMet ? "text-lime" : "text-mist/70",
              )}
            >
              {isRuleMet ? <CheckIcon /> : <DotIcon />}
              <span>
                {t(PASSWORD_RULE_KEYS[rule.id], {
                  min: PASSWORD_MIN_LENGTH,
                  max: PASSWORD_MAX_BYTES,
                })}
              </span>
              <span className="sr-only">{isRuleMet ? t("password.met") : t("password.pending")}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Propósito: Ícono de ojo abierto (acción: mostrar).
 */
function EyeIcon() {
  /**
   * Output:
   * @returns JSX.Element — SVG decorativo de 20px
   */
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Propósito: Ícono de ojo tachado (acción: ocultar).
 */
function EyeOffIcon() {
  /**
   * Output:
   * @returns JSX.Element — SVG decorativo de 20px
   */
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-2.9 3.9" />
      <path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

/**
 * Propósito: Marca de requisito cumplido.
 */
function CheckIcon() {
  /**
   * Output:
   * @returns JSX.Element — SVG decorativo de 14px
   */
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 5 5L19 7" />
    </svg>
  );
}

/**
 * Propósito: Marca de requisito pendiente.
 */
function DotIcon() {
  /**
   * Output:
   * @returns JSX.Element — SVG decorativo de 14px
   */
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
