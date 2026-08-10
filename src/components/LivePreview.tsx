import { useEffect, useState } from "react";
import {
  getThemeModes,
  type ThemeAppearance,
  type ThemeDefinition,
} from "../vendor/t3code/themePalette";

// Live preview inside the real T3Code UI: the demo bundle (see
// scripts/sync-demo.sh) is the actual web app running against an in-browser
// mock server. Because it's served from our origin, it shares localStorage —
// we install the theme under T3Code's own keys and the app picks it up at
// boot; it also reacts to cross-document storage events, so the mode switch
// restyles the running iframe without a reload.
const DEMO_URL = "/sidebar-demo/demo.html";
const THEMES_KEY = "t3code:themes:v1";
const ACTIVE_THEME_KEY = "t3code:theme";
const FOLLOW_SYSTEM_KEY = "t3code:theme-follow-system";
const APPEARANCE_MODE_KEY = "t3code:theme-appearance-mode";

function installTheme(definition: ThemeDefinition, official: boolean, mode: ThemeAppearance): void {
  if (!official) {
    let themes: ThemeDefinition[] = [];
    try {
      const raw = window.localStorage.getItem(THEMES_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) themes = parsed as ThemeDefinition[];
    } catch {
      // Corrupt storage: start over with just this theme.
    }
    themes = themes.filter((theme) => theme?.id !== definition.id);
    themes.push(definition);
    window.localStorage.setItem(THEMES_KEY, JSON.stringify(themes));
  }
  window.localStorage.setItem(ACTIVE_THEME_KEY, definition.id);
  window.localStorage.setItem(FOLLOW_SYSTEM_KEY, "false");
  window.localStorage.setItem(APPEARANCE_MODE_KEY, mode);
}

export default function LivePreview({
  definition,
  official,
}: {
  definition: ThemeDefinition;
  official: boolean;
}) {
  const modes = getThemeModes(definition);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<ThemeAppearance>(definition.appearance);

  // Auto-open: install the theme, then mount the iframe (the app reads the
  // injected localStorage at boot, so order matters). The preview starts in
  // the mode matching the site's scheme when the theme ships it.
  useEffect(() => {
    let cancelled = false;
    fetch(DEMO_URL, { method: "HEAD" })
      .then((response) => {
        if (!response.ok || cancelled) return;
        const site = document.documentElement.dataset.theme as ThemeAppearance | undefined;
        const initial = site && modes.includes(site) ? site : definition.appearance;
        setMode(initial);
        installTheme(definition, official, initial);
        setReady(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [definition, official]);

  const switchMode = (next: ThemeAppearance) => {
    setMode(next);
    try {
      // The iframe's useTheme listens for this storage event and re-resolves
      // the palette live — no reload.
      window.localStorage.setItem(APPEARANCE_MODE_KEY, next);
    } catch {}
  };

  if (!ready) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="font-mono text-xs uppercase tracking-widest text-ink-muted">
          Live preview
        </h2>
        {modes.length > 1 && (
          <div
            className="flex rounded-full border border-border/60 p-0.5 font-mono text-xs"
            role="group"
            aria-label="Preview mode"
          >
            {modes.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => switchMode(option)}
                className={`rounded-full px-3 py-1 transition-colors ${
                  mode === option
                    ? "bg-accent text-accent-foreground"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
      <iframe
        src={DEMO_URL}
        title={`T3Code demo with the ${definition.label} theme`}
        loading="lazy"
        className="h-[42rem] w-full rounded-xl border border-border/60 bg-card"
      />
      <p className="mt-2 font-mono text-xs text-ink-muted">
        T3Code's actual web UI on demo data — explore it; nothing you do here leaves your
        browser.
      </p>
    </section>
  );
}
