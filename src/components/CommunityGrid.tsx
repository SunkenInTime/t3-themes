import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { type ConvexReactClient, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ThemeCardPreviewColors } from "../vendor/t3code/components/settings/ThemePreviewCircles";
import { ThemeWireframe } from "../vendor/t3code/components/settings/ThemeWireframe";
import {
  type LikeActions,
  LikeToggle,
  getSharedConvexClient,
  hasConvex,
  useLikeActions,
} from "./LikeButton";

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
  /** Wireframe stand-in, only sent when there are no screenshots. */
  panes: Array<{ colors: ThemeCardPreviewColors; clip?: "left" | "right" }> | null;
  /** canvas, sidebar, surface, accent, messageAction */
  swatches: string[];
  addedAt: number;
};

type Sort = "likes" | "new";
type LikesState = { counts: Record<string, number>; likedThemeIds: string[] };

// The last live likes state. Astro's client-side navigation keeps this module
// loaded, so going back to the gallery starts in the order the visitor last
// saw instead of reshuffling when Convex answers.
let lastLiveLikes: LikesState | null = null;

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
  // Show the shot matching the system scheme; hover previews the other mode.
  const base = "absolute inset-0 h-full w-full object-cover object-left-top";
  if (!hasBoth) return base;
  const withTransition = `${base} transition-opacity duration-300`;
  return mine === "light"
    ? `${withTransition} opacity-100 group-hover:opacity-0 dark:opacity-0 dark:group-hover:opacity-100`
    : `${withTransition} opacity-0 group-hover:opacity-100 dark:opacity-100 dark:group-hover:opacity-0`;
}

/** Theme-colored stand-in shown while a card's screenshot loads. */
function ShotSkeleton({ card, loaded }: { card: CardData; loaded: boolean }) {
  const [canvas, sidebar] = card.swatches;
  return (
    <span className="absolute inset-0" style={{ backgroundColor: canvas }} aria-hidden="true">
      <span className="absolute inset-y-0 left-0 w-[17%]" style={{ backgroundColor: sidebar }} />
      {!loaded && <span className="absolute inset-0 animate-pulse bg-[rgb(127_127_127/0.12)]" />}
    </span>
  );
}

function Card({
  card,
  eager,
  likes,
  liked,
  actions,
}: {
  card: CardData;
  eager: boolean;
  likes: number | undefined;
  liked: boolean;
  actions: LikeActions | null;
}) {
  const hasBoth = Boolean(card.shotLight && card.shotDark);
  const [loaded, setLoaded] = useState(false);
  // A cached image can finish loading before hydration attaches onLoad.
  const checkLoaded = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);
  const imgProps: ComponentProps<"img"> = {
    loading: eager ? "eager" : "lazy",
    decoding: "async",
    width: 960,
    height: 600,
    onLoad: () => setLoaded(true),
    // A broken image stops the pulse; the theme-colored stand-in stays.
    onError: () => setLoaded(true),
    ref: checkLoaded,
  };
  return (
    <article className="group relative overflow-hidden rounded-xl border border-border/60 bg-card transition-transform duration-200 hover:-translate-y-0.5 hover:border-border">
      <a href={`/themes/${card.id}/`} data-astro-prefetch="hover" className="block">
        <span className="relative block aspect-[16/10] overflow-hidden border-b border-border/60">
          {card.panes ? (
            <span className="absolute inset-0">
              <ThemeWireframe className="h-full rounded-none border-0" panes={card.panes} />
            </span>
          ) : (
            <ShotSkeleton card={card} loaded={loaded} />
          )}
          {card.shotLight && (
            <img
              src={card.shotLight}
              alt={`T3Code with the ${card.label} theme`}
              className={shotClasses("light", hasBoth)}
              {...imgProps}
            />
          )}
          {card.shotDark && (
            <img
              src={card.shotDark}
              alt={card.shotLight ? "" : `T3Code with the ${card.label} theme`}
              aria-hidden={hasBoth || undefined}
              className={shotClasses("dark", hasBoth)}
              {...imgProps}
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
              {likes !== undefined && likes > 0 && ` · ♥ ${likes}`}
            </span>
          </span>
        </span>
      </a>
      {hasConvex && (
        <div className="absolute right-3 top-3 z-10">
          <LikeToggle
            count={likes}
            liked={liked}
            isAuthenticated={actions?.isAuthenticated ?? false}
            onToggle={actions ? () => actions.toggleLike(card.id) : null}
          />
        </div>
      )}
    </article>
  );
}

/** Lives inside the Convex provider and lifts live likes state up, so the
 * grid keeps one stable tree and never remounts its cards (or images). */
function LikesBridge({
  onState,
  onActions,
}: {
  onState: (state: LikesState) => void;
  onActions: (actions: LikeActions) => void;
}) {
  const state = useQuery(anyApi.likes.state, {}) as LikesState | undefined;
  const { isAuthenticated, toggleLike } = useLikeActions();
  useEffect(() => {
    if (state) onState(state);
  }, [state, onState]);
  useEffect(() => {
    onActions({ isAuthenticated, toggleLike });
  }, [isAuthenticated, toggleLike, onActions]);
  return null;
}

// Roughly the first screenful (3 columns × 2 rows on desktop).
const EAGER_CARDS = 6;

export default function CommunityGrid({
  themes,
  initialCounts,
}: {
  themes: CardData[];
  /** Like counts fetched at build time; the static HTML is sorted by these. */
  initialCounts: Record<string, number>;
}) {
  const [sort, setSort] = useState<Sort>("likes");
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  // The first render must match the static HTML (build-time counts) to
  // hydrate cleanly; the last live counts are applied before the first paint.
  const [likes, setLikes] = useState<LikesState>({ counts: initialCounts, likedThemeIds: [] });
  const [actions, setActions] = useState<LikeActions | null>(null);
  const [client, setClient] = useState<ConvexReactClient | null>(null);

  useLayoutEffect(() => {
    if (lastLiveLikes) setLikes(lastLiveLikes);
    setClient(getSharedConvexClient());
  }, []);

  const onLiveState = useCallback((state: LikesState) => {
    lastLiveLikes = state;
    setLikes(state);
  }, []);

  const tokens = queryTokens(query);
  const hasSearchQuery = query.trim().length > 0;
  const { counts } = likes;
  const likedThemeIds = new Set(likes.likedThemeIds);
  const sorted = themes
    .filter((card) => matchesSearch(card, tokens))
    .sort((a, b) =>
      sort === "likes"
        ? (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || b.addedAt - a.addedAt
        : b.addedAt - a.addedAt,
    );

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
      {client && (
        <ConvexAuthProvider client={client}>
          <LikesBridge onState={onLiveState} onActions={setActions} />
        </ConvexAuthProvider>
      )}
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-ink-muted">
          No themes match <span className="text-ink">“{query.trim()}”</span>.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((card, index) => (
            <Card
              key={card.id}
              card={card}
              eager={index < EAGER_CARDS}
              likes={counts[card.id]}
              liked={likedThemeIds.has(card.id)}
              actions={actions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
