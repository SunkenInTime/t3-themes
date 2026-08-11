import { useMemo, useState } from "react";
import { THEME_PREVIEW_ROLES } from "../vendor/t3code/components/settings/ThemePreviewCircles";
import { ThemeWireframe } from "../vendor/t3code/components/settings/ThemeWireframe";
import {
  getThemeColorsForMode,
  getThemeModes,
  parseThemeFile,
  themeIdFromName,
  type ThemeAppearance,
  type ThemeDefinition,
} from "../vendor/t3code/themePalette";
import LivePreview from "./LivePreview";

const REPO = "SunkenInTime/t3-themes";
const GITHUB_USERNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

type Draft =
  | { stage: "empty" }
  | { stage: "invalid"; error: string }
  | {
      stage: "valid";
      definition: ThemeDefinition;
      id: string;
      fileName: string;
      raw: Record<string, unknown>;
      warnings: string[];
    };

function previewPanes(definition: ThemeDefinition) {
  const modes = getThemeModes(definition);
  const colorsFor = (mode: ThemeAppearance) => {
    const colors = getThemeColorsForMode(definition, mode)!;
    return Object.fromEntries(THEME_PREVIEW_ROLES.map((role) => [role, colors[role]])) as Record<
      (typeof THEME_PREVIEW_ROLES)[number],
      string
    >;
  };
  return modes.length === 2
    ? ([
        { colors: colorsFor("light"), clip: "left" as const },
        { colors: colorsFor("dark"), clip: "right" as const },
      ] as const)
    : ([{ colors: colorsFor(modes[0] ?? definition.appearance) }] as const);
}

export default function SubmitFlow({
  existingIds,
  demoReady,
}: {
  existingIds: string[];
  demoReady: boolean;
}) {
  const [source, setSource] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [copied, setCopied] = useState(false);

  const draft: Draft = useMemo(() => {
    if (!source.trim()) return { stage: "empty" };
    let raw: unknown;
    try {
      raw = JSON.parse(source);
    } catch (cause) {
      return { stage: "invalid", error: `Not valid JSON — ${(cause as Error).message}` };
    }
    let definition: ThemeDefinition;
    try {
      definition = parseThemeFile(raw);
    } catch (cause) {
      return { stage: "invalid", error: (cause as Error).message };
    }
    const record = raw as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : themeIdFromName(definition.label);
    if (existingIds.includes(id)) {
      return {
        stage: "invalid",
        error: `The id "${id}" is already taken by another theme in the gallery — rename yours.`,
      };
    }
    const warnings: string[] = [];
    const colorCount = Object.keys((record.colors as object) ?? {}).length;
    if (colorCount < 12) {
      warnings.push(
        `Only ${colorCount} color role(s) set — everything else falls back to the default pink T3 Chat palette. Check the preview.`,
      );
    }
    if (!record.variants) {
      warnings.push(
        `No ${definition.appearance === "dark" ? "light" : "dark"} variant — that's fine, the theme will be ${definition.appearance}-only.`,
      );
    }
    return { stage: "valid", definition, id, fileName: `themes/${id}.json`, raw: record, warnings };
  }, [source, existingIds]);

  const authorValid = GITHUB_USERNAME.test(author);
  const descriptionValid = description.length <= 200;

  const submission = useMemo(() => {
    if (draft.stage !== "valid" || !authorValid || !descriptionValid) return null;
    const { raw, id } = draft;
    const ordered: Record<string, unknown> = {
      version: 1,
      id,
      name: raw.name,
      appearance: raw.appearance,
      author,
      ...(description.trim() ? { description: description.trim() } : {}),
      colors: raw.colors,
      ...(raw.variants ? { variants: raw.variants } : {}),
    };
    const json = `${JSON.stringify(ordered, null, 2)}\n`;
    const url = `https://github.com/${REPO}/new/main?filename=${encodeURIComponent(
      draft.fileName,
    )}&value=${encodeURIComponent(json)}`;
    return { json, url };
  }, [draft, author, description, authorValid, descriptionValid]);

  const readFile = (file: File | undefined) => {
    if (!file) return;
    void file.text().then(setSource);
  };

  return (
    <div className="mt-8 space-y-8">
      <section>
        <label
          htmlFor="theme-json"
          className="mb-2 block font-mono text-xs uppercase tracking-widest text-ink-muted"
        >
          1 · Paste your theme JSON
        </label>
        <p className="mb-3 text-sm text-ink-muted">
          In T3Code: <span className="text-ink">Settings → Themes</span>, create or pick your
          theme, and copy its JSON. Or drop the exported file here.
        </p>
        <textarea
          id="theme-json"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          onDrop={(event) => {
            event.preventDefault();
            readFile(event.dataTransfer.files[0]);
          }}
          onDragOver={(event) => event.preventDefault()}
          spellCheck={false}
          rows={source ? 10 : 6}
          placeholder='{ "version": 1, "name": "My Theme", "appearance": "dark", "colors": { … } }'
          className="w-full rounded-xl border border-border/60 bg-card p-4 font-mono text-xs text-ink placeholder:text-ink-muted/60 focus:border-border"
        />
        <div className="mt-2 min-h-6 text-sm" aria-live="polite">
          {draft.stage === "invalid" && <p className="text-ink">✗ {draft.error}</p>}
          {draft.stage === "valid" && (
            <p className="text-ink-muted">
              ✓ <span className="text-ink">{draft.definition.label}</span> is valid — it will
              live at <span className="font-mono text-xs">{draft.fileName}</span>
            </p>
          )}
        </div>
        {draft.stage === "valid" &&
          draft.warnings.map((warning) => (
            <p key={warning} className="mt-1 text-sm text-ink-muted">
              ⚠ {warning}
            </p>
          ))}
      </section>

      {draft.stage === "valid" && (
        <>
          <section>
            <h2 className="mb-2 font-mono text-xs uppercase tracking-widest text-ink-muted">
              2 · Preview
            </h2>
            <ThemeWireframe className="aspect-[16/7] max-w-xl" panes={[...previewPanes(draft.definition)]} />
            {demoReady && (
              <LivePreview definition={draft.definition} official={false} />
            )}
          </section>

          <section className="max-w-xl">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
              3 · Credit
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-ink-muted">GitHub username</span>
                <input
                  value={author}
                  onChange={(event) => setAuthor(event.target.value.trim())}
                  placeholder="octocat"
                  className="mt-1 w-full rounded-lg border border-border/60 bg-card px-3 py-2 font-mono text-sm text-ink focus:border-border"
                />
                <span className="mt-1 block text-xs text-ink-muted">
                  Must be the account that opens the pull request — CI checks it, and only
                  this account can edit the theme later.
                </span>
              </label>
              <label className="block text-sm">
                <span className="text-ink-muted">Description (optional, ≤ 200 chars)</span>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="One or two sentences about the theme."
                  className="mt-1 w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-sm text-ink focus:border-border"
                />
                {!descriptionValid && (
                  <span className="mt-1 block text-xs text-ink">
                    ✗ {description.length}/200 characters
                  </span>
                )}
              </label>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-ink-muted">
              4 · Open the pull request
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={submission?.url}
                rel="noopener"
                target="_blank"
                aria-disabled={!submission}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-opacity ${
                  submission
                    ? "bg-accent text-accent-foreground hover:opacity-90"
                    : "pointer-events-none border border-border/60 text-ink-muted"
                }`}
              >
                Open pull request on GitHub
              </a>
              <button
                type="button"
                disabled={!submission}
                onClick={() => {
                  if (!submission) return;
                  void navigator.clipboard.writeText(submission.json).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="rounded-full border border-border/60 px-5 py-2 text-sm text-ink-muted transition-colors hover:border-border hover:text-ink disabled:opacity-50"
              >
                {copied ? "Copied ✓" : "Copy final JSON"}
              </button>
              {!authorValid && (
                <span className="text-sm text-ink-muted">
                  Enter your GitHub username to continue.
                </span>
              )}
            </div>
            <p className="mt-3 max-w-xl text-sm text-ink-muted">
              GitHub opens with the file name and contents already filled in — sign in, click
              <span className="text-ink"> Propose new file</span>, then
              <span className="text-ink"> Create pull request</span>. CI re-checks everything;
              once merged, your theme is photographed in the real app and deployed
              automatically.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
