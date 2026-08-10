import { useEffect, useState } from "react";
import type { ThemeDefinition } from "../vendor/t3code/themePalette";

// Live preview inside the real T3Code UI: the demo bundle (see
// scripts/sync-demo.sh) is the actual web app running against an in-browser
// mock server. Because it's served from our origin, it shares localStorage —
// we install the theme under T3Code's own keys and the app picks it up at
// boot; useTheme also reacts to cross-document storage events, so a running
// iframe restyles without a reload.
const DEMO_URL = "/sidebar-demo/demo.html";
const THEMES_KEY = "t3code:themes:v1";
const ACTIVE_THEME_KEY = "t3code:theme";
const FOLLOW_SYSTEM_KEY = "t3code:theme-follow-system";

function installTheme(definition: ThemeDefinition, official: boolean): void {
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
}

export default function LivePreview({
  definition,
  official,
}: {
  definition: ThemeDefinition;
  official: boolean;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch(DEMO_URL, { method: "HEAD" })
      .then((response) => setAvailable(response.ok))
      .catch(() => setAvailable(false));
  }, []);

  // Keep a running iframe in sync if the visitor navigates between themes.
  useEffect(() => {
    if (open) installTheme(definition, official);
  }, [open, definition, official]);

  if (available !== true) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-ink-muted">
        Live preview
      </h2>
      {open ? (
        <iframe
          src={DEMO_URL}
          title={`T3Code demo with the ${definition.label} theme`}
          className="h-[42rem] w-full rounded-xl border border-border/60 bg-surface"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            installTheme(definition, official);
            setOpen(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-surface py-16 text-ink-muted transition-colors hover:border-border hover:text-ink"
        >
          <span aria-hidden>▶</span>
          <span>
            Try <span className="font-medium">{definition.label}</span> in the real T3Code
            interface
          </span>
        </button>
      )}
      <p className="mt-2 text-xs text-ink-muted">
        This is T3Code's actual web UI running on demo data — explore it; nothing you do here
        leaves your browser.
      </p>
    </section>
  );
}
