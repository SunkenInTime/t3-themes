// Lays out theme CSS one declaration per line for the "View CSS" panel on
// theme pages. Display only: what users import is the theme JSON, unchanged.
// postcss does the parsing, so strings, escapes, comments and url() contents
// are handled as CSS defines them; this only rewrites the whitespace between
// nodes and never touches a selector, at-rule prelude or value.
import postcss, { type ChildNode, type Container } from "postcss";

const onlyWhitespace = (raw: unknown) => typeof raw !== "string" || /^[ \t\n\r\f]*$/.test(raw);

function layout(container: Container, depth: number): void {
  const indent = "  ".repeat(depth);
  container.each((node: ChildNode) => {
    node.raws.before = container.type === "root" && node === container.first ? "" : `\n${indent}`;
    if (node.type === "rule" || node.type === "atrule") {
      if (onlyWhitespace(node.raws.between)) node.raws.between = node.type === "rule" ? " " : node.nodes ? " " : "";
      if (node.nodes) {
        layout(node, depth + 1);
        node.raws.after = `\n${indent}`;
        node.raws.semicolon = true;
      }
    }
  });
}

export function formatCss(css: string): string {
  try {
    const root = postcss.parse(css);
    layout(root, 0);
    return `${root.toString()}\n`;
  } catch {
    // Not parseable by postcss: show it exactly as written.
    return css;
  }
}
