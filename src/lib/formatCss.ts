// Breaks minified theme CSS into one declaration per line for the "View CSS"
// panel on theme pages. Display only: what users import is the theme JSON,
// unchanged. Strings, comments and anything inside parentheses (data: URLs,
// var() fallbacks) pass through untouched.
export function formatCss(css: string): string {
  let out = "";
  let depth = 0;
  let parens = 0;
  let i = 0;
  const indent = () => "  ".repeat(depth);
  const trimEnd = () => {
    out = out.replace(/[ \t]+$/, "");
  };

  while (i < css.length) {
    const ch = css[i]!;
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const stop = end === -1 ? css.length : end + 2;
      out += css.slice(i, stop);
      if (parens === 0) out += `\n${indent()}`;
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch) j += css[j] === "\\" ? 2 : 1;
      out += css.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (ch === "(") parens++;
    if (ch === ")") parens = Math.max(0, parens - 1);
    if (parens > 0) {
      out += ch;
      i++;
      continue;
    }
    if (ch === "{") {
      trimEnd();
      depth++;
      out += ` {\n${indent()}`;
    } else if (ch === ";") {
      out += `;\n${indent()}`;
    } else if (ch === "}") {
      depth = Math.max(0, depth - 1);
      out = out.replace(/\s+$/, "");
      out += `\n${indent()}}\n${indent()}`;
    } else if (/\s/.test(ch)) {
      // Collapse whitespace; the breaks above replace the original layout.
      if (!/\s$/.test(out) && out.length > 0) out += " ";
    } else {
      out += ch;
    }
    i++;
  }
  return out.replace(/\n[ \t]*\n+/g, "\n").trim() + "\n";
}
