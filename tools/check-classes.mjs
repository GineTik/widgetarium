// A class in the markup with no rule behind it is not a small mistake: the element falls back
// to the host app's own styling, which for an <input> or a <button> inside Obsidian means it
// looks nothing like the design and nothing failed. The Add List panel shipped that way —
// the markup said ok-add-input, the stylesheet said ok-list-name, and neither knew.
import fs from "node:fs";
import path from "node:path";
import { widgetFiles } from "./widget-files.mjs";

const roots = process.argv.slice(2).filter((root) => fs.existsSync(root));
const offences = [];

// classes the engine owns, plus state classes a rule may only ever mention as a suffix
const ENGINE = new Set(["orbi", "wg-widget-root"]);

// CONTEXT: a widget built on the kit carries kit classes, whose rules live in the plugin sheet
for (const [, name] of (fs.existsSync("styles.css") ? fs.readFileSync("styles.css", "utf8") : "").matchAll(
	/\.([a-z][\w-]*)/g,
)) {
	ENGINE.add(name);
}

// CONTEXT: a scope sheet is loaded for every widget under it, exactly as the registry loads it
function scopeSheet(file) {
	const scope = path.dirname(path.dirname(file));
	const sheet = path.join(scope, "tokens.css");
	return fs.existsSync(sheet) ? fs.readFileSync(sheet, "utf8") : "";
}

// TODO: read these from src/engine/widget-build.js once tools can import it as an ES module
const SHEET_FILES = ["widget.css", "styles.css"];

function ownSheets(file) {
	const folder = path.dirname(file);
	return SHEET_FILES.map((name) => path.join(folder, name))
		.filter((sheet) => fs.existsSync(sheet))
		.map((sheet) => fs.readFileSync(sheet, "utf8"))
		.join("\n");
}

for (const root of roots) {
	for (const file of widgetFiles(root)) {
		const text = fs.readFileSync(file, "utf8");
		const styled = new Set();
		for (const [, name] of `${text}\n${scopeSheet(file)}\n${ownSheets(file)}`.matchAll(/\.([a-z][\w-]*)/g))
			styled.add(name);

		const used = new Set();
		// Only LITERAL words count. Everything inside ${...} is JavaScript — variable names,
		// ternaries — and reading those as class names reports the whole file as broken.
		// A state class lives INSIDE the interpolation — `${active ? " is-active" : ""}` — so
		// blanking the whole `${...}` lost it and the gate called a real class dead.
		const literal = (value) => {
			const text = String(value ?? "");
			const outside = text.replace(/\$\{[^}]*\}/g, " ");
			const inside = [...text.matchAll(/\$\{[^}]*\}/g)]
				.flatMap(([chunk]) => [...chunk.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)])
				.map(([, a, b, c]) => a ?? b ?? c ?? "")
				.join(" ");
			return `${outside} ${inside}`.split(/\s+/);
		};

		for (const [, quoted, templated] of text.matchAll(/\bclass(?:Name)?=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
			for (const word of literal(quoted ?? templated)) {
				if (/^[a-z][\w-]*$/.test(word)) used.add(word);
			}
		}

		const quotedAnywhereInAClassNameExpression = new Set();
		for (const [, expression] of text.matchAll(/\bclass(?:Name)?=\{([^}]*)\}/g)) {
			for (const [, a, b, c] of expression.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
				for (const word of (a ?? b ?? c ?? "").split(/\s+/)) {
					if (/^[a-z][\w-]*$/.test(word)) quotedAnywhereInAClassNameExpression.add(word);
				}
			}
		}

		// A state class is assigned through a variable as often as inline — `const state = active
		// ? " is-active" : ""` — and no regex will follow that. Every quoted is-*/has-* token in
		// the file counts as used: this gate is here to catch a MISNAMED element class, not to
		// audit how a flag reaches the attribute.
		for (const [, a, b, c] of text.matchAll(/"([^"]*)"|'([^']*)'|`([^`]*)`/g)) {
			for (const word of (a ?? b ?? c ?? "").split(/\s+/)) {
				if (/^(is|has)-[\w-]+$/.test(word)) used.add(word);
			}
		}

		for (const name of used) {
			if (ENGINE.has(name) || styled.has(name)) continue;
			offences.push(`${file} — class "${name}" is used but no rule mentions it`);
		}

		// ...and the same mistake the other way round. A @container rule aimed at a class the
		// markup does not have is dead: nothing fails, the widget simply never adapts, and the
		// only way to notice is to make a window narrow and look. These blocks are new, so
		// they are the ones most likely to be aimed at a name somebody renamed.
		for (const [, block] of text.matchAll(/@container[^{]*\{([\s\S]*?)\n\}/g)) {
			for (const [, name] of block.matchAll(/\.([a-z][\w-]*)/g)) {
				if (used.has(name) || quotedAnywhereInAClassNameExpression.has(name) || ENGINE.has(name)) continue;
				offences.push(`${file} — @container rule targets ".${name}", which the markup never uses`);
			}
		}
	}
}

if (offences.length > 0) {
	console.error("class gate: every class in the markup needs a rule, or the host app styles it instead");
	for (const line of offences) console.error(`  ${line}`);
	process.exit(1);
}

console.log(`class gate: clean (${roots.length} root${roots.length === 1 ? "" : "s"})`);
