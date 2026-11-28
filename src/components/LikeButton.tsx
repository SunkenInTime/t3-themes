import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { useCallback, useEffect, useState } from "react";

// The gallery is fully static except likes; these islands talk to Convex
// directly. Liking requires GitHub sign-in (one like per theme per account);
// counts are readable anonymously. When PUBLIC_CONVEX_URL is unset the
// buttons render nothing.
const convexUrl = import.meta.env.PUBLIC_CONVEX_URL as string | undefined;
let sharedClient: ConvexReactClient | null = null;

export function getSharedConvexClient(): ConvexReactClient | null {
  if (!convexUrl) return null;
  sharedClient ??= new ConvexReactClient(convexUrl);
  return sharedClient;
}

export const hasConvex = Boolean(convexUrl);

/** Presentational like toggle. `onToggle` is null until Convex is ready; the
 * button still renders (inert) so it doesn't pop in after hydration. */
export function LikeToggle({
  count,
  liked,
  isAuthenticated,
  onToggle,
}: {
  count: number | undefined;
  liked: boolean;
  isAuthenticated: boolean;
  onToggle: (() => void) | null;
}) {
  return (
    <button
      type="button"
      aria-pressed={liked === true}
      aria-disabled={onToggle === null || undefined}
      title={isAuthenticated ? (liked ? "Unlike" : "Like") : "Sign in with GitHub to like"}
      onClick={() => onToggle?.()}
      className={`flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-raised px-2.5 py-1 text-xs transition-colors hover:border-border ${
        liked ? "text-accent" : "text-ink-muted"
      }`}
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span>{count ?? "–"}</span>
    </button>
  );
}

/** Like actions for use inside a ConvexAuthProvider. */
export type LikeActions = {
  isAuthenticated: boolean;
  toggleLike: (themeId: string) => void;
};

export function useLikeActions(): LikeActions {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const toggle = useMutation(anyApi.likes.toggle);
  const toggleLike = useCallback(
    (themeId: string) => {
      // The session is still being restored; don't send a signed-in visitor
      // to GitHub sign-in.
      if (isLoading) return;
      if (isAuthenticated) {
        void toggle({ themeId });
      } else {
        void signIn("github", { redirectTo: window.location.pathname });
      }
    },
    [isLoading, isAuthenticated, toggle, signIn],
  );
  return { isAuthenticated, toggleLike };
}

function LikeButtonWithState({ themeId }: { themeId: string }) {
  const state = useQuery(anyApi.likes.state, {}) as
    | { counts: Record<string, number>; likedThemeIds: string[] }
    | undefined;
  const { isAuthenticated, toggleLike } = useLikeActions();

  return (
    <LikeToggle
      count={state?.counts[themeId]}
      liked={state?.likedThemeIds.includes(themeId) ?? false}
      isAuthenticated={isAuthenticated}
      onToggle={() => toggleLike(themeId)}
    />
  );
}

export default function LikeButton({ themeId }: { themeId: string }) {
  // Convex client + auth state are browser-only; render nothing during
  // Astro's static prerender and mount on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const client = getSharedConvexClient();
  if (!client) return null;
  return (
    <ConvexAuthProvider client={client}>
      <LikeButtonWithState themeId={themeId} />
    </ConvexAuthProvider>
  );
}
