// Local shim for t3code's `apps/web/src/lib/utils.ts`, which depends on
// private @t3tools packages. Only `cn` is needed by the vendored components.
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
