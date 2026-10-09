import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { paged } from "./chrome-ask.ts";
import type { AskedPage } from "./chrome-ask.ts";
import { bundleOf, THEMES } from "./harness.ts";

type TwinCheck = readonly [name: string, got: unknown, want: unknown];

export async function tabsTwinChecks(): Promise<readonly TwinCheck[]> {
	const page = await openPage();
	try {
		const switched = TwinsSchema.parse(await page.ask(SWITCH_TO_LAST));
		return [...lineChecks(switched), ...defaultChecks(switched)];
	} finally {
		page.close();
	}
}

const HOST = `--font-interface: Helvetica, Arial, sans-serif; --font-ui-smaller: 12px; --font-ui-small: 14px;
	--font-ui-medium: 16px; font-family: var(--font-interface);`;

const READY = `new Promise((done, fail) => {
	const started = Date.now();
	const isDrawn = () => document.querySelectorAll(".wg-kit-seg-thumb:not(.is-arriving)").length === 2;
	const poll = () => (isDrawn() ? done(true) : Date.now() - started > 15000 ? fail(new Error("the tabs twin page never drew")) : setTimeout(poll, 50));
	poll();
})`;

const MEASURE = `(() => {
	const round = (px) => Math.round(px * 100) / 100;
	const measured = (id) => {
		const list = document.querySelector("#" + id + " [role='tablist']");
		const thumb = list.querySelector(".wg-kit-seg-thumb");
		const active = list.querySelector("[aria-selected='true']");
		const listBox = list.getBoundingClientRect();
		const thumbBox = thumb.getBoundingClientRect();
		const activeBox = active.getBoundingClientRect();
		const listStyle = getComputedStyle(list);
		const thumbStyle = getComputedStyle(thumb);
		return {
			list: { background: listStyle.backgroundColor, shadow: listStyle.boxShadow, padding: listStyle.padding, height: round(listBox.height) },
			thumb: { left: round(thumbBox.left - listBox.left), width: round(thumbBox.width), height: round(thumbBox.height), floorGap: round(listBox.bottom - thumbBox.bottom), background: thumbStyle.backgroundColor, transition: thumbStyle.transition },
			active: { left: round(activeBox.left - listBox.left), width: round(activeBox.width), ink: getComputedStyle(active).color },
		};
	};
	return { default: measured("default"), line: measured("line") };
})()`;

const SWITCH_TO_LAST = `(async () => {
	for (const id of ["default", "line"]) [...document.querySelectorAll("#" + id + " [role='tab']")].at(-1).click();
	await new Promise((done) => setTimeout(done, 700));
	return ${MEASURE};
})()`;

const DEFAULT_LIST = {
	background: "color(srgb 0.952333 0.952333 0.952333)",
	shadow: "none",
	padding: "4px",
	height: 46,
};

const HALF_PIXEL = 0.5;

const TwinSchema = z.object({
	list: z.object({ background: z.string(), shadow: z.string(), padding: z.string(), height: z.number() }),
	thumb: z.object({
		left: z.number(),
		width: z.number(),
		height: z.number(),
		floorGap: z.number(),
		background: z.string(),
		transition: z.string(),
	}),
	active: z.object({ left: z.number(), width: z.number(), ink: z.string() }),
});

const TwinsSchema = z.object({ default: TwinSchema, line: TwinSchema });

type Twins = z.infer<typeof TwinsSchema>;

function lineChecks({ default: plain, line }: Twins): TwinCheck[] {
	return [
		[
			"THE LINE TABS' INDICATOR IS A 3PX LINE IN THE ACTIVE TRIGGER'S INK, ON THE LIST'S FLOOR, AS WIDE AS THE ACTIVE TRIGGER AND UNDER IT AFTER A SWITCH",
			{
				height: line.thumb.height,
				floorGap: line.thumb.floorGap,
				isInk: line.thumb.background === line.active.ink,
				isUnder:
					Math.abs(line.thumb.left - line.active.left) < HALF_PIXEL &&
					Math.abs(line.thumb.width - line.active.width) < HALF_PIXEL,
			},
			{ height: 3, floorGap: 0, isInk: true, isUnder: true },
		],
		[
			"THE LINE SLIDES WITH THE DEFAULT THUMB'S OWN SPRING",
			{ isSame: line.thumb.transition === plain.thumb.transition, plain: plain.thumb.transition },
			{
				isSame: true,
				plain: "transform 0.32s cubic-bezier(0.34, 1.42, 0.64, 1), width 0.32s cubic-bezier(0.34, 1.42, 0.64, 1)",
			},
		],
		[
			"THE LINE LIST WEARS NO GREY PILL, ONLY A 1PX GROUP LINE UNDER ALL ITS TRIGGERS",
			{ background: line.list.background, shadow: line.list.shadow },
			{
				background: "rgba(0, 0, 0, 0)",
				shadow: "color(srgb 0.133333 0.133333 0.133333 / 0.07) 0px -1px 0px 0px inset",
			},
		],
	];
}

function defaultChecks({ default: plain }: Twins): TwinCheck[] {
	return [["THE DEFAULT TABS LIST KEEPS ITS GREY PILL, PADDING AND HEIGHT", plain.list, DEFAULT_LIST]];
}

async function openPage(): Promise<AskedPage> {
	const file = path.join(mkdtempSync(path.join(tmpdir(), "wg-tabs-twins-")), "page.html");
	writeFileSync(file, pageHtml(await bundleOf("tools/twins-tabs-page.tsx")));
	const page = await paged(file, "tabs twins paint", { size: [700, 300] });
	await page.ask(READY);
	return page;
}

function pageHtml(script: string): string {
	return `<!doctype html><html><head><meta charset="utf-8">
<style>${readFileSync("apps/obsidian/styles.css", "utf8")}</style>
<style>:root { ${THEMES.light} ${HOST} } body { margin: 0; padding: 20px; }</style>
</head><body class="wg-root theme-light"><div id="host"></div><script>${script}</script></body></html>`;
}
