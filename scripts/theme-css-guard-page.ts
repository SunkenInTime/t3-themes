// Browser side of check-theme-css.ts, bundled with esbuild and run in
// headless Chromium. Applies theme CSS with T3Code's own guard and returns
// every rule or declaration the guard removed.
import { applyThemeCss } from "../src/vendor/t3code/themeCss.ts";

// Lists every rule and declaration in a sheet, so the lists before and after
// the guard show exactly what it removed.
function listSheet(sheet: CSSStyleSheet): string[] {
  const out: string[] = [];
  const walk = (rules: CSSRuleList, trail: string) => {
    for (const rule of Array.from(rules)) {
      // Bare declarations inside a nested rule have no selector; their cssText
      // holds the declarations, so it would change when one is removed.
      const head =
        rule instanceof CSSStyleRule
          ? rule.selectorText
          : rule instanceof CSSKeyframeRule
            ? rule.keyText
            : rule.constructor.name === "CSSNestedDeclarations"
              ? "(declarations)"
              : rule.cssText.split("{")[0]!.trim();
      const here = trail ? `${trail} › ${head}` : head;
      out.push(here);
      if ("style" in rule && rule.style instanceof CSSStyleDeclaration) {
        for (let i = 0; i < rule.style.length; i++) out.push(`${here} › ${rule.style.item(i)}`);
      }
      if ("cssRules" in rule) walk(rule.cssRules as CSSRuleList, here);
    }
  };
  walk(sheet.cssRules, "");
  return out;
}

function droppedByGuard(css: string): string[] {
  // Parse the baseline in a <style> element, not a constructed sheet: those
  // drop @import without a trace (even an escaped `@\69mport`), and T3Code
  // would then silently lose it. The page blocks all requests, so nothing loads.
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  const before = listSheet(style.sheet!);
  style.remove();
  applyThemeCss(css);
  const guarded = document.adoptedStyleSheets.at(-1);
  const remaining = new Map<string, number>();
  for (const entry of guarded ? listSheet(guarded) : []) {
    remaining.set(entry, (remaining.get(entry) ?? 0) + 1);
  }
  return before.filter((entry) => {
    const left = remaining.get(entry) ?? 0;
    if (left === 0) return true;
    remaining.set(entry, left - 1);
    return false;
  });
}

(globalThis as unknown as { droppedByGuard: typeof droppedByGuard }).droppedByGuard =
  droppedByGuard;
