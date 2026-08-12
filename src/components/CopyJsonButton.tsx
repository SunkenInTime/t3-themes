import { useEffect, useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";

export default function CopyJsonButton({ json }: { json: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timeout = window.setTimeout(() => setStatus("idle"), 2000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const copyTheme = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(json);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  const label =
    status === "copied"
      ? "Copied ✓"
      : status === "failed"
        ? "Copy failed — try again"
        : "Copy theme JSON";
  const announcement =
    status === "copied"
      ? "Theme JSON copied to the clipboard."
      : status === "failed"
        ? "Could not copy the theme JSON. Please try again."
        : "";

  return (
    <>
      <button
        type="button"
        onClick={() => void copyTheme()}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
      >
        {label}
      </button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}
