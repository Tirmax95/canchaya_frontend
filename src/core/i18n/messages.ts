import { esMessages } from "@/core/i18n/dictionaries/es";

export { enMessages } from "@/core/i18n/dictionaries/en";
export { esMessages };

type StringLeaf<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Record<string, unknown>
      ? StringLeaf<T[K]>
      : never;
};

export type Messages = StringLeaf<typeof esMessages>;

type NestedKey<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string
    ? Prefix extends ""
      ? K
      : `${Prefix}.${K}`
    : T[K] extends Record<string, unknown>
      ? NestedKey<T[K], Prefix extends "" ? K : `${Prefix}.${K}`>
      : never;
}[keyof T & string];

export type MessageKey = NestedKey<Messages>;
