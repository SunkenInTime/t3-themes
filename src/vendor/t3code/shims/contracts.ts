// Local shim for `@t3tools/contracts`, a private t3code package. The theme
// parser needs `EnvironmentTheme` and its CSS size limit.
type EnvironmentThemeColors = Readonly<Record<string, string>>;
export const THEME_CSS_MAX_LENGTH = 20_000;

export type EnvironmentTheme = {
  readonly id: string;
  readonly version?: 1;
  readonly name: string;
  readonly appearance: "light" | "dark";
  readonly canvas?: string;
  readonly accent?: string;
  readonly colors?: EnvironmentThemeColors;
  readonly css?: string;
  readonly variants?: {
    readonly light?: EnvironmentThemeColors;
    readonly dark?: EnvironmentThemeColors;
  };
};
