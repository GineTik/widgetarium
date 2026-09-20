// ONE FILE TO HAND A DESIGNER — or Claude Desktop, which is the same thing. styles.css is 2326
// lines and most of it is layout for surfaces nobody is redesigning; this pulls out the part a
// design decision actually needs: the tokens, the component classes, and the laws that explain
// why the tokens are shaped the way they are.
import { readFileSync, writeFileSync } from "node:fs";

const css = readFileSync("styles.css", "utf8");

// the token block: everything declared on the root, comments and all, because the comments carry
// the measurements that make a value non-negotiable
const tokens = /\.wg-root\s*\{([\s\S]*?)\n\}/.exec(css);
const kitRules = [
	...css.matchAll(/(\/\*[\s\S]*?\*\/\s*)?:is\(\.wg-root, \.wg-portal\) (\.wg-kit-[^{]*)\{([^}]*)\}/g),
].map((rule) => `${(rule[1] ?? "").trim()}\n.${rule[2].trim().slice(1)} {${rule[3]}}`.trim());

const LAWS = `# Widgetarium design system

A brief, not the source. \`styles.css\` and \`src/kit.js\` are the source; this is what a design
decision needs to be right.

## The laws, each one measured

1. **Fill, never outline.** A surface is told apart by its fill. The one exception is arithmetic:
   on a light theme nothing is lighter than white, so a card on a container separates by
   \`--wg-kit-card-edge\` instead. A window's own border is the other exception — it has to end
   somewhere a person can see.

2. **Every surface steps clear of the one under it.** Measured, in both themes:

   | surface | light | step |
   |---|---|---|
   | page | 255 | — |
   | grid | 252.3 | 2.7 |
   | container on the page | 242.8 | 12.2 |
   | a card in it | 255 + edge | 12.2 |
   | a plate inside a dialog | 247.3 | its own role |
   | hover | 231.8 | 11 |

   Two rules hold this together: hover must clear rest by **5 percentage points** or it vanishes
   on a dim panel, and the grid must stay under a **third** of the container's step or controls
   sink into it. A surface on the page and a surface inside a dialog are DIFFERENT ROLES — one
   token for both means neither can be tuned.

3. **Fills and radii live on \`::before\`**, because the host styles a bare \`button\` with a
   resting box-shadow and a focus ring that would otherwise win.

4. **No uppercase anywhere.** Not in captions, not in eyebrows, not on chips.

5. **A tick marks a choice, and the kit draws it** — never the caller, or two lists disagree.

6. **Glass is for reading, not for looking through.** A panel somebody reads takes
   \`--wg-kit-glass-panel\` (0.94) and 40px of blur. \`--wg-kit-glass-tint\` (0.82) is for small
   floating chrome only.

## Tokens

\`\`\`css
.wg-root {${tokens ? tokens[1] : ""}
}
\`\`\`

## Components

Class names are the contract; \`src/kit.js\` exports a component per class.

\`\`\`css
${kitRules.join("\n\n")}
\`\`\`
`;

writeFileSync("docs/design-system.md", LAWS);
console.log(`docs/design-system.md — ${LAWS.split("\n").length} lines, ${kitRules.length} component rules`);
