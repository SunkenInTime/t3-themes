import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { useEffect, useRef, useState } from "react";
import type { ThemeCardPreviewColors } from "../vendor/t3code/components/settings/ThemePreviewCircles";
import { ThemeWireframe } from "../vendor/t3code/components/settings/ThemeWireframe";
import { LikeButtonInner, getSharedConvexClient } from "./LikeButton";

// Serialized at build time by index.astro. Color values are `light-dark(...)`
// CSS strings, so cards follow the visitor's system scheme.
export type CardData = {
  id: string;
  label: string;
  byline: string;
  description?: string;
  modes: string;
  shotLight: string | null;
  shotDark: string | null;
  /** Wireframe fallback for themes whose screenshots don't exist yet. */
  panes: Array<{ colors: ThemeCardPreviewColors; clip?: "left" | "right" }>;
  swatches: string[];
  addedAt: number;
};

type Sort = "likes" | "new";

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function queryTokens(value: string): string[] {
  return normalizeSearchText(value).trim().split(/\s+/).filter(Boolean);
}

function matchesSearch(card: CardData, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const searchable = normalizeSearchText(
    [card.label, card.byline, card.description].filter(Boolean).join(" "),
  );
  return tokens.every((token) => searchable.includes(token));
}

function shotClasses(mine: "light" | "dark", hasBoth: boolean): string {
  if (!hasBoth) return "h-full w-full object-cover object-left-top";
  // Show the shot matching the system scheme; hover previews the other mode.
  const base =
    "absolute inset-0 h-full w-full object-cover object-left-top transition-opacity duration-300";
  return mine === "light"
    ? `${base} opacity-100 group-hover:opacity-0 dark:opacity-0 dark:group-hover:opacity-100`
    : `${base} opacity-0 group-hover:opacity-100 dark:opacity-100 dark:group-hover:opacity-0`;
}

function Card({ card, likes, hasConvex }: { card: CardData; likes: number; hasConvex: boolean }) {
  const hasBoth = Boolean(card.shotLight && card.shotDark);
  return (
    <article className="group relative overflow-hidden rounded-xl border border-border/60 bg-card transition-transform duration-200 hover:-translate-y-0.5 hover:border-border">
      <a href={`/themes/${card.id}/`} className="block">
        <span className="relative block aspect-[16/10] overflow-hidden border-b border-border/60">
          {!card.shotLight && !card.shotDark && (
            <ThemeWireframe className="h-full rounded-none border-0" panes={card.panes} />
          )}
          {card.shotLight && (
            <img
              src={card.shotLight}
              alt={`T3Code with the ${card.label} theme`}
              className={shotClasses("light", hasBoth)}
              loading="lazy"
              decoding="async"
            />
          )}
          {card.shotDark && (
            <img
              src={card.shotDark}
              alt={card.shotLight ? "" : `T3Code with the ${card.label} theme`}
              aria-hidden={hasBoth || undefined}
              className={shotClasses("dark", hasBoth)}
              loading="lazy"
              decoding="async"
            />
          )}
        </span>
        <span className="flex items-center justify-between gap-3 px-4 py-3">
          <span className="min-w-0">
            <span className="block truncate font-medium text-ink">{card.label}</span>
            <span className="mt-0.5 block truncate text-sm text-ink-muted">{card.byline}</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="flex gap-1" aria-hidden="true">
              {card.swatches.map((color, index) => (
                <span
                  key={index}
                  className="h-3 w-3 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span className="font-mono text-[11px] text-ink-muted">
              {card.modes}
              {likes > 0 && ` · ♥ ${likes}`}
            </span>
          </span>
        </span>
      </a>
      {hasConvex && (
        <div className="absolute right-3 top-3 z-10">
          <LikeButtonInner themeId={card.id} />
        </div>
      )}
    </article>
  );
}

function Grid({
  themes,
  sort,
  counts,
  hasConvex,
}: {
  themes: CardData[];
  sort: Sort;
  counts: Record<string, number>;
  hasConvex: boolean;
}) {
  const sorted = [...themes].sort((a, b) =>
    sort === "likes"
      ? (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || b.addedAt - a.addedAt
      : b.addedAt - a.addedAt,
  );
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((card) => (
        <Card key={card.id} card={card} likes={counts[card.id] ?? 0} hasConvex={hasConvex} />
      ))}
    </div>
  );
}

function GridWithLikes({ themes, sort }: { themes: CardData[]; sort: Sort }) {
  const counts = (useQuery(anyApi.likes.counts, {}) ?? {}) as Record<string, number>;
  return <Grid themes={themes} sort={sort} counts={counts} hasConvex />;
}

export default function CommunityGrid({ themes }: { themes: CardData[] }) {
  const [sort, setSort] = useState<Sort>("likes");
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const client = mounted ? getSharedConvexClient() : null;
  const tokens = queryTokens(query);
  const filteredThemes = themes.filter((card) => matchesSearch(card, tokens));
  const hasSearchQuery = query.trim().length > 0;

  const sortOptions: Array<{ key: Sort; label: string }> = [
    { key: "likes", label: "Most liked" },
    { key: "new", label: "Newest" },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="shrink-0 font-mono text-xs uppercase tracking-widest text-ink-muted">
          Community themes
        </h2>
        <div className="order-3 basis-full sm:order-none sm:min-w-0 sm:basis-0 sm:flex-1">
          <label htmlFor="theme-search" className="sr-only">
            Search community themes
          </label>
          <div className="relative">
            <input
              ref={searchInputRef}
              id="theme-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search themes"
              autoComplete="off"
              className="h-[30px] w-full rounded-full border border-border/60 bg-transparent px-3 pr-10 font-mono text-xs text-ink placeholder:text-ink-muted/70 [appearance:textfield] focus:border-border [&::-webkit-search-cancel-button]:appearance-none"
            />
            {hasSearchQuery && (
              <button
                type="button"
                aria-label="Clear theme search"
                onClick={() => {
                  setQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
              >
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>
        </div>
        <div
          className="flex shrink-0 rounded-full border border-border/60 p-0.5 font-mono text-xs"
          role="group"
          aria-label="Sort themes"
        >
          {sortOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={sort === option.key}
              onClick={() => setSort(option.key)}
              className={`rounded-full px-3 py-1 transition-colors ${
                sort === option.key
                  ? "bg-accent text-accent-foreground"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {filteredThemes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-ink-muted">
          No themes match <span className="text-ink">“{query.trim()}”</span>.
        </p>
      ) : client ? (
        <ConvexAuthProvider client={client}>
          <GridWithLikes themes={filteredThemes} sort={sort} />
        </ConvexAuthProvider>
      ) : (
        <Grid themes={filteredThemes} sort={sort} counts={{}} hasConvex={false} />
      )}
    </div>
  );
}
