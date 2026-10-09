import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { paged } from "./chrome-ask.ts";
import { bundleOf, THEMES } from "./harness.ts";

type Twin = readonly [string, unknown, unknown];

const HOST_FONTS = `--font-interface: Helvetica, Arial, sans-serif; --font-ui-smaller: 12px; --font-ui-small: 14px; --font-ui-medium: 16px;`;

const OBSIDIAN_FOCUSED_SEARCH = `input[type='search']:focus, input[type='search']:focus-visible {
	border: 1px solid var(--interactive-accent);
	box-shadow: 0 0 0 2px var(--interactive-accent);
}`;

const READY = `new Promise((done, fail) => {
	const started = Date.now();
	const poll = () => (window.ready === true ? done(true) : Date.now() - started > 15000 ? fail(new Error("the twins page never drew")) : setTimeout(poll, 50));
	poll();
})`;

const PICKED = `const pick = (el, names) => el && Object.fromEntries(names.map((name) => [name, getComputedStyle(el)[name]]));`;

const COMMAND = `(() => {
	${PICKED}
	const FIELD = ["display", "paddingTop", "paddingLeft", "gap", "borderRadius", "backgroundColor", "boxShadow", "outlineStyle"];
	const INPUT = ["paddingTop", "fontSize", "fontWeight", "color", "backgroundColor", "borderTopStyle", "boxShadow", "outlineStyle"];
	const drawn = (root) => {
		const field = root.querySelector(".wg-kit-command-input");
		const input = field.querySelector("input");
		const resting = { tag: field.tagName, height: Math.round(field.getBoundingClientRect().height), field: pick(field, FIELD), input: pick(input, INPUT) };
		input.focus({ focusVisible: true });
		const focused = { field: pick(field, FIELD), input: pick(input, INPUT) };
		input.blur();
		return { resting, focused };
	};
	const TYPE = ["fontSize", "fontWeight"];
	const typeOf = (input) => ({ typed: pick(input, TYPE), placeholder: { ...Object.fromEntries(TYPE.map((name) => [name, getComputedStyle(input, "::placeholder")[name]])), color: getComputedStyle(input, "::placeholder").color } });
	const type = { command: typeOf(document.querySelector("#command input")), field: typeOf(document.getElementById("field-twin")) };
	return { before: drawn(document.getElementById("before")), after: drawn(document.getElementById("command")), type };
})()`;

const ACCORDION = `(() => {
	${PICKED}
	const ROW = ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"];
	const LABEL = ["fontSize", "fontWeight", "color"];
	const accordion = document.getElementById("accordion");
	const rows = document.getElementById("rows");
	const trigger = accordion.querySelector("[data-slot='accordion-trigger']");
	const rowsItem = rows.querySelector(".wg-kit-layout-item");
	const rowOf = (row) => ({ height: Math.round(row.getBoundingClientRect().height), ...pick(row, ROW) });
	const listLabel = document.querySelector("#list .wg-kit-row-label");
	const hoverRules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).flatMap((rule) => rule instanceof CSSStyleRule ? [rule] : [...(rule.cssRules ?? [])])
		.filter((rule) => rule.selectorText?.includes(":hover") && trigger.matches(rule.selectorText.replaceAll(":hover", "")));
	const hoverDecorations = hoverRules.map((rule) => rule.style.textDecorationLine || rule.style.textDecoration).filter((line) => line && line !== "none");
	trigger.focus({ focusVisible: true });
	const focusedDecoration = getComputedStyle(trigger).textDecorationLine;
	trigger.blur();
	const items = [...accordion.querySelectorAll("[data-slot='accordion-item']")];
	const hairlineOf = (el) => [getComputedStyle(el).borderTopWidth, getComputedStyle(el).borderTopColor];
	const rowsItems = [...rows.querySelectorAll(".wg-kit-layout-item")];
	const PLATE = ["backgroundColor", "borderRadius"];
	return {
		decoration: { hoverDecorations, focusedDecoration },
		row: { accordion: rowOf(trigger), rows: rowOf(rowsItem) },
		label: { accordion: pick(trigger.querySelector(".wg-kit-row-label"), LABEL), list: pick(listLabel, LABEL) },
		plate: {
			accordion: { surface: accordion.dataset.surface, platesInside: accordion.querySelectorAll("[data-surface]").length, ...pick(accordion, PLATE), hairlines: items.map(hairlineOf) },
			rows: { surface: rows.dataset.surface, platesInside: rows.querySelectorAll("[data-surface]").length, ...pick(rows, PLATE), hairlines: rowsItems.map(hairlineOf) },
		},
	};
})()`;

function pageHtml(script: string): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>${OBSIDIAN_FOCUSED_SEARCH}</style>
<style>:root { ${THEMES.light} ${HOST_FONTS} } body { margin: 0; padding: 20px; font-family: var(--font-interface); }</style>
</head><body class="wg-root theme-light"><div id="host"></div><script>${script}</script></body></html>`;
}

function commandTwins(seen: unknown): Twin[] {
	return [
		[
			"A FOCUSED CommandInput'S INNER INPUT WEARS NO OUTLINE, AND OBSIDIAN'S search-FOCUS RING AND BORDER, LOADED AFTER OUR SHEET, DO NOT REACH IT",
			readingOf(seen, "after", "focused", "input"),
			{
				paddingTop: "0px",
				fontSize: "14px",
				fontWeight: "400",
				color: "rgb(34, 34, 34)",
				backgroundColor: "rgba(0, 0, 0, 0)",
				borderTopStyle: "none",
				boxShadow: "none",
				outlineStyle: "none",
			},
		],
		[
			"A CommandInput'S TYPED TEXT AND PLACEHOLDER ARE SIZED, WEIGHTED AND COLOURED AS AN Input'S",
			readingOf(seen, "type", "command"),
			readingOf(seen, "type", "field"),
		],
		[
			"THE FOCUSED CommandInput FIELD'S box-shadow IS ff6393f's: CommandMenuInput HAD NO FOCUS RULE ON ITS PILL",
			[
				readingOf(seen, "after", "focused", "field", "boxShadow"),
				readingOf(seen, "before", "focused", "field", "boxShadow"),
			],
			["none", "none"],
		],
		[
			"CommandInput DRAWS AS CommandMenuInput, RESTING AND FOCUSED, PILL AND INPUT",
			readingOf(seen, "after"),
			readingOf(seen, "before"),
		],
	];
}

function accordionTwins(seen: unknown): Twin[] {
	return [
		[
			"AN ACCORDION TRIGGER'S TEXT IS NEVER UNDERLINED: NO :hover RULE DECORATES IT, AND FOCUS LEAVES IT BARE",
			readingOf(seen, "decoration"),
			{ hoverDecorations: [], focusedDecoration: "none" },
		],
		[
			"AN ACCORDION TRIGGER STANDS AS A Rows ITEM: HEIGHT AND PADDING",
			readingOf(seen, "row", "accordion"),
			readingOf(seen, "row", "rows"),
		],
		[
			"AN ACCORDION TRIGGER'S TEXT IS A RowLabel: SIZE, WEIGHT, COLOUR",
			readingOf(seen, "label", "accordion"),
			readingOf(seen, "label", "list"),
		],
		[
			"AN ACCORDION WEARS ONE PLATE WITH THE Rows HAIRLINE BETWEEN ITEMS",
			readingOf(seen, "plate", "accordion"),
			readingOf(seen, "plate", "rows"),
		],
	];
}

export async function commandAccordionTwinChecks(): Promise<readonly (readonly [string, unknown, unknown])[]> {
	const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-twins-")), "twins.html");
	writeFileSync(file, pageHtml(await bundleOf("tools/twins-command-accordion-page.tsx")));
	const page = await paged(file, "command and accordion twins", { size: [400, 1000] });
	try {
		await page.ask(READY);
		const command = await page.ask(COMMAND);
		const accordion = await page.ask(ACCORDION);
		return [...commandTwins(command), ...accordionTwins(accordion)];
	} finally {
		page.close();
	}
}

function readingOf(seen: unknown, ...keys: readonly string[]): unknown {
	return keys.reduce<unknown>((at, key) => (isRecord(at) ? at[key] : undefined), seen);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null;
}
