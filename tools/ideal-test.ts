import { readFileSync } from "node:fs";
import { widgetModuleSources } from "./run-widget-source.ts";

const ref = readFileSync("docs/reference/orbitask-converted.html", "utf8");
const dialogRef = readFileSync("docs/reference/task-dialog.html", "utf8");
const widgetSourceAt = (folder: string): string => Object.values(widgetModuleSources(folder)).join("\n");
const WIDGETS_THE_ORBITASK_DESIGN_COVERS = ["archived-columns", "kanban-board", "task-card", "view-tabs"];
const ours =
	readFileSync("apps/obsidian/styles.css", "utf8") +
	readFileSync("registry/@default/tokens.css", "utf8") +
	WIDGETS_THE_ORBITASK_DESIGN_COVERS.map((n) => widgetSourceAt(`registry/@default/${n}`)).join("\n");

const decl = (css: string, selector: string, prop: string): string | null => {
	const rules = [...css.matchAll(new RegExp(`([^{}]*)\\${selector}\\s*\\{([^}]*)\\}`, "g"))];
	if (rules.length === 0) return null;
	const base = rules.reduce((fewest, rule) =>
		((rule[1] ?? "").match(/\./g) ?? []).length < ((fewest[1] ?? "").match(/\./g) ?? []).length ? rule : fewest,
	);
	const m = (base[2] ?? "").match(new RegExp(`(?:^|;|\\n)\\s*${prop}\\s*:\\s*([^;}]+)`));
	return m ? (m[1] ?? "").trim() : null;
};
const px = (css: string, sel: string, prop: string): string | null => {
	const raw = decl(css, sel, prop);
	if (!raw) return null;
	const named: Readonly<Record<string, string>> = {
		"var(--size-4-2)": "8px",
		"var(--size-4-3)": "12px",
		"var(--size-4-4)": "16px",
		"var(--size-4-5)": "20px",
		"var(--size-2-3)": "6px",
		"var(--wg-radius-pill)": "999px",
	};
	const bare = raw.replace(/var\((--[\w-]+),[^)]*\)/g, "var($1)");
	return named[bare] ?? bare;
};

let bad = 0;
const same = (what: string, a: unknown, b: unknown): void => {
	const ok = a !== null && a === b;
	if (!ok) bad += 1;
	console.log(`${ok ? "OK " : "!! "} ${what.padEnd(46)} ideal ${String(b).padEnd(12)} ours ${a}`);
};

const withoutComments = ours.replace(/\/\*[\s\S]*?\*\//g, "");

const splitSelectors = (list: string): string[] => {
	const parts: string[] = [];
	let depth = 0;
	let current = "";
	for (const character of list) {
		if (character === "(") depth += 1;
		if (character === ")") depth -= 1;
		if (character === "," && depth === 0) {
			parts.push(current);
			current = "";
			continue;
		}
		current += character;
	}
	parts.push(current);
	return parts.map((part) => part.trim().replace(/\s+/g, " ")).filter(Boolean);
};

const backgroundsOf = (needle: string): string[] => {
	const found: string[] = [];
	for (const block of withoutComments.split("}")) {
		const brace = block.indexOf("{");
		if (brace < 0) continue;
		if (!splitSelectors(block.slice(0, brace)).some((selector) => selector.endsWith(needle))) continue;
		const body = block.slice(brace + 1);
		const declared = body.match(/(?:^|;|\n)\s*background\s*:\s*([^;}]+)/);
		if (!declared) continue;
		const named = /^var\((--[\w-]+)\)$/.exec((declared[1] ?? "").trim())?.[1];
		const own = named && body.match(new RegExp(`(?:^|;|\n)\\s*${named}\\s*:\\s*([^;}]+)`));
		found.push(((own ? own[1] : declared[1]) ?? "").trim());
	}
	return found;
};

console.log("— the shapes the ideal declares, against what we ship —\n");
same("capsule button height", px(ours, ".wg-kit-btn.is-m", "height"), px(ref, ".btn-m", "height"));
same("capsule button padding", px(ours, ".wg-kit-btn.is-m", "padding"), px(ref, ".btn-m", "padding"));
same("small button height", px(ours, ".wg-kit-btn.is-s", "height"), px(ref, ".btn-s", "height"));
same("icon button, medium", px(ours, ".wg-kit-icon.is-m", "width"), px(ref, ".iconbtn-m", "width"));
same("segmented padding", px(ours, ".wg-kit-seg", "padding"), px(ref, ".segmented", "padding"));
same("segmented tab height", px(ours, ".wg-kit-seg button", "height"), px(ref, ".segmented button", "height"));
same("thumb inset from the top", px(ours, ".wg-kit-seg-thumb", "top"), px(ref, ".seg-thumb", "top"));
same("field height", px(ours, ".wg-kit-field", "height"), px(ref, ".search", "height"));
same("field padding", px(ours, ".wg-kit-field", "padding"), px(ref, ".search", "padding"));
same("field gap", px(ours, ".wg-kit-field", "gap"), px(ref, ".search", "gap"));
same("pill padding", px(ours, ".wg-kit-pill", "padding"), px(ref, ".pilltag", "padding"));

console.log("\n— the tokens —");
const tok = (css: string, name: string): string | null =>
	(css.match(new RegExp(`\\n\\s*${name}:\\s*([^;]+);`)) ?? [])[1]?.trim() ?? null;
same("plate radius", tok(ours, "--wg-kit-plate"), "14px");
same("plate padding (tight)", tok(ours, "--wg-kit-plate-pad"), "8px");
const relational = (name: string, toward: string): number => {
	const value = tok(ours, name) ?? "";
	const mixed = value.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*var\(--background-primary\)\)$/);
	same(`${name} is ${toward} into the surface`, mixed?.[1] ?? value, toward);
	same(`${name} names no ramp step`, /--color-base-\d/.test(value) ? value : 0, 0);
	return mixed ? Number(mixed[2]) : 0;
};
const restPercent = relational("--wg-kit-fill", "var(--text-normal)");
const hoverPercent = relational("--wg-kit-fill-hover", "var(--text-normal)");
const raisePercent = relational("--wg-kit-raise", "#ffffff");

same("hover travels further toward the ink than rest", hoverPercent > restPercent, true);
same("and by a step that can be seen", hoverPercent - restPercent >= 5, true);
same("the raise actually lifts", raisePercent > 0, true);

for (const needle of [
	".wg-kit-card",
	".wg-kit-seg-thumb",
	".wg-kit-count",
	".wg-kit-switch::after",
	".wg-kit-row .wg-kit-btn::before",
	".wg-kit-row .wg-kit-icon::before",
]) {
	same(`${needle} takes the raise`, backgroundsOf(needle).join(" | ") || "nothing", "var(--wg-kit-raise)");
}

{
	const loose = ours.split("\n").filter((line) => /^\.wg-kit-[^{]*\{/.test(line));
	same("no kit rule is left at one-class specificity", loose.length, 0);
}

console.log("\n— things the ideal has that we must not have lost —");
const MUST_KEEP: readonly (readonly [string, string])[] = [
	["the 28px avatar", "28px"],
	["its -8px overlap", "-8px"],
	["the 6px progress bar", "6px"],
	["the 32px stripe", "32px"],
];
for (const [what, needle] of MUST_KEEP) {
	const ok = ours.includes(needle);
	if (!ok) bad += 1;
	console.log(`${ok ? "OK " : "!! "} ${what}`);
}
{
	const painted = [
		".wg-kit-btn",
		".wg-kit-icon",
		".wg-kit-pop-item",
		".wg-kit-seg button",
		".wg-kit-switch",
		".wg-kit-row",
		".wg-kit-cal-day",
	];
	const offenders: string[] = [];
	for (const [index, line] of ours.split("\n").entries()) {
		if (!/\bbackground\s*:/.test(line) || /::before/.test(line)) continue;
		const selector = line.split("{")[0] ?? "";
		if (painted.some((name) => selector.includes(name))) offenders.push(`styles.css:${index + 1} ${selector.trim()}`);
	}
	same("no kit control paints its own background", offenders.join(" | ") || 0, 0);
}

{
	const weigh = (selector: string): number => {
		const bare = selector
			.replace(/:where\([^)]*\)/g, "")
			.replace(/:is\(([^)]*)\)/g, (_: string, inner: string) => String(inner.split(",")[0]));
		const ids = (bare.match(/#[\w-]+/g) ?? []).length;
		const classes = (bare.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[a-z-]+\(?/g) ?? []).length;
		const tags = (bare.match(/(^|[\s>+~])[a-z]+/g) ?? []).length;
		return ids * 100 + classes * 10 + tags;
	};

	const rulesSetting = (needle: string, property: string): string[] => {
		const found: string[] = [];
		for (const block of withoutComments.split("}")) {
			const brace = block.indexOf("{");
			if (brace < 0) continue;
			if (!new RegExp(`(^|;|\\n)\\s*${property}\\s*:`).test(block.slice(brace + 1))) continue;
			for (const selector of splitSelectors(block.slice(0, brace))) {
				if (selector.includes(needle) && !selector.includes("::")) found.push(selector);
			}
		}
		return found;
	};

	const beats = (winner: string, loser: string, property: string): void => {
		const top = Math.max(0, ...rulesSetting(winner, property).map(weigh));
		const bottom = Math.max(0, ...rulesSetting(loser, property).map(weigh));
		same(`${winner} outranks ${loser} on ${property}`, top > bottom, true);
	};

	beats(".wg-dialog-close", ".wg-kit-icon", "position");
	beats(".is-picked", ".is-today", "color");
}

console.log("\n— docs/reference/task-dialog.html, the parts the dialog is built from —");
same("progress track height", px(ours, ".wg-kit-progress-track", "height"), px(dialogRef, ".pbar", "height"));
same("knob at rest", px(ours, ".wg-kit-progress-knob", "width"), px(dialogRef, ".pbar .knob", "width"));
same(
	"knob while it is held",
	px(ours, ".wg-kit-progress.is-grabbed .wg-kit-progress-knob", "width"),
	px(dialogRef, ".pbar .knob.grabbed", "width"),
);
same("calendar day cell", px(ours, ".wg-kit-cal-day", "height"), px(dialogRef, ".cal-grid button", "height"));
same("the raw text's line height", px(ours, ".wg-kit-md-text", "line-height"), px(dialogRef, ".raw", "line-height"));
same(
	"and its wrapping, which is what the mirror must match",
	px(ours, ".wg-kit-md-text", "white-space"),
	px(dialogRef, ".raw", "white-space"),
);

{
	const floating = [".wg-kit-pop", ".wg-dialog"];
	const offenders: string[] = [];
	for (const block of withoutComments.split("}")) {
		const brace = block.indexOf("{");
		if (brace < 0) continue;
		const selectors = splitSelectors(block.slice(0, brace));
		if (!selectors.some((selector) => floating.some((name) => selector.endsWith(name)))) continue;
		const declared = block.slice(brace + 1).match(/(?:^|;|\n)\s*box-shadow\s*:\s*([^;}]+)/);
		if (declared && !/inset|glass-edge|none/.test(declared[1] ?? ""))
			offenders.push(`${selectors.join(", ")} → ${(declared[1] ?? "").trim()}`);
	}
	same("no floating panel drops a shadow", offenders.join(" | ") || 0, 0);
	same("the popover is separated by its edge", px(ours, ".wg-kit-pop", "box-shadow"), "var(--wg-kit-glass-edge)");
	same("and so is the dialog", px(ours, ".wg-dialog", "box-shadow"), "var(--wg-kit-glass-edge)");
}

console.log(bad ? `\n${bad} deviations from the ideal` : "\nno deviation from the ideal in any measured value");
process.exit(bad ? 1 : 0);
