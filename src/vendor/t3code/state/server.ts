// Local shim for t3code's `apps/web/src/state/server.ts`. The gallery has no
// T3Code server, so it never publishes environment themes.
import type { EnvironmentTheme } from "@t3tools/contracts";
import { Atom } from "effect/reactivity";

const EMPTY_ENVIRONMENT_THEMES: ReadonlyArray<EnvironmentTheme> = [];

export const primaryServerEnvironmentThemesAtom = Atom.make(
  (): ReadonlyArray<EnvironmentTheme> => EMPTY_ENVIRONMENT_THEMES,
).pipe(Atom.withLabel("web-primary-server-environment-themes"));
