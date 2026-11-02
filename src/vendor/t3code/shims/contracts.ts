// Local shim for `@t3tools/contracts`, a private t3code package. Only the
// `EnvironmentTheme` type is needed.
type EnvironmentThemeColors = Readonly<Record<string, string>>;

export type EnvironmentTheme = {
  readonly id: string;
  readonly version?: 1;
  readonly name: string;
  readonly appearance: "light" | "dark";
  readonly canvas?: string;
  readonly accent?: string;
  readonly colors?: EnvironmentThemeColors;
  readonly variants?: {
    readonly light?: EnvironmentThemeColors;
    readonly dark?: EnvironmentThemeColors;
  };
};
