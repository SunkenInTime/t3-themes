import { useState } from "react";

export default function CopyJsonButton({ json }: { json: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(json).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
    >
      {copied ? "Copied ✓" : "Copy theme JSON"}
    </button>
  );
}
