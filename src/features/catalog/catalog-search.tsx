"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

/**
 * Propósito: Filtro de catálogo por querystring, compatible con RSC.
 */
export function CatalogSearch({
  placeholder,
}: {
  placeholder: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  /**
   * Propósito: Actualiza `q` sin perder el resto de filtros.
   */
  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  /**
   * Output:
   * @returns JSX.Element — Input de búsqueda
   */
  return (
    <div className="relative">
      <input
        defaultValue={searchParams.get("q") ?? ""}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-white/10 bg-ink/50 px-5 py-3 text-sm text-bone outline-none placeholder:text-mist/60 focus:border-lime/60"
      />
      {isPending ? (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-mist">
          Filtrando…
        </span>
      ) : null}
    </div>
  );
}
