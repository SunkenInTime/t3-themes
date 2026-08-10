import { ConvexProvider, ConvexReactClient, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { useEffect, useMemo, useState } from "react";

// The gallery is fully static except for likes; this island talks to Convex
// directly. When PUBLIC_CONVEX_URL is unset (e.g. local dev without a
// deployment) the button renders nothing.
const convexUrl = import.meta.env.PUBLIC_CONVEX_URL as string | undefined;
let sharedClient: ConvexReactClient | null = null;

function getConvexClient(): ConvexReactClient | null {
  if (!convexUrl) return null;
  sharedClient ??= new ConvexReactClient(convexUrl);
  return sharedClient;
}

// Anonymous like identity: a random id per browser, not sybil-proof by design.
function getClientId(): string {
  const key = "t3themes:client-id";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(key, id);
  }
  return id;
}

function LikeButtonInner({ themeId }: { themeId: string }) {
  const clientId = useMemo(getClientId, []);
  const count = useQuery(anyApi.likes.count, { themeId }) as number | undefined;
  const liked = useQuery(anyApi.likes.isLiked, { themeId, clientId }) as boolean | undefined;
  const toggle = useMutation(anyApi.likes.toggle);

  return (
    <button
      type="button"
      aria-pressed={liked === true}
      title={liked ? "Unlike" : "Like"}
      onClick={() => void toggle({ themeId, clientId })}
      className={`flex items-center gap-1.5 rounded-full border border-border/60 bg-surface-raised px-2.5 py-1 text-xs transition-colors hover:border-border ${
        liked ? "text-accent" : "text-ink-muted"
      }`}
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span>{count ?? "–"}</span>
    </button>
  );
}

export default function LikeButton({ themeId }: { themeId: string }) {
  // Convex client + localStorage identity are browser-only; render nothing
  // during Astro's static prerender and mount on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const client = getConvexClient();
  if (!client) return null;
  return (
    <ConvexProvider client={client}>
      <LikeButtonInner themeId={themeId} />
    </ConvexProvider>
  );
}
