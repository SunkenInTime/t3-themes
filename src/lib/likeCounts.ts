// Like counts as of the build, so the static gallery HTML is already in
// "most liked" order instead of reshuffling when the live counts arrive.
// The grid swaps in live counts from Convex after hydration.
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const TIMEOUT_MS = 5000;

export async function buildTimeLikeCounts(): Promise<Record<string, number>> {
  const url = import.meta.env.PUBLIC_CONVEX_URL as string | undefined;
  if (!url) return {};
  // Abort the request itself on timeout, so a stalled connection can't keep
  // the build process alive.
  const client = new ConvexHttpClient(url, {
    fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) }),
  });
  try {
    return (await client.query(anyApi.likes.counts, {})) as Record<string, number>;
  } catch (cause) {
    // Display-only data: the page still works, it just reorders on load.
    console.warn(`⚠ could not fetch like counts at build time: ${(cause as Error).message}`);
    return {};
  }
}
